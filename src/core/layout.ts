import { benchById, fridgeById } from './catalog';
import {
  bedPlatform, boxKitchen, factoryBench, kitchenBlock, popTopBed, sideLocker, wardrobe,
  type BoxKitchenParams, type FactoryBenchParams, type KitchenParams, type LockerParams, type PlatformParams,
  type WardrobeParams,
} from './modules/furniture';
import { cabSeats, rnrBench, type CabSeatsParams, type RnrBenchParams } from './modules/seating';
import type { BedState, BuildCtx, FridgeId, ModuleSpec, PlacedModule, Preset, Van } from './types';

export interface Overrides {
  state?: BedState;
  popTop?: boolean;
  passenger?: 'doubleBench' | 'singleSwivel';
  benchFrontX?: number;
  benchModel?: string;
  kitchenLength?: number;
  fridge?: FridgeId;
}

export interface Layout {
  van: Van;
  preset: Preset;
  state: BedState;
  popTop: boolean;
  modules: PlacedModule[];
  /** Human-readable notes about clamped or ignored overrides. */
  notes: string[];
}

export const KITCHEN_MIN_LENGTH = 600;

export function snapToRail(value: number, range: [number, number], step: number): number {
  const clamped = Math.min(range[1], Math.max(range[0], value));
  return range[0] + Math.round((clamped - range[0]) / step) * step;
}

export function benchSpecs(preset: Preset): ModuleSpec[] {
  return preset.modules.filter((m) => m.kind === 'rnrBench');
}

const params = <T>(spec: ModuleSpec): T => spec.params as unknown as T;

export function buildLayout(van: Van, preset: Preset, o: Overrides = {}): Layout {
  const state = o.state ?? 'seated';
  const popTop = o.popTop ?? false;
  const ctx: BuildCtx = { van, state, popTop };
  const notes = new Set<string>();
  const singleBench = benchSpecs(preset).length === 1;

  const modules = preset.modules.map((spec): PlacedModule => {
    switch (spec.kind) {
      case 'cabSeats': {
        const p = params<CabSeatsParams>(spec);
        return cabSeats(spec.id, { passenger: o.passenger ?? p.passenger }, ctx);
      }
      case 'rnrBench': {
        const p = params<RnrBenchParams>(spec);
        let frontX = p.frontX;
        if (o.benchFrontX !== undefined) {
          frontX = snapToRail(o.benchFrontX, p.railRange, p.railStep);
          if (frontX !== o.benchFrontX) notes.add(`Bench position ${o.benchFrontX} mm snapped to rail lock position ${frontX} mm`);
        }
        let model = benchById(p.model);
        if (singleBench && o.benchModel) {
          const chosen = benchById(o.benchModel);
          if (chosen) model = chosen;
          else notes.add(`Unknown bench model "${o.benchModel}", using ${p.model}`);
        }
        if (!model) throw new Error(`Preset ${preset.id} references unknown bench ${p.model}`);
        return rnrBench(spec.id, spec.label, model, { ...p, frontX }, ctx);
      }
      case 'factoryBench':
        return factoryBench(spec.id, spec.label, params<FactoryBenchParams>(spec), ctx);
      case 'bedPlatform':
        return bedPlatform(spec.id, spec.label, params<PlatformParams>(spec), ctx);
      case 'kitchenBlock': {
        const p = params<KitchenParams>(spec);
        let length = p.length;
        if (o.kitchenLength !== undefined) {
          length = Math.min(p.maxLength, Math.max(KITCHEN_MIN_LENGTH, Math.round(o.kitchenLength)));
          if (length !== o.kitchenLength) {
            notes.add(`Kitchen length limited to ${length} mm (range ${KITCHEN_MIN_LENGTH}–${p.maxLength})`);
          }
        }
        return kitchenBlock(spec.id, spec.label, { ...p, length }, fridgeById(o.fridge ?? p.fridge), ctx);
      }
      case 'boxKitchen': {
        const p = params<BoxKitchenParams>(spec);
        return boxKitchen(spec.id, spec.label, p, fridgeById(o.fridge ?? p.fridge), ctx);
      }
      case 'wardrobe':
        return wardrobe(spec.id, spec.label, params<WardrobeParams>(spec), ctx);
      case 'sideLocker':
        return sideLocker(spec.id, spec.label, params<LockerParams>(spec), ctx);
      case 'popTopBed':
        return popTopBed(spec.id, ctx);
    }
  });

  if (popTop) modules.push(popTopBed('poptop', ctx));
  return { van, preset, state, popTop, modules, notes: [...notes] };
}
