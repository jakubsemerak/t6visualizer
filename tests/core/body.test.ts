import { describe, expect, it } from 'vitest';
import { archBoxes, bodyViolation, ceilingAt, sectionAt, wallInner, wallY } from '../../src/core/body';
import { VAN } from '../../src/core/data';
import { box } from '../../src/core/geometry';

describe('body', () => {
  it('interpolates sections between stations', () => {
    expect(sectionAt(VAN, 2000).low[1]).toBe(790); // sliding-door zone
    expect(sectionAt(VAN, 2700).low[1]).toBe(830);
    expect(sectionAt(VAN, 3435).belt[1]).toBeCloseTo(789, 0);
  });

  it('follows the wall profile in Z', () => {
    expect(wallY(VAN, 2000, 0, 'right')).toBe(790);
    expect(wallY(VAN, 2000, 650, 'right')).toBe(814);
    expect(wallY(VAN, 2000, 1370, 'right')).toBe(681);
    expect(wallY(VAN, 2000, 650, 'left')).toBe(-809);
  });

  it('finds the tightest wall over a range', () => {
    expect(wallInner(VAN, 1470, 2900, 0, 800, 'left')).toBeCloseTo(-773.1, 0);
  });

  it('lets a bench base overhang the door sill but not the door trim', () => {
    expect(bodyViolation(VAN, box(1920, 2570, -300, 780, 0, 300), false)).toBeNull();
    expect(bodyViolation(VAN, box(1920, 2570, -300, 820, 300, 450), false)).toBe('through right wall');
  });

  it('rejects boxes above the ceiling unless the pop-top is up', () => {
    const b = box(2000, 2400, -200, 200, 1000, 1500);
    expect(bodyViolation(VAN, b, false)).toBe('above ceiling');
    expect(bodyViolation(VAN, b, true)).toBeNull();
  });

  it('rejects boxes behind the tailgate', () => {
    expect(bodyViolation(VAN, box(3500, 3900, -100, 100, 0, 100), false)).toBe('behind tailgate');
  });

  it('raises the ceiling inside the pop-top zone only', () => {
    expect(ceilingAt(VAN, 2000, true)).toBe(2300);
    expect(ceilingAt(VAN, 3600, true)).toBe(1370);
    expect(ceilingAt(VAN, 2000, false)).toBe(1370);
  });

  it('builds wheel-arch boxes on both sides', () => {
    const [left, right] = archBoxes(VAN);
    expect(left.max[1]).toBe(-610);
    expect(right.min[1]).toBe(610);
    expect(right.max[2]).toBe(341);
  });
});
