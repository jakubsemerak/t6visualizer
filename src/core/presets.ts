import beach from '../../data/presets/beach.json';
import budget from '../../data/presets/budget.json';
import coast from '../../data/presets/coast.json';
import singles from '../../data/presets/singles.json';
import trio from '../../data/presets/trio.json';
import type { Preset } from './types';

export const PRESETS: Preset[] = [coast, beach, trio, singles, budget] as unknown as Preset[];

export function presetById(id: string): Preset {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset ${id}`);
  return p;
}
