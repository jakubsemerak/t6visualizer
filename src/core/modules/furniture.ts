import { wallInner } from '../body';
import { box } from '../geometry';
import type { Box, BuildCtx, Fridge, FridgeId, ModuleKind, Part, PartRole, PlacedModule, Side, Van } from '../types';
import { BACK_DEPTH, MATTRESS, SEAT_DEPTH, SEAT_Z, benchSeat } from './seating';

export const WALL_GAP = 5;
export const ARCH_CLEARANCE = 10;
export const PLATFORM_Z = 650;

/** Splits a box so no part sits inside a wheel arch; the middle part is lifted above the arch. */
export function aroundArch(van: Van, b: Box): Box[] {
  const [ax0, ax1] = van.arch.x;
  const top = van.arch.height + ARCH_CLEARANCE;
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  const reachesArch = y0 < -van.arch.innerHalf || y1 > van.arch.innerHalf;
  if (!reachesArch || x1 <= ax0 || x0 >= ax1 || z0 >= top) return [b];
  const out: Box[] = [];
  if (x0 < ax0) out.push(box(x0, ax0, y0, y1, z0, z1));
  if (z1 > top) out.push(box(Math.max(x0, ax0), Math.min(x1, ax1), y0, y1, top, z1));
  if (x1 > ax1) out.push(box(ax1, x1, y0, y1, z0, z1));
  return out;
}

const partsOf = (van: Van, role: PartRole, b: Box): Part[] => aroundArch(van, b).map((bx) => ({ role, box: bx }));

function againstWall(ctx: BuildCtx, x0: number, x1: number, zTop: number, side: Side, depth: number): [number, number] {
  const wall = wallInner(ctx.van, x0, x1, 0, zTop, side);
  return side === 'left'
    ? [wall + WALL_GAP, wall + WALL_GAP + depth]
    : [wall - WALL_GAP - depth, wall - WALL_GAP];
}

function furniture(
  id: string, kind: ModuleKind, label: string, parts: Part[], massKg: number, costEur: [number, number],
): PlacedModule {
  return { id, kind, label, parts, seats: 0, approvedSeats: 0, isRearSeat: false, removable: false, massKg, costEur };
}

export interface KitchenParams {
  x0: number; length: number; maxLength: number; depth: number; height: number; side: Side; fridge: FridgeId; waterL: number;
}

export function kitchenBlock(id: string, label: string, p: KitchenParams, fridge: Fridge, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const [y0, y1] = againstWall(ctx, p.x0, x1, p.height, p.side, p.depth);
  // Estimates: carcass ≈ 50 kg/m plus fridge and full water tank; €1.5–3k per metre plus fridge.
  const m = furniture(id, 'kitchenBlock', label, [
    ...partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height - 30)),
    ...partsOf(ctx.van, 'counter', box(p.x0, x1, y0, y1, p.height - 30, p.height)),
  ], Math.round(p.length * 0.05) + fridge.massKg + p.waterL,
  [Math.round(p.length * 1.5) + fridge.costEur[0], Math.round(p.length * 3) + fridge.costEur[1]]);
  m.kitchen = { counterLength: p.length, fridgeL: fridge.litres, waterL: p.waterL };
  return m;
}

export interface WardrobeParams { x0: number; length: number; depth: number; height: number; side: Side }

export function wardrobe(id: string, label: string, p: WardrobeParams, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const [y0, y1] = againstWall(ctx, p.x0, x1, p.height, p.side, p.depth);
  return furniture(id, 'wardrobe', label, partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height)),
    Math.round(p.length * 0.03), [Math.round(p.length * 1.2), Math.round(p.length * 2.5)]);
}

/** innerY: absolute Y of the locker's inner face. */
export interface LockerParams { x0: number; length: number; height: number; side: Side; innerY: number }

export function sideLocker(id: string, label: string, p: LockerParams, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const wall = wallInner(ctx.van, p.x0, x1, 0, p.height, p.side);
  const [y0, y1] = p.side === 'left' ? [wall + WALL_GAP, -p.innerY] : [p.innerY, wall - WALL_GAP];
  return furniture(id, 'sideLocker', label, partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height)),
    Math.round(p.length * 0.015), [Math.round(p.length * 0.4), Math.round(p.length * 0.9)]);
}

export interface BoxKitchenParams {
  x0: number; length: number; width: number; height: number; yCenter: number; fridge: FridgeId; waterL: number;
}

export function boxKitchen(id: string, label: string, p: BoxKitchenParams, fridge: Fridge, _ctx: BuildCtx): PlacedModule {
  const m = furniture(id, 'boxKitchen', label, [{
    role: 'carcass',
    box: box(p.x0, p.x0 + p.length, p.yCenter - p.width / 2, p.yCenter + p.width / 2, 0, p.height),
  }], 15 + fridge.massKg + p.waterL, [400 + fridge.costEur[0], 900 + fridge.costEur[1]]);
  m.removable = true;
  m.kitchen = { counterLength: p.length, fridgeL: fridge.litres, waterL: p.waterL };
  return m;
}

export interface FactoryBenchParams { frontX: number; width: number }

export function factoryBench(id: string, label: string, p: FactoryBenchParams, ctx: BuildCtx): PlacedModule {
  const y0 = -p.width / 2;
  const y1 = p.width / 2;
  const seat = benchSeat(p.frontX, y0, y1);
  const parts: Part[] = ctx.state === 'seated'
    ? seat
    // Bed mode: the backrest folds forward onto the cushion.
    : [seat[0], seat[1], { role: 'backrest', box: box(p.frontX, p.frontX + SEAT_DEPTH, y0, y1, SEAT_Z, SEAT_Z + MATTRESS) }];
  return {
    id, kind: 'factoryBench', label, parts, seats: 3, approvedSeats: 3, isRearSeat: true, removable: false,
    massKg: 0, costEur: [0, 0],
  };
}

export interface PlatformParams { x0: number; nominalLength: number; width: number }

/** Bed kit over the factory bench: fixed storage box behind the bench, top extends over the folded bench. */
export function bedPlatform(id: string, label: string, p: PlatformParams, ctx: BuildCtx): PlacedModule {
  const { van } = ctx;
  const length = Math.min(p.nominalLength, van.rearLimitX - p.x0);
  const half = p.width / 2;
  const boxHalf = Math.min(half - 60, van.arch.innerHalf - ARCH_CLEARANCE);
  const boxX0 = p.x0 + SEAT_DEPTH + BACK_DEPTH;
  const x1 = p.x0 + length;
  const m = furniture(id, 'bedPlatform', label, [
    { role: 'carcass', box: box(boxX0, x1, -boxHalf, boxHalf, 0, PLATFORM_Z - MATTRESS) },
    { role: 'mattress', box: box(ctx.state === 'bed' ? p.x0 : boxX0, x1, -half, half, PLATFORM_Z - MATTRESS, PLATFORM_Z) },
  ], 35, [1600, 2200]);
  m.bed = { x0: p.x0, x1, y0: -half, y1: half, z: PLATFORM_Z };
  return m;
}

export function popTopBed(id: string, ctx: BuildCtx): PlacedModule {
  const { x, bed } = ctx.van.popTop;
  const H = ctx.van.interiorHeight;
  const x0 = x[1] - bed.length;
  const y0 = -bed.width / 2;
  const y1 = bed.width / 2;
  const m = furniture(id, 'popTopBed', 'Pop-top roof bed',
    [{ role: 'mattress', box: box(x0, x[1], y0, y1, H + 20, H + 100) }], 75, [4500, 7500]);
  m.roofBed = { x0, x1: x[1], y0, y1, z: H + 100 };
  return m;
}
