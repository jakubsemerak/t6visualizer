// Core data types. Units: millimetres. Frame: X rearward from the front-axle centre, Y positive to
// the right (sliding-door side), Z up from the cargo-floor top.

export type Vec3 = [number, number, number];
export interface Box { min: Vec3; max: Vec3 }
export type Side = 'left' | 'right';
/** [left wall Y (negative), right wall Y (positive)] */
export type YPair = [number, number];

/** Interior half-widths at one X station: near the floor (lowZ), at the belt line (beltZ), at the roof. */
export interface Section { x: number; low: YPair; belt: YPair; roof: YPair }

export interface WindowSpec { id: string; side: Side; x: [number, number]; z: [number, number] }

export interface Van {
  name: string;
  frame: string;
  wheelbase: number;
  overallLength: number;
  frontOverhang: number;
  bodyWidth: number;
  floorAboveRoad: number;
  cabFrontX: number;
  livingStartX: number;
  rearLimitX: number;
  lowZ: number;
  beltZ: number;
  interiorHeight: number;
  sections: Section[];
  arch: { x: [number, number]; height: number; innerHalf: number };
  slidingDoor: { x: [number, number]; height: number; side: Side };
  tailgate: { width: number; height: number };
  windows: WindowSpec[];
  cab: { seatBackX: number };
  popTop: { lift: number; x: [number, number]; bed: { length: number; width: number } };
  gvwKg: number;
  kerbKg: number;
  approx: string[];
  sources: Record<string, string>;
}

export type BedState = 'seated' | 'bed';
export type FridgeId = 'none' | 'coolbox' | 'compressor42';
export type ModuleKind =
  | 'cabSeats' | 'rnrBench' | 'factoryBench' | 'bedPlatform'
  | 'kitchenBlock' | 'wardrobe' | 'sideLocker' | 'boxKitchen' | 'popTopBed';
export type PartRole = 'cushion' | 'backrest' | 'mattress' | 'frame' | 'carcass' | 'counter';

export interface Part { role: PartRole; box: Box }
export interface BedRect { x0: number; x1: number; y0: number; y1: number; z: number }

export interface PlacedModule {
  id: string;
  kind: ModuleKind;
  label: string;
  parts: Part[];
  seats: number;
  approvedSeats: number;
  isRearSeat: boolean;
  removable: boolean;
  bed?: BedRect;
  roofBed?: BedRect;
  kitchen?: { counterLength: number; fridgeL: number; waterL: number };
  massKg: number;
  costEur: [number, number];
}

export interface BuildCtx { van: Van; state: BedState; popTop: boolean }

export interface BenchModel {
  id: string;
  name: string;
  width: number;
  bedWidth?: number;
  seats: number;
  bedLength: number;
  massKg: number;
  costEur: [number, number];
  approved: boolean;
  source: string;
}

export interface Fridge { id: FridgeId; name: string; litres: number; massKg: number; costEur: [number, number] }

export interface ModuleSpec { id: string; kind: ModuleKind; label: string; params: Record<string, unknown> }

export interface Preset {
  id: string;
  name: string;
  basedOn: string;
  summary: string;
  sources: string[];
  /** Mass of factory parts removed by the conversion (Mixto bench, partition). */
  removedKg: number;
  modules: ModuleSpec[];
}
