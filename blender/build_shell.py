"""Build the VW T6.1 Mixto SWB interior shell from data/van.json and export it as GLB.

Usage:
  blender -b --factory-startup --python blender/build_shell.py -- --data data/van.json --out public/models/van.glb [--no-bake] [--samples 32]

Geometry is created directly in the van frame (metres): X rearward from the front axle, Y to the right,
Z up from the cargo floor. The glTF exporter converts Blender Z-up to glTF Y-up as (x, z, -y), which is the
mapping src/three/coords.ts uses, so no extra transforms are needed.
"""
import argparse
import json
import sys

import bmesh
import bpy

MM = 0.001
STEP = 100.0  # mm between grid lines; enough vertices for a smooth vertex-colour AO bake
ROW = 16      # subdivisions across floor, roof and end panels


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--no-bake", action="store_true")
    p.add_argument("--samples", type=int, default=32)
    return p.parse_args(argv)


def lerp(a, b, t):
    return a + (b - a) * t


def frange(a, b, step):
    out, v = [], a
    while v < b:
        out.append(v)
        v += step
    return out


def section_at(van, x):
    s = van["sections"]
    if x <= s[0]["x"]:
        return s[0]
    if x >= s[-1]["x"]:
        return s[-1]
    for a, b in zip(s, s[1:]):
        if a["x"] <= x <= b["x"]:
            t = (x - a["x"]) / (b["x"] - a["x"])
            return {k: [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)] for k in ("low", "belt", "roof")}
    raise ValueError(x)


def wall_y(van, x, z, side):
    s = section_at(van, x)
    k = 0 if side == "left" else 1
    if z <= van["lowZ"]:
        return s["low"][k]
    if z <= van["beltZ"]:
        return lerp(s["low"][k], s["belt"][k], (z - van["lowZ"]) / (van["beltZ"] - van["lowZ"]))
    zc = min(z, van["interiorHeight"])
    return lerp(s["belt"][k], s["roof"][k], (zc - van["beltZ"]) / (van["interiorHeight"] - van["beltZ"]))


# ---------------------------------------------------------------- materials

def principled(mat):
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return bsdf


def material(name, rgba, rough=0.8, alpha=1.0):
    mat = bpy.data.materials.new(name)
    if bpy.app.version < (5, 0, 0):  # Blender 5 always uses node materials; the flag is deprecated
        mat.use_nodes = True
    bsdf = principled(mat)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        else:
            mat.blend_method = "BLEND"
    return mat


# ---------------------------------------------------------------- mesh helpers

def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def remove_loose(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(ob.data)
    bm.free()


def mesh_object(name, verts, faces, mats, face_mats=None):
    """verts in mm; returns None when there are no faces."""
    if not faces:
        return None
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x * MM, y * MM, z * MM) for x, y, z in verts], [], faces)
    for m in mats:
        me.materials.append(m)
    if face_mats:
        for poly, idx in zip(me.polygons, face_mats):
            poly.material_index = idx
    me.update()
    ob = link(bpy.data.objects.new(name, me))
    remove_loose(ob)
    return ob


def grid_faces(n_rows, n_cols, reverse=False):
    faces = []
    for i in range(n_rows - 1):
        for j in range(n_cols - 1):
            a = i * n_cols + j
            f = (a, a + 1, a + 1 + n_cols, a + n_cols)
            faces.append(tuple(reversed(f)) if reverse else f)
    return faces


