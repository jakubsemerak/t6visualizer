import { describe, expect, it } from 'vitest';
import { fridgeById } from '../../src/core/catalog';
import { VAN } from '../../src/core/data';
import { box } from '../../src/core/geometry';
import {
  aroundArch, bedPlatform, factoryBench, kitchenBlock, popTopBed, sideLocker, wardrobe,
} from '../../src/core/modules/furniture';
import type { BuildCtx } from '../../src/core/types';

const seated: BuildCtx = { van: VAN, state: 'seated', popTop: false };
const flat: BuildCtx = { ...seated, state: 'bed' };

describe('aroundArch', () => {
  it('splits a wall cabinet that crosses the arch into three parts', () => {
    const parts = aroundArch(VAN, box(2400, 3600, -780, -400, 0, 800));
    expect(parts).toHaveLength(3);
    expect(parts[1].min[2]).toBe(351);
  });
  it('leaves a centred box alone', () => {
    expect(aroundArch(VAN, box(2400, 3600, -300, 300, 0, 800))).toHaveLength(1);
  });
  it('drops the over-arch part when the module is lower than the arch', () => {
    expect(aroundArch(VAN, box(2480, 3870, -790, -440, 0, 340))).toHaveLength(2);
  });
});

describe('furniture', () => {
  it('kitchen hugs the left wall', () => {
    const k = kitchenBlock('kitchen', 'Kitchen', {
      x0: 1470, length: 1430, maxLength: 1430, depth: 380, height: 800, side: 'left', fridge: 'compressor42', waterL: 30,
    }, fridgeById('compressor42'), seated);
    const b = k.parts[0].box;
    expect(b.min[1]).toBeCloseTo(-768.1, 0);
    expect(b.max[1] - b.min[1]).toBeCloseTo(380, 5);
    expect(k.kitchen).toEqual({ counterLength: 1430, fridgeL: 42, waterL: 30 });
    expect(k.massKg).toBe(122);
  });

  it('wardrobe over the arch starts above it', () => {
    const w = wardrobe('w', 'Wardrobe', { x0: 2900, length: 450, depth: 320, height: 1250, side: 'left' }, seated);
    expect(w.parts).toHaveLength(1);
    expect(w.parts[0].box.min[2]).toBe(351);
  });

  it('low locker skips the arch', () => {
    const l = sideLocker('l', 'Locker', { x0: 2480, length: 1390, height: 340, side: 'left', innerY: 440 }, seated);
    expect(l.parts).toHaveLength(2);
    expect(l.parts[0].box.max[1]).toBe(-440);
  });

  it('factory bench folds its backrest for the bed', () => {
    const b = factoryBench('b', 'Factory bench', { frontX: 1700, width: 1430 }, flat);
    expect(Math.max(...b.parts.map((p) => p.box.max[2]))).toBe(550);
    expect(b.removable).toBe(false);
    expect(b.seats).toBe(3);
  });

  it('bed platform keeps its storage box between the arches', () => {
    const p = bedPlatform('p', 'Bed kit', { x0: 1700, nominalLength: 1880, width: 1430 }, flat);
    expect(p.bed!.x1 - p.bed!.x0).toBe(1880);
    const carcass = p.parts.find((x) => x.role === 'carcass')!.box;
    expect(carcass.max[1]).toBe(600);
  });

  it('pop-top bed sits in the roof', () => {
    const r = popTopBed('poptop', { ...seated, popTop: true });
    expect(r.roofBed!.x1 - r.roofBed!.x0).toBe(2000);
    expect(r.roofBed!.y1 - r.roofBed!.y0).toBe(1200);
    expect(r.parts[0].box.max[2]).toBe(1470);
  });
});
