import { describe, expect, it } from 'vitest';
import { box, intersects, overlap1d, size } from '../../src/core/geometry';

describe('geometry', () => {
  it('normalises corner order', () => {
    expect(box(10, 0, 5, -5, 0, 1)).toEqual({ min: [0, -5, 0], max: [10, 5, 1] });
  });
  it('detects overlap', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(5, 15, 5, 15, 5, 15))).toBe(true);
  });
  it('treats touching boxes as free', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(10, 20, 0, 10, 0, 10))).toBe(false);
  });
  it('ignores overlaps within the 1 mm tolerance', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(9.5, 20, 0, 10, 0, 10))).toBe(false);
  });
  it('measures size', () => {
    expect(size(box(0, 10, -5, 5, 2, 3))).toEqual([10, 10, 1]);
  });
  it('measures 1D overlap', () => {
    expect(overlap1d(0, 10, 5, 20)).toBe(5);
    expect(overlap1d(0, 10, 20, 30)).toBe(0);
  });
});
