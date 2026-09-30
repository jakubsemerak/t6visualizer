import { box, lerp } from './geometry';
import type { Box, Section, Side, Van, YPair } from './types';

const lerpPair = (a: YPair, b: YPair, t: number): YPair => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Interior section at any X, linearly interpolated between stations and clamped at the ends. */
export function sectionAt(van: Van, x: number): Section {
  const s = van.sections;
  if (x <= s[0].x) return { ...s[0], x };
  const last = s[s.length - 1];
  if (x >= last.x) return { ...last, x };
  let i = 1;
  while (s[i].x < x) i++;
  const a = s[i - 1];
  const b = s[i];
  const t = (x - a.x) / (b.x - a.x);
  return { x, low: lerpPair(a.low, b.low, t), belt: lerpPair(a.belt, b.belt, t), roof: lerpPair(a.roof, b.roof, t) };
}

/** Wall Y at (x, z). Left wall is negative, right wall positive. */
export function wallY(van: Van, x: number, z: number, side: Side): number {
  const sec = sectionAt(van, x);
  const k = side === 'left' ? 0 : 1;
  if (z <= van.lowZ) return sec.low[k];
  if (z <= van.beltZ) return lerp(sec.low[k], sec.belt[k], (z - van.lowZ) / (van.beltZ - van.lowZ));
  const zc = Math.min(z, van.interiorHeight);
  return lerp(sec.belt[k], sec.roof[k], (zc - van.beltZ) / (van.interiorHeight - van.beltZ));
}

/** Tightest (most inward) wall Y over an X and Z range. */
export function wallInner(van: Van, x0: number, x1: number, z0: number, z1: number, side: Side): number {
  const xs = [x0, x1, ...van.sections.map((s) => s.x).filter((x) => x > x0 && x < x1)];
  const zs = [z0, z1, van.lowZ, van.beltZ, van.interiorHeight].filter((z) => z >= z0 && z <= z1);
  const ys = xs.flatMap((x) => zs.map((z) => wallY(van, x, z, side)));
  return side === 'left' ? Math.max(...ys) : Math.min(...ys);
}

export function ceilingAt(van: Van, x: number, popTop: boolean): number {
  const inPopTop = popTop && x >= van.popTop.x[0] && x <= van.popTop.x[1];
  return inPopTop ? van.interiorHeight + van.popTop.lift : van.interiorHeight;
}

export function archBoxes(van: Van): [Box, Box] {
  const { x, height, innerHalf } = van.arch;
  return [box(x[0], x[1], -1000, -innerHalf, 0, height), box(x[0], x[1], innerHalf, 1000, 0, height)];
}

/** Why a box does not fit inside the body, or null when it fits. */
export function bodyViolation(van: Van, b: Box, popTop: boolean): string | null {
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  if (z0 < -1) return 'below floor';
  if (x0 < van.cabFrontX - 1) return 'in front of cab';
  if (x1 > van.rearLimitX + 1) return 'behind tailgate';
  const ceiling = Math.min(ceilingAt(van, x0, popTop), ceilingAt(van, x1, popTop));
  if (z1 > ceiling + 1) return 'above ceiling';
  const zBot = Math.min(z0, van.interiorHeight);
  const zTop = Math.min(z1, van.interiorHeight);
  if (y0 < wallInner(van, x0, x1, zBot, zTop, 'left') - 1) return 'through left wall';
  if (y1 > wallInner(van, x0, x1, zBot, zTop, 'right') + 1) return 'through right wall';
  return null;
}
