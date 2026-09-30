import { evaluate, MIN_BED_LENGTH, MIN_BED_WIDTH, MIN_TRAVEL_SEATS, type Check } from './checks';
import type { Overrides } from './layout';
import type { Metrics } from './metrics';
import type { Preset, Van } from './types';

export interface HardRequirements { seats: boolean; bed: boolean; removableRear: boolean }

export interface CompareRow {
  preset: Preset;
  metrics: Metrics;
  checks: Check[];
  hard: HardRequirements;
  passesAll: boolean;
  errors: number;
}

export type GlobalOverrides = Pick<Overrides, 'popTop' | 'passenger'>;

/** Evaluates every preset with the global overrides; the current preset also gets its own tweaks. */
export function compareAll(
  van: Van, presets: Preset[], global: GlobalOverrides, current?: { id: string; overrides: Overrides },
): CompareRow[] {
  return presets.map((preset) => {
    const o = current && current.id === preset.id ? { ...current.overrides, ...global } : { ...global };
    const { metrics, checks } = evaluate(van, preset, o);
    const hard: HardRequirements = {
      seats: metrics.seats >= MIN_TRAVEL_SEATS,
      bed: !!metrics.bed && metrics.bed.length >= MIN_BED_LENGTH && metrics.bed.width >= MIN_BED_WIDTH,
      removableRear: metrics.rearSeatsRemovable,
    };
    const errors = checks.filter((c) => c.level === 'error').length;
    return { preset, metrics, checks, hard, errors, passesAll: hard.seats && hard.bed && hard.removableRear && errors === 0 };
  });
}

export function rankRows(rows: CompareRow[]): CompareRow[] {
  return [...rows].sort((a, b) =>
    Number(b.passesAll) - Number(a.passesAll) ||
    (b.metrics.bed?.width ?? 0) - (a.metrics.bed?.width ?? 0) ||
    b.metrics.bootLength - a.metrics.bootLength);
}

export function bestMatch(rows: CompareRow[]): string | null {
  const top = rankRows(rows)[0];
  return top && top.passesAll ? top.preset.id : null;
}
