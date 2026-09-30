import * as THREE from 'three';
import type { Box, Vec3 } from '../core/types';

export const MM = 0.001;

/** Van frame (mm, X rear, Y right, Z up) → three.js (m, Y up). */
export function toThree(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x * MM, z * MM, -y * MM);
}

export function fromThree(v: THREE.Vector3): Vec3 {
  return [v.x / MM, -v.z / MM, v.y / MM];
}

export function boxToThree(b: Box): { center: THREE.Vector3; size: THREE.Vector3 } {
  const center = toThree((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  const size = new THREE.Vector3((b.max[0] - b.min[0]) * MM, (b.max[2] - b.min[2]) * MM, (b.max[1] - b.min[1]) * MM);
  return { center, size };
}
