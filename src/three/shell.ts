import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { archBoxes } from '../core/body';
import type { Box, Van } from '../core/types';
import { boxToThree, toThree } from './coords';

export type RoofVariant = 'fixed' | 'closed' | 'open';
const ROOF_NODES: Record<RoofVariant, string> = { fixed: 'roof_fixed', closed: 'roof_poptop_closed', open: 'roof_poptop_open' };

/** Loads the baked GLB; falls back to a procedural box shell from van.json. */
export async function loadShell(url: string, van: Van): Promise<{ group: THREE.Group; baked: boolean }> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    prepareShell(gltf.scene);
    return { group: gltf.scene, baked: true };
  } catch (err) {
    console.warn('Shell GLB failed to load, using procedural shell', err);
    return { group: proceduralShell(van), baked: false };
  }
}

function prepareShell(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
    m.side = THREE.DoubleSide;
    mesh.material = m;
    const glass = /glass/.test(shellName(mesh));
    mesh.receiveShadow = true;
    mesh.castShadow = !glass;
  });
}

export function proceduralShell(van: Van): THREE.Group {
  const g = new THREE.Group();
  const mat = (color: string) => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85 });
  const len = (van.rearLimitX - van.cabFrontX) / 1000;
  const H = van.interiorHeight;
  const half = van.sections[1].low[1];
  const cx = (van.cabFrontX + van.rearLimitX) / 2;
  const plane = (name: string, w: number, h: number, pos: THREE.Vector3, rot: THREE.Euler, color: string) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
    m.name = name;
    m.position.copy(pos);
    m.rotation.copy(rot);
    m.receiveShadow = true;
    g.add(m);
  };
  plane('floor', len, (2 * half) / 1000, toThree(cx, 0, 0), new THREE.Euler(-Math.PI / 2, 0, 0), '#3a3b3d');
  plane('roof_fixed', len, (2 * half) / 1000, toThree(cx, 0, H), new THREE.Euler(Math.PI / 2, 0, 0), '#c8c8c4');
  plane('wall_left', len, H / 1000, toThree(cx, -half, H / 2), new THREE.Euler(0, 0, 0), '#c8c8c4');
  plane('wall_right', len, H / 1000, toThree(cx, half, H / 2), new THREE.Euler(0, 0, 0), '#c8c8c4');
  plane('rear_panel', (2 * half) / 1000, H / 1000, toThree(van.rearLimitX, 0, H / 2), new THREE.Euler(0, Math.PI / 2, 0), '#c8c8c4');
  archBoxes(van).forEach((b, i) => {
    const clipped: Box = { min: [b.min[0], Math.max(b.min[1], -half), b.min[2]], max: [b.max[0], Math.min(b.max[1], half), b.max[2]] };
    const { center, size } = boxToThree(clipped);
    const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat('#b9b7ae'));
    m.name = i === 0 ? 'arch_left' : 'arch_right';
    m.position.copy(center);
    g.add(m);
  });
  return g;
}

export function setRoofVariant(shell: THREE.Object3D, variant: RoofVariant): void {
  for (const [key, name] of Object.entries(ROOF_NODES)) {
    const node = shell.getObjectByName(name);
    if (node) node.visible = key === variant;
  }
}

const CUTAWAY: { match: RegExp; hide: (cam: THREE.Vector3, van: Van) => boolean }[] = [
  { match: /^roof_|^poptop/, hide: (c, van) => c.y > van.interiorHeight / 1000 + 0.2 },
  { match: /^wall_left/, hide: (c) => c.z > 0.9 },
  { match: /^wall_right/, hide: (c) => c.z < -0.9 },
  { match: /^rear_panel/, hide: (c, van) => c.x > van.rearLimitX / 1000 + 0.2 },
  { match: /^front_panel|^windshield|^dashboard/, hide: (c, van) => c.x < van.cabFrontX / 1000 - 0.2 },
];

/** Name of the nearest ancestor that belongs to the shell's named parts (GLTF splits multi-material meshes). */
function shellName(o: THREE.Object3D): string {
  let n: THREE.Object3D | null = o;
  while (n) {
    if (/^(wall_|roof_|poptop|rear_panel|front_panel|windshield|dashboard|floor|arch_)/.test(n.name)) return n.name;
    n = n.parent;
  }
  return o.name;
}

/** Fades the shell parts between the camera and the interior. */
export function applyCutaway(shell: THREE.Object3D, camera: THREE.Camera, van: Van, enabled: boolean): void {
  shell.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = shellName(mesh);
    const rule = CUTAWAY.find((r) => r.match.test(name));
    const hide = enabled && !!rule && rule.hide(camera.position, van);
    const glass = /glass/.test(name);
    const m = mesh.material as THREE.MeshStandardMaterial;
    m.transparent = hide || glass;
    m.opacity = hide ? 0.08 : glass ? 0.3 : 1;
    m.depthWrite = !hide && !glass;
  });
}
