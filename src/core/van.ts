import type { Van } from './types';

const NUMBER_KEYS = [
  'wheelbase', 'overallLength', 'frontOverhang', 'bodyWidth', 'floorAboveRoad', 'cabFrontX',
  'livingStartX', 'rearLimitX', 'lowZ', 'beltZ', 'interiorHeight', 'gvwKg', 'kerbKg',
] as const;

/** Validates raw van.json and returns it typed. Throws with every problem listed. */
export function loadVan(raw: unknown): Van {
  const v = raw as Van;
  const errors: string[] = [];
  for (const k of NUMBER_KEYS) {
    const val = (v as unknown as Record<string, unknown>)[k];
    if (typeof val !== 'number' || !Number.isFinite(val)) errors.push(`${k} must be a number`);
  }
  if (!Array.isArray(v.sections) || v.sections.length < 2) {
    errors.push('sections needs at least 2 stations');
  } else {
    for (let i = 1; i < v.sections.length; i++) {
      if (v.sections[i].x <= v.sections[i - 1].x) errors.push(`sections must be sorted by x (index ${i})`);
    }
  }
  if (!(v.livingStartX < v.rearLimitX)) errors.push('livingStartX must be < rearLimitX');
  if (!(v.lowZ < v.beltZ && v.beltZ < v.interiorHeight)) errors.push('lowZ < beltZ < interiorHeight required');
  if (errors.length) throw new Error(`Invalid van data: ${errors.join('; ')}`);
  return v;
}

/** True when a value (e.g. "arch.x") was scaled from drawings and should be verified on the real van. */
export function isApprox(van: Van, key: string): boolean {
  return van.approx.some((a) => key === a || key.startsWith(`${a}.`));
}
