import { describe, expect, it } from 'vitest';
import { VAN } from '../../src/core/data';
import { buildLayout, type Overrides } from '../../src/core/layout';
import { bedSize, combinedBed, computeMetrics } from '../../src/core/metrics';
import { presetById } from '../../src/core/presets';

function metricsFor(id: string, o: Overrides = {}) {
  const p = presetById(id);
  return computeMetrics(buildLayout(VAN, p, { ...o, state: 'seated' }), buildLayout(VAN, p, { ...o, state: 'bed' }));
}

describe('combinedBed', () => {
  it('merges two touching singles', () => {
    const r = combinedBed([
      { x0: 1920, x1: 3870, y0: -430, y1: 170, z: 450 },
      { x0: 1920, x1: 3870, y0: 175, y1: 775, z: 450 },
    ]);
    expect(bedSize(r)).toEqual({ length: 1950, width: 1205 });
  });
  it('keeps distant beds apart and returns the biggest', () => {
    const r = combinedBed([
      { x0: 0, x1: 1000, y0: 0, y1: 500, z: 450 },
      { x0: 0, x1: 2000, y0: 700, y1: 1300, z: 450 },
    ]);
    expect(bedSize(r)).toEqual({ length: 2000, width: 600 });
  });
  it('returns null without beds', () => {
    expect(combinedBed([])).toBeNull();
  });
});

describe('computeMetrics', () => {
  it('coast-style', () => {
    const m = metricsFor('coast');
    expect(m.bed).toEqual({ length: 1950, width: 1140 });
    expect(m.seats).toBe(5);
    expect(m.sleepers).toBe(2);
    expect(m.rearLegroom).toBe(570);
    expect(m.bootLength).toBe(1300);
    expect(m.bootVolumeL).toBeGreaterThan(1850);
    expect(m.bootVolumeL).toBeLessThan(2100);
    expect(m.counterLength).toBe(1430);
    expect(m.fridgeL).toBe(42);
    expect(m.waterL).toBe(30);
    expect(m.rearSeatsRemovable).toBe(true);
    expect(m.conversionKg).toBe(121);
    expect(m.payloadLeftKg).toBe(386);
    expect(m.standingHeight).toBe(1370);
  });
  it('pop-top adds a roof bed and standing height', () => {
    const m = metricsFor('coast', { popTop: true });
    expect(m.roofBed).toEqual({ length: 2000, width: 1200 });
    expect(m.sleepers).toBe(4);
    expect(m.standingHeight).toBe(2300);
  });
  it('trio seats six', () => {
    const m = metricsFor('trio');
    expect(m.seats).toBe(6);
    expect(m.bed).toEqual({ length: 2000, width: 1260 });
  });
  it('beach bed is 1500 wide', () => {
    expect(metricsFor('beach').bed).toEqual({ length: 2000, width: 1500 });
  });
  it('singles combine into one bed', () => {
    expect(metricsFor('singles').bed).toEqual({ length: 1950, width: 1205 });
  });
  it('budget keeps the fixed factory bench', () => {
    const m = metricsFor('budget');
    expect(m.bed).toEqual({ length: 1880, width: 1430 });
    expect(m.rearSeatsRemovable).toBe(false);
    expect(m.seats).toBe(6);
  });
});
