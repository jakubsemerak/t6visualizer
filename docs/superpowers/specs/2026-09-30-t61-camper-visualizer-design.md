# T6.1 camper conversion visualizer – design

Date: 2026-09-30 · Status: approved design, pending spec review

## Goal

A local web tool for choosing a California-style camper conversion for a **VW T6.1 Kasten Mixto DoKa,
SWB 3000 mm, normal roof** (sliding door right, tailgate without glass, 3 front seats). It shows researched
conversion layouts on a dimensionally accurate 3D model of the van, lets the user tweak key parameters,
compares layouts against the user's requirements, offers a first-person walk inside, and exports
dimensioned SVG floor plans.

Visual reference: https://kancl.tomasarchalous.cz/ (Three.js 0.170, Blender-built GLB with Draco,
Cycles-baked lighting, first-person WASD walk with colliders and minimap).

## User requirements

- 3 seats in front (driver + double passenger bench) and 2 (optionally 3) seats in the rear → 5–6 seats.
- Simple, everyday-usable for 4–5 people; rear seats removable for more cargo space.
- Lower bed comfortable for **two people 187 cm tall** → hard minimum **1950 mm long, 1120 mm wide** (the
  standard 3/4 rock-and-roll bed width; ≥ 1200 preferred, shown as a warning below it).
- Sleeping capacity compared across options: 2 below, optional 2 more in a pop-top.
- English UI; runs locally.

## Scope

In v1:

- 5 presets (below), each with parametric tweaks and a pop-top toggle.
- Orbit/cutaway 3D configurator, first-person walk mode, 2D plan view, comparison table.
- Export: dimensioned **SVG** (top plan + side section).

Out of v1: DXF/PDF export, free-form drag-and-drop, live shop prices, Fusion 360 CAD export,
tailgate kitchens.

## Data source

All dimensions come from `docs/research/2026-09-30-t61-swb-dimensions-and-conversions.md`, primarily
VW's bodybuilder drawings and guidelines. They live in `data/van.json` in VW's coordinate system
(mm; X rearward from the front axle, Y positive to the right). Z is measured up from the cargo-floor
top, not VW's wheel-centre Z0, so every furniture height reads directly as "height above floor". Every value
carries a `source` field. Values scaled from drawings carry `approx: true`, and the UI marks
them "± verify on your van". Where sources conflict, `van.json` stores both, and the app uses the more
conservative (smaller) figure.

Key values the app depends on:

| Key | Value |
|---|---|
| Wheelbase / rear axle X | 3000 |
| Cargo floor start (partition removed, behind cab seats) | X ≈ 1470 (approx) |
| Rear limit (tailgate inner edge) | X ≈ 3870 (1470 + 2400) |
| Width at belt line / roof / floor at sliding door | 1623 / 1388 / 1504 |
| Width between wheel arches | 1220 (conservative) |
| Wheel arch | X ≈ 2600–3450, height 341 (approx) |
| Interior height | 1370 (conservative, rear, bare floor) |
| Sliding door opening | X ≈ 1430–2450, 1017 × 1282 |
| Front seats | driver X 800–1350, Y −700…−150; double bench Y +50…+800 |
| Pop-top | +1050 roof height, roof bed 2000 × 1200 |

The body interior is described by cross-sections at several X stations (floor / belt-line / roof
half-widths), so collision checks are Z-aware: a bench seat may overhang the sliding-door sill but not
the door trim.

## Presets

Front row default: `cab3Seats` = driver + double bench (3 seats, non-swivel). Parameter: replace the
double bench with a single swivel passenger seat (−1 seat, enables a small lounge).
Every preset has a `popTop` toggle (+2 sleepers, standing height ≈ 2300 in the front roof area).

| # | Preset | Rear seating | Furniture | Default bed | Based on |
|---|---|---|---|---|---|
| 1 | Coast-style | 2-seat RnR bench 1140 wide on rails | driver-side kitchen block (sink, 2-burner hob, 42 L compressor fridge, 30 L water) X 1470–2900, depth 410; rear-left wardrobe | 1950 × 1140 | VW California Coast/Ocean |
| 2 | Beach-style | 2-seat RnR bench, frame 1140, bed flaps to 1500 | low side lockers over both wheel arches; portable box kitchen in boot | 2000 × 1500 | California Beach Camper |
| 3 | TrioStyle-like | 3-seat bench 1205 (Variotech 3000 class), 6 rail positions | angled driver-side kitchen (39 L fridge) + wardrobe | 2000 × 1260 | Reimo TrioStyle |
| 4 | Two sliding singles | 2 × 600 single RnR seats on rails, individually removable | short driver-side kitchen (≈ 1000 long) + locker | 1950 × 1200 | MAL Tourliner / Smart Bed rails |
| 5 | Budget: keep Mixto bench | factory 3-seat bench (fixed) | partition removed, bed-kit platform, storage box | 1880 × 1430 (fails 187 cm check) | multivan-shop.cz bed kit |

Each preset JSON lists modules, default parameters, source links, and rough mass/cost figures per module
(labelled "estimate").

### Parametric tweaks

- Bench rail position (benchFrontX), limited to the rail's lock positions.
- Bench width / seat count, from the catalogue widths (1120/1140/1155/1200/1205/1260/1300).
- Kitchen length and depth; fridge type (none / cool box / 42 L compressor).
- Front passenger: double bench / single swivel.
- Pop-top on/off.

