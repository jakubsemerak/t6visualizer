import { describe, expect, it } from 'vitest';
import { benchById } from '../../src/core/catalog';
import { VAN } from '../../src/core/data';
import { cabSeats, rnrBench, type RnrBenchParams } from '../../src/core/modules/seating';
import type { BuildCtx } from '../../src/core/types';

const seated: BuildCtx = { van: VAN, state: 'seated', popTop: false };
const flat: BuildCtx = { ...seated, state: 'bed' };
const cali = benchById('cali-1140')!;
const params: RnrBenchParams = {
  model: 'cali-1140', frontX: 1920, yCenter: 200, railRange: [1620, 2220], railStep: 100, removable: true,
};

describe('cab seats', () => {
  it('double bench gives three factory seats', () => {
    const m = cabSeats('cab', { passenger: 'doubleBench' }, seated);
    expect(m.seats).toBe(3);
    expect(m.approvedSeats).toBe(3);
    expect(m.isRearSeat).toBe(false);
  });
  it('single swivel gives two seats', () => {
    expect(cabSeats('cab', { passenger: 'singleSwivel' }, seated).seats).toBe(2);
  });
  it('backrests end at the cab seat-back line', () => {
    const m = cabSeats('cab', { passenger: 'doubleBench' }, seated);
    expect(Math.max(...m.parts.map((p) => p.box.max[0]))).toBe(VAN.cab.seatBackX);
  });
});

describe('rock-and-roll bench', () => {
  it('occupies seat depth plus backrest when seated', () => {
    const m = rnrBench('bench', 'Rear bench', cali, params, seated);
    expect(Math.max(...m.parts.map((p) => p.box.max[0]))).toBe(2570);
    expect(m.seats).toBe(2);
    expect(m.isRearSeat).toBe(true);
    expect(m.removable).toBe(true);
  });
  it('caps the bed length at the tailgate', () => {
    const back = rnrBench('bench', 'Rear bench', cali, { ...params, frontX: 2020 }, flat);
    expect(back.bed!.x1 - back.bed!.x0).toBe(1850);
    const front = rnrBench('bench', 'Rear bench', cali, { ...params, frontX: 1820 }, flat);
    expect(front.bed!.x1 - front.bed!.x0).toBe(1950);
  });
  it('widens the mattress with bed flaps', () => {
    const beach = benchById('beach-1500')!;
    const m = rnrBench('bench', 'Rear bench', beach, { ...params, yCenter: 0, frontX: 1870 }, flat);
    const mattress = m.parts.find((p) => p.role === 'mattress')!.box;
    expect(mattress.max[1] - mattress.min[1]).toBe(1500);
    expect(mattress.max[2]).toBe(450);
  });
});
