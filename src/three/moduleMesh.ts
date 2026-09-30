import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PlacedModule } from '../core/types';
import { boxToThree } from './coords';
import { partMaterial } from './materials';

const SOFT = new Set(['cushion', 'backrest', 'mattress']);
const FLAG = new THREE.LineBasicMaterial({ color: '#e24b4a' });

/** Meshes for one placed module; flagged modules get a red outline. */
export function buildModuleGroup(m: PlacedModule, flagged = false): THREE.Group {
  const g = new THREE.Group();
  g.name = m.id;
  for (const part of m.parts) {
    const { center, size } = boxToThree(part.box);
    const radius = Math.min(0.03, size.x / 2, size.y / 2, size.z / 2);
    const geo = SOFT.has(part.role)
      ? new RoundedBoxGeometry(size.x, size.y, size.z, 3, radius)
      : new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, partMaterial(m.kind, part.role));
    mesh.position.copy(center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    if (flagged) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)), FLAG);
      edges.position.copy(center);
      g.add(edges);
    }
  }
  return g;
}

export function disposeGroup(root: THREE.Object3D): void {
  root.traverse((o) => {
    const geo = (o as THREE.Mesh).geometry;
    if (geo) geo.dispose();
  });
}
