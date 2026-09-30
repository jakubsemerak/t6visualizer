import { box } from '../geometry';
import type { BenchModel, BuildCtx, Part, PlacedModule } from '../types';

export const SEAT_Z = 450;
export const MATTRESS = 100;
export const BED_Z = 450;
export const SEAT_DEPTH = 550;
export const BACK_DEPTH = 100;
export const BACK_SPLIT_Z = 800;
export const BACK_TOP_Z = 1000;
export const INSET = 40;

/** A seat facing forward (−X) whose cushion front edge is at x0. */
export function benchSeat(x0: number, y0: number, y1: number): Part[] {
  const back0 = x0 + SEAT_DEPTH;
  const back1 = back0 + BACK_DEPTH;
  return [
    { role: 'frame', box: box(x0, back1, y0 + INSET, y1 - INSET, 0, SEAT_Z - MATTRESS) },
    { role: 'cushion', box: box(x0, back0, y0, y1, SEAT_Z - MATTRESS, SEAT_Z) },
    { role: 'backrest', box: box(back0, back1, y0, y1, SEAT_Z - MATTRESS, BACK_SPLIT_Z) },
    { role: 'backrest', box: box(back0, back1, y0 + INSET, y1 - INSET, BACK_SPLIT_Z, BACK_TOP_Z) },
  ];
}

export interface CabSeatsParams { passenger: 'doubleBench' | 'singleSwivel' }

export function cabSeats(id: string, p: CabSeatsParams, ctx: BuildCtx): PlacedModule {
  const x0 = ctx.van.cab.seatBackX - SEAT_DEPTH - BACK_DEPTH;
  const double = p.passenger === 'doubleBench';
  const seats = double ? 3 : 2;
  return {
    id,
    kind: 'cabSeats',
    label: double ? 'Driver + double passenger bench' : 'Driver + single swivel seat',
    parts: [...benchSeat(x0, -700, -150), ...(double ? benchSeat(x0, 50, 740) : benchSeat(x0, 150, 700))],
    seats,
    approvedSeats: seats,
    isRearSeat: false,
    removable: false,
    massKg: double ? 0 : 5,
    costEur: double ? [0, 0] : [600, 1200],
  };
}

export interface RnrBenchParams {
  model: string;
  frontX: number;
  yCenter: number;
  railRange: [number, number];
  railStep: number;
  removable: boolean;
}

export function rnrBench(id: string, label: string, m: BenchModel, p: RnrBenchParams, ctx: BuildCtx): PlacedModule {
  const y0 = p.yCenter - m.width / 2;
  const y1 = p.yCenter + m.width / 2;
  const bedWidth = m.bedWidth ?? m.width;
  const by0 = p.yCenter - bedWidth / 2;
  const by1 = p.yCenter + bedWidth / 2;
  const x0 = p.frontX;
  const bedLength = Math.min(m.bedLength, ctx.van.rearLimitX - x0);
  const seat = benchSeat(x0, y0, y1);
  const parts: Part[] = ctx.state === 'seated'
    ? seat
    : [seat[0], { role: 'mattress', box: box(x0, x0 + bedLength, by0, by1, BED_Z - MATTRESS, BED_Z) }];
  return {
    id,
    kind: 'rnrBench',
    label: `${label} (${m.name})`,
    parts,
    seats: m.seats,
    approvedSeats: m.approved ? m.seats : 0,
    isRearSeat: true,
    removable: p.removable,
    bed: { x0, x1: x0 + bedLength, y0: by0, y1: by1, z: BED_Z },
    massKg: m.massKg,
    costEur: m.costEur,
  };
}
