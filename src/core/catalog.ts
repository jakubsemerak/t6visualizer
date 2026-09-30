import benchesJson from '../../data/modules/benches.json';
import fridgesJson from '../../data/modules/fridges.json';
import type { BenchModel, Fridge, FridgeId } from './types';

export const BENCHES = benchesJson as BenchModel[];
export const FRIDGES = fridgesJson as Fridge[];

export function benchById(id: string): BenchModel | undefined {
  return BENCHES.find((b) => b.id === id);
}

export function fridgeById(id: FridgeId): Fridge {
  const f = FRIDGES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown fridge ${id}`);
  return f;
}
