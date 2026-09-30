import { archBoxes, ceilingAt, wallY } from './body';
import type { Layout } from './layout';
import type { Box, Van } from './types';

export const PLAYER_RADIUS = 200;
export const STEP_OVER = 150;
export const HEAD_CLEARANCE = 120;
export const DASH_DEPTH = 450;
export const EYE = { sit: 1100, crouch: 1250, stand: 1650 } as const;
export type Stance = keyof typeof EYE;
export interface Pos { x: number; y: number }

/** Everything the player cannot walk through (the pop-top bed folds up, so it is ignored). */
export function walkObstacles(layout: Layout): Box[] {
  return [
    ...layout.modules.filter((m) => m.kind !== 'popTopBed').flatMap((m) => m.parts.map((p) => p.box)),
    ...archBoxes(layout.van),
  ].filter((b) => b.max[2] > STEP_OVER);
}

export function isFree(van: Van, obstacles: Box[], p: Pos, r = PLAYER_RADIUS): boolean {
  if (p.x < van.cabFrontX + DASH_DEPTH + r || p.x > van.rearLimitX - r) return false;
  if (p.y < wallY(van, p.x, 0, 'left') + r || p.y > wallY(van, p.x, 0, 'right') - r) return false;
  return !obstacles.some((b) => {
    const cx = Math.max(b.min[0], Math.min(p.x, b.max[0]));
    const cy = Math.max(b.min[1], Math.min(p.y, b.max[1]));
    return (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r;
  });
}

/** Moves if possible, otherwise slides along whichever axis is still free. */
export function moveWithCollisions(van: Van, obstacles: Box[], p: Pos, dx: number, dy: number): Pos {
  for (const next of [{ x: p.x + dx, y: p.y + dy }, { x: p.x + dx, y: p.y }, { x: p.x, y: p.y + dy }]) {
    if (isFree(van, obstacles, next)) return next;
  }
  return p;
}

export function eyeHeight(van: Van, popTop: boolean, x: number, stance: Stance): number {
  return Math.min(EYE[stance], ceilingAt(van, x, popTop) - HEAD_CLEARANCE);
}

/** Nearest free spot to the middle of the sliding-door opening, or null when the floor is full. */
export function findStart(van: Van, obstacles: Box[]): Pos | null {
  const cx = (van.slidingDoor.x[0] + van.slidingDoor.x[1]) / 2;
  const candidates: Pos[] = [];
  for (let x = van.livingStartX - 300; x <= van.rearLimitX; x += 50) {
    for (let y = -600; y <= 600; y += 50) candidates.push({ x, y });
  }
  candidates.sort((a, b) => Math.hypot(a.x - cx, a.y) - Math.hypot(b.x - cx, b.y));
  return candidates.find((c) => isFree(van, obstacles, c)) ?? null;
}
