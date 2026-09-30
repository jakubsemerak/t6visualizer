import { describe, expect, it } from 'vitest';
import { box } from '../../src/core/geometry';
import { boxToThree, fromThree, toThree } from '../../src/three/coords';

describe('coords', () => {
  it('maps van mm to three metres (X, Z, −Y)', () => {
    const v = toThree(1000, 500, 200);
    expect([v.x, v.y, v.z]).toEqual([1, 0.2, -0.5]);
  });
  it('round-trips', () => {
    expect(fromThree(toThree(1234, -567, 890)).map((n) => Math.round(n))).toEqual([1234, -567, 890]);
  });
  it('converts boxes to centre + size', () => {
    const { center, size } = boxToThree(box(0, 1000, -200, 200, 0, 500));
    expect([center.x, center.y, center.z]).toEqual([0.5, 0.25, -0]);
    expect([size.x, size.y, size.z]).toEqual([1, 0.5, 0.4]);
  });
});