Bed length rule: `bedLength = min(nominalFlatLength, rearLimitX − benchFrontX)`. Moving the bench back
therefore gives more rear legroom but a shorter bed, and the UI shows this trade-off live.

## Architecture

Vite + TypeScript, Three.js (current release, ≥ 0.170), vanilla DOM UI (no framework), Vitest.

```
blender/build_shell.py   builds the Mixto shell from data/van.json, bakes AO to vertex colours in Cycles, exports public/models/van.glb
data/van.json            body dimensions + cross-sections + sources
data/modules/*.json      module catalogue (dims, mass, cost, approval flags, sources)
data/presets/*.json      the 5 presets
src/core/                pure TS: layout model, geometry (AABB/Z-aware), metrics, checks – no Three.js
src/three/               scene, orbit/cutaway view, walk mode, module mesh builders, GLB loader
src/plan/                SVG renderer (top plan + side section, dimension chains) + export
src/ui/                  preset picker, parameter panel, comparison table, warnings list
public/models/van.glb    committed build output, so the app runs without Blender
```

### Units

1. **Shell (Blender, headless).** `npm run build:shell` runs
   `blender -b --python blender/build_shell.py -- --data data/van.json --out public/models/van.glb`.
   It builds: floor, wheel arches, pillars, side walls with window cut-outs (sliding window in door,
   fixed front-left), sliding-door and tailgate openings, simplified cab and dashboard, and roof in three
   swappable variants (fixed, pop-top closed, pop-top open). It bakes **ambient occlusion only**, into vertex
   colours, so the bake stays valid whatever furniture is inside. No Draco: the shell is small, and
   skipping it means no decoder to host. Real-time lights handle the rest.
2. **Module builders (`src/core/modules`).** One function per module type:
   `cabSeats`, `rnrBench` (also used for single seats), `factoryBench`, `bedPlatform`, `kitchenBlock`,
   `wardrobe`, `sideLocker`, `boxKitchen`, `popTopBed`. Signature: `(params, ctx) → PlacedModule`, whose
   `parts` (role + box) are both the colliders and the geometry. They are built in the pure core so tests can
   check them. `src/three/moduleMesh.ts` turns a `PlacedModule` into meshes. Each builder has seated and
   flat (bed) states.
3. **Layout core (`src/core`).** `buildLayout(van, preset, overrides) → Layout` produces placed modules
   in van coordinates. `evaluate(layout) → { metrics, checks }`:
   - Metrics: bed L × W; sleepers (below/roof); travel seats and how many have crash-tested approval
     metadata; rear legroom; counter length; fridge L; water L; boot length/volume behind the seated
     bench; standing height; estimated mass vs payload; estimated cost range.
   - Checks (warnings, never silent): module–module and module–body collisions; blocked sliding door;
     seat on wheel arch; bed < 1950 long or < 1120 wide (fails 2 × 187 cm), < 1200 wide (warning); headroom without pop-top;
     payload exceeded; seats without an approval flag.
4. **Views.**
   - Orbit/cutaway: roof and near wall fade; dimension overlay toggle; seat/bed state toggle; light toggle.
   - Walk: pointer lock, WASD, Shift run, C crouch, eye heights sit/crouch/stand (stand only where
     headroom allows, auto-crouch under the 1.37 m ceiling), colliders from modules + body, minimap (M).
   - Plan: top view + side section, 1:10 / 1:20, dimension chains (living length, bench position, bed,
     kitchen, gaps).
   - Compare: all presets with current overrides; hard requirements (≥ 5 seats, bed ≥ 1950 × 1150,
     removable rear seats; bed means ≥ 1950 × 1120) shown pass/fail; the rest shown as values. A "best match" badge goes to presets
     passing every hard requirement, ranked by bed width and then boot length.
5. **Export.** SVG with real-mm units (prints at chosen scale), title block (preset, overrides, date,
   "approx values – verify on van").

### Data flow

preset JSON + overrides → `buildLayout` → `Layout` → (a) module builders → 3D scene, (b) SVG plan,
(c) `evaluate` → metrics/checks → UI. Overrides live in the URL hash so a configuration can be shared.

## Error handling

- Invalid override (e.g. bench beyond rail range): clamped to the nearest valid value with an inline note.
- GLB fails to load: fall back to a procedural box shell built from `van.json`, with a banner.
- Checks are shown as a warnings list and as red outlines in 3D/plan. Nothing is silently fixed.

## Testing

- Vitest on `src/core`: bed-length rule, collisions (including the Z-aware sliding-door case), metrics for
  each preset matching documented numbers (e.g. Coast-style bed 1950 × 1140, Budget fails the 187 cm check).
- Preset smoke test: every preset builds and evaluates with no unexpected warnings.
- Blender script: a local check script runs it headless and asserts GLB exists and bounding box matches
  van.json within 5 mm.
- Manual/visual: verify in the browser pane (orbit, walk, plan, export) before calling it done.

## Tooling

Already installed: Blender 5.0 (`/opt/homebrew/bin/blender`), Node + npm. No further installs needed.
Fusion 360 becomes useful later, for CNC-ready furniture CAD once a layout is chosen.
