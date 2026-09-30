import { describe, expect, it } from 'vitest';
import vanJson from '../../data/van.json';
import { isApprox, loadVan } from '../../src/core/van';

describe('van data', () => {
  const van = loadVan(vanJson);

  it('describes the SWB Mixto', () => {
    expect(van.wheelbase).toBe(3000);
    expect(van.rearLimitX - van.livingStartX).toBe(2400);
    expect(van.slidingDoor.side).toBe('right');
  });

  it('rejects unsorted sections', () => {
    const bad = structuredClone(vanJson) as { sections: unknown[] };
    bad.sections.reverse();
    expect(() => loadVan(bad)).toThrow(/sorted/);
  });

  it('rejects missing numbers', () => {
    const bad = structuredClone(vanJson) as Record<string, unknown>;
    delete bad.interiorHeight;
    expect(() => loadVan(bad)).toThrow(/interiorHeight/);
  });

  it('flags approximate values', () => {
    expect(isApprox(van, 'arch.x')).toBe(true);
    expect(isApprox(van, 'wheelbase')).toBe(false);
  });
});
