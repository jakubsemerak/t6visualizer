import { describe, expect, it } from 'vitest';
import { wallY } from '../../src/core/body';
import { VAN } from '../../src/core/data';
import { buildLayout } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';
import { eyeHeight, findStart, isFree, moveWithCollisions, PLAYER_RADIUS, walkObstacles } from '../../src/core/walk';

const coast = buildLayout(VAN, presetById('coast'));
const obstacles = walkObstacles(coast);

describe('walk', () => {
  it('finds a free start near the sliding door', () => {
    const start = findStart(VAN, obstacles)!;
    expect(start).not.toBeNull();
    expect(isFree(VAN, obstacles, start)).toBe(true);
  });
  it('treats the bench as solid', () => {
    expect(isFree(VAN, obstacles, { x: 2200, y: 200 })).toBe(false);
  });
  it('slides along a wall instead of stopping', () => {
    const r = moveWithCollisions(VAN, [], { x: 2000, y: 0 }, 5, -2000);
    expect(r).toEqual({ x: 2005, y: 0 });
    expect(r.y).toBeGreaterThan(wallY(VAN, 2000, 0, 'left') + PLAYER_RADIUS);
  });
  it('forces a crouch under the fixed roof', () => {
    expect(eyeHeight(VAN, false, 2000, 'stand')).toBe(1250);
    expect(eyeHeight(VAN, true, 2000, 'stand')).toBe(1650);
    expect(eyeHeight(VAN, true, 3600, 'stand')).toBe(1250);
    expect(eyeHeight(VAN, false, 2000, 'sit')).toBe(1100);
  });
});