def box_object(name, x0, x1, y0, y1, z0, z1, mat, cuts=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        v.co.x = lerp(x0, x1, v.co.x + 0.5) * MM
        v.co.y = lerp(y0, y1, v.co.y + 0.5) * MM
        v.co.z = lerp(z0, z1, v.co.z + 0.5) * MM
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return link(bpy.data.objects.new(name, me))


# ---------------------------------------------------------------- body parts

def side_wall(van, xs, side, holes, mats):
    H = van["interiorHeight"]
    zs = sorted(set([0.0, float(van["lowZ"]), float(van["beltZ"]), float(H)]
                    + [float(z) for h in holes for z in h["z"]] + frange(0.0, H, STEP)))
    zs = [z for z in zs if 0.0 <= z <= H]
    if side == "right":
        zs = zs[::-1]  # keeps normals pointing into the cabin
    verts = [(x, wall_y(van, x, z, side), z) for x in xs for z in zs]
    buckets = {"wall": [], "glass": [], "door": []}
    for i, f in enumerate(grid_faces(len(xs), len(zs))):
        xi, zj = divmod(i, len(zs) - 1)
        cx = (xs[xi] + xs[xi + 1]) / 2
        cz = (zs[zj] + zs[zj + 1]) / 2
        kind = "wall"
        for h in holes:
            if h["x"][0] <= cx <= h["x"][1] and h["z"][0] <= cz <= h["z"][1]:
                kind = h["kind"]
                if kind == "glass":
                    break
        buckets[kind].append(f)
    name = f"wall_{side}"
    return [
        mesh_object(name, verts, buckets["wall"], [mats["trim"]]),
        mesh_object(f"{name}_glass", verts, buckets["glass"], [mats["glass"]]),
        mesh_object(f"{name}_door", verts, buckets["door"], [mats["door"]]),
    ]


def floor_object(van, xs, mats):
    verts = []
    for x in xs:
        yr, yl = wall_y(van, x, 0.0, "right"), wall_y(van, x, 0.0, "left")
        verts += [(x, lerp(yr, yl, j / ROW), 0.0) for j in range(ROW + 1)]  # right → left keeps normals up
    return mesh_object("floor", verts, grid_faces(len(xs), ROW + 1), [mats["floor"]])


def end_panel(van, x, name, reverse, mats, glass_above=None):
    H = van["interiorHeight"]
    zs = sorted(set(frange(0.0, H, STEP) + [float(H)] + ([float(glass_above)] if glass_above else [])))
    verts = []
    for z in zs:
        yl, yr = wall_y(van, x, z, "left"), wall_y(van, x, z, "right")
        verts += [(x, lerp(yl, yr, j / ROW), z) for j in range(ROW + 1)]
    solid, glass = [], []
    for i, f in enumerate(grid_faces(len(zs), ROW + 1, reverse)):
        zi = i // ROW
        cz = (zs[zi] + zs[zi + 1]) / 2
        (glass if glass_above is not None and cz > glass_above else solid).append(f)
    objs = [mesh_object(name, verts, solid, [mats["dash" if glass_above else "trim"]])]
    if glass:
        objs.append(mesh_object("windshield_glass", verts, glass, [mats["glass"]]))
    return objs


def roof_strip(van, xs, name, mats, hole_mode=None):
    """hole_mode: None = plain roof, 'lid' = pop-top lid drawn in, 'cut' = opening left open."""
    H = float(van["interiorHeight"])
    px0, px1 = van["popTop"]["x"]
    hw = van["popTop"]["bed"]["width"] / 2 + 50
    verts = []
    for x in xs:
        yl, yr = section_at(van, x)["roof"]
        ys = [yl, (yl - hw) / 2, -hw] + [lerp(-hw, hw, k / 12) for k in range(1, 12)] + [hw, (hw + yr) / 2, yr]
        verts += [(x, y, H) for y in ys]
    n = 17
    faces, face_mats = [], []
    for i, f in enumerate(grid_faces(len(xs), n)):
        xi, yj = divmod(i, n - 1)
        cx = (xs[xi] + xs[xi + 1]) / 2
        cy = (verts[xi * n + yj][1] + verts[xi * n + yj + 1][1]) / 2
        in_hole = px0 <= cx <= px1 and abs(cy) < hw
        if in_hole and hole_mode == "cut":
            continue
        faces.append(f)
        face_mats.append(1 if in_hole and hole_mode == "lid" else 0)
    return mesh_object(name, verts, faces, [mats["trim"], mats["lid"]], face_mats)


def poptop_open(van, xs, mats):
    H = float(van["interiorHeight"])
    x0, x1 = van["popTop"]["x"]
    hw = van["popTop"]["bed"]["width"] / 2 + 50
    zf, zr = H + van["popTop"]["lift"], H + 150.0  # hinged at the rear, front edge raised
    panel = roof_strip(van, xs, "roof_poptop_open_panel", mats, hole_mode="cut")
    low = [(x0, -hw, H), (x0, hw, H), (x1, hw, H), (x1, -hw, H)]
    high = [(x0, -hw, zf), (x0, hw, zf), (x1, hw, zr), (x1, -hw, zr)]
    lid = mesh_object("poptop_lid", high, [(0, 1, 2, 3)], [mats["lid"]])
    tent_faces = [(k, (k + 1) % 4, 4 + (k + 1) % 4, 4 + k) for k in range(4)]
    tent = mesh_object("poptop_tent", low + high, tent_faces, [mats["tent"]])
    parent = link(bpy.data.objects.new("roof_poptop_open", None))
    for ob in (panel, lid, tent):
        ob.parent = parent
    return parent, [panel, lid, tent]


# ---------------------------------------------------------------- bake + export

def setup_cycles(samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    world = bpy.data.worlds.new("World")
    sc.world = world
    world.light_settings.distance = 0.25  # AO distance in metres; short, because the van interior is narrow


def bake_ao(objs):
    objs = [o for o in objs if o is not None and o.type == "MESH" and len(o.data.polygons) > 0]
    if not objs:
        return
    for ob in objs:
        attrs = ob.data.color_attributes
        attr = attrs.get("AO") or attrs.new("AO", "BYTE_COLOR", "CORNER")
        attrs.active_color = attr
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")


def export(out):
    base = dict(filepath=out, export_format="GLB", use_selection=False, export_yup=True, export_apply=True)
    try:
        bpy.ops.export_scene.gltf(**base, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**base, export_colors=True)


def main():
    a = parse_args()
    with open(a.data) as fh:
        van = json.load(fh)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {
        "trim": material("trim", (0.78, 0.78, 0.76, 1.0)),
        "door": material("door", (0.70, 0.71, 0.70, 1.0)),
        "floor": material("floor", (0.22, 0.22, 0.23, 1.0), rough=0.95),
        "dash": material("dash", (0.10, 0.10, 0.11, 1.0), rough=0.6),
        "glass": material("glass", (0.55, 0.65, 0.72, 1.0), rough=0.05, alpha=0.3),
        "lid": material("lid", (0.92, 0.92, 0.90, 1.0)),
        "tent": material("tent", (0.30, 0.34, 0.38, 1.0), rough=1.0),
        "arch": material("arch", (0.60, 0.60, 0.58, 1.0)),
    }
    cab, rear = float(van["cabFrontX"]), float(van["rearLimitX"])
    edges = ([e for w in van["windows"] for e in w["x"]] + list(van["slidingDoor"]["x"]) + list(van["arch"]["x"])
             + list(van["popTop"]["x"]) + [s["x"] for s in van["sections"]])
    xs = sorted(set([cab, rear] + frange(cab, rear, STEP) + [float(e) for e in edges]))
    xs = [x for x in xs if cab <= x <= rear]

    holes = {"left": [], "right": []}
    for w in van["windows"]:
        holes[w["side"]].append({"x": w["x"], "z": w["z"], "kind": "glass"})
    door = van["slidingDoor"]
    holes[door["side"]].append({"x": door["x"], "z": [0, door["height"]], "kind": "door"})

    common = []
    common += side_wall(van, xs, "left", holes["left"], mats)
    common += side_wall(van, xs, "right", holes["right"], mats)
    common.append(floor_object(van, xs, mats))
    common += end_panel(van, rear, "rear_panel", True, mats)
    common += end_panel(van, cab, "front_panel", False, mats, glass_above=van["beltZ"])
    ax0, ax1 = van["arch"]["x"]
    inner, height = van["arch"]["innerHalf"], van["arch"]["height"]
    common.append(box_object("arch_left", ax0, ax1, wall_y(van, ax0, 0, "left"), -inner, 0, height, mats["arch"]))
    common.append(box_object("arch_right", ax0, ax1, inner, wall_y(van, ax0, 0, "right"), 0, height, mats["arch"]))
    common.append(box_object("dashboard", cab, cab + 450, -760, 760, 0, 650, mats["dash"]))

    fixed = roof_strip(van, xs, "roof_fixed", mats)
    closed = roof_strip(van, xs, "roof_poptop_closed", mats, hole_mode="lid")
    _, open_meshes = poptop_open(van, xs, mats)
    common = [o for o in common if o is not None]

    if not a.no_bake:
        setup_cycles(a.samples)
        glass = [o for o in bpy.data.objects if "glass" in o.name]
        for o in glass:
            o.hide_render = True
        # Roof variants overlap, so bake each with only itself visible. Walls etc. bake with the fixed roof.
        variants = [[fixed], [closed], open_meshes]
        targets = [[*common, fixed], [closed], open_meshes]
        for i, group in enumerate(targets):
            for j, variant in enumerate(variants):
                for o in variant:
                    o.hide_render = i != j
            bake_ao([o for o in group if "glass" not in o.name])
            print(f"baked AO pass {i + 1}/3")
        for o in bpy.data.objects:
            o.hide_render = False

    export(a.out)
    print(f"Wrote {a.out}")


main()
