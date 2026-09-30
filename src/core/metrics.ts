import { overlap1d } from './geometry';
import type { Layout } from './layout';
import type { BedRect, Box, PlacedModule, Van } from './types';

export const PERSON_KG = 75;
export const GRID = 50;
export const BED_MERGE_GAP = 40;

export interface BedSize { length: number; width: number }

export interface Metrics {
  seats: number;
  approvedSeats: number;
  rearSeatsRemovable: boolean;
  bed: BedSize | null;
  bedRect: BedRect | null;
  roofBed: BedSize | null;
  sleepers: number;
  rearLegroom: number | null;
  counterLength: number;
  fridgeL: number;
  waterL: number;
  bootLength: number;
  bootVolumeL: number;
  standingHeight: number;
  conversionKg: number;
  payloadLeftKg: number;
  costEur: [number, number];
}

const area = (r: BedRect) => (r.x1 - r.x0) * (r.y1 - r.y0);

export function combinedBed(beds: BedRect[]): BedRect | null {
  if (!beds.length) return null;
  const sorted = [...beds].sort((a, b) => a.y0 - b.y0);
  const groups: BedRect[] = [];
  for (const b of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g.z - b.z) < 1 && b.y0 - g.y1 <= BED_MERGE_GAP && overlap1d(g.x0, g.x1, b.x0, b.x1) > 0) {
      groups[groups.length - 1] = {
        x0: Math.max(g.x0, b.x0), x1: Math.min(g.x1, b.x1), y0: g.y0, y1: Math.max(g.y1, b.y1), z: g.z,
      };
    } else {
      groups.push({ ...b });
    }
  }
  return groups.reduce((best, r) => (area(r) > area(best) ? r : best));
}

export function bedSize(r: BedRect | null): BedSize | null {
  return r ? { length: Math.round(r.x1 - r.x0), width: Math.round(r.y1 - r.y0) } : null;
}

/** Free volume in litres between the wheel arches from x0 to x1, floor to ceiling. */
export function freeVolumeL(van: Van, boxes: Box[], x0: number, x1: number): number {
  const half = van.arch.innerHalf;
  const relevant = boxes.filter((b) => b.max[0] > x0 && b.min[0] < x1);
  let free = 0;
  for (let x = x0 + GRID / 2; x < x1; x += GRID) {
    for (let y = -half + GRID / 2; y < half; y += GRID) {
      for (let z = GRID / 2; z < van.interiorHeight; z += GRID) {
        const hit = relevant.some((b) =>
          x >= b.min[0] && x <= b.max[0] && y >= b.min[1] && y <= b.max[1] && z >= b.min[2] && z <= b.max[2]);
        if (!hit) free++;
      }
    }
  }
  return Math.round((free * GRID ** 3) / 1e6);
}

const minX = (m: PlacedModule) => Math.min(...m.parts.map((p) => p.box.min[0]));
const maxX = (m: PlacedModule) => Math.max(...m.parts.map((p) => p.box.max[0]));
const sum = (ms: PlacedModule[], f: (m: PlacedModule) => number) => ms.reduce((s, m) => s + f(m), 0);

/** Seated-state layout gives seats, legroom and boot; bed-state layout gives the beds. */
export function computeMetrics(seated: Layout, bedLayout: Layout): Metrics {
  const { van } = seated;
  const mods = seated.modules;
  const rear = mods.filter((m) => m.isRearSeat);
  const seats = sum(mods, (m) => m.seats);
  const bedRect = combinedBed(bedLayout.modules.flatMap((m) => (m.bed ? [m.bed] : [])));
  const bed = bedSize(bedRect);
  const roofBed = bedSize(bedLayout.modules.find((m) => m.roofBed)?.roofBed ?? null);
  const bootX0 = rear.length ? Math.max(...rear.map(maxX)) : van.livingStartX;
  const boxes = mods.filter((m) => m.kind !== 'popTopBed').flatMap((m) => m.parts.map((p) => p.box));
  const kitchens = mods.flatMap((m) => (m.kitchen ? [m.kitchen] : []));
  const conversionKg = sum(mods, (m) => m.massKg) - seated.preset.removedKg;
  return {
    seats,
    approvedSeats: sum(mods, (m) => m.approvedSeats),
    rearSeatsRemovable: rear.length > 0 && rear.every((m) => m.removable),
    bed,
    bedRect,
    roofBed,
    sleepers: (bed ? (bed.width >= 1100 ? 2 : 1) : 0) + (roofBed ? 2 : 0),
    rearLegroom: rear.length ? Math.min(...rear.map(minX)) - van.cab.seatBackX : null,
    counterLength: kitchens.reduce((s, k) => s + k.counterLength, 0),
    fridgeL: kitchens.reduce((s, k) => s + k.fridgeL, 0),
    waterL: kitchens.reduce((s, k) => s + k.waterL, 0),
    bootLength: Math.max(0, van.rearLimitX - bootX0),
    bootVolumeL: freeVolumeL(van, boxes, bootX0, van.rearLimitX),
    standingHeight: seated.popTop ? van.interiorHeight + van.popTop.lift : van.interiorHeight,
    conversionKg,
    payloadLeftKg: van.gvwKg - van.kerbKg - conversionKg - seats * PERSON_KG,
    costEur: [sum(mods, (m) => m.costEur[0]), sum(mods, (m) => m.costEur[1])],
  };
}
