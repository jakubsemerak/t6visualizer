import type { Box, Vec3 } from './types';

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box {
  return {
    min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)],
    max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)],
  };
}

/** True when the boxes overlap by more than `eps` on every axis. */
export function intersects(a: Box, b: Box, eps = 1): boolean {
  for (let i = 0; i < 3; i++) {
    if (Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) <= eps) return false;
  }
  return true;
}

export function size(b: Box): Vec3 {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

export function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}
