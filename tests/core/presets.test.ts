import { describe, expect, it } from 'vitest';
import { benchById } from '../../src/core/catalog';
import { PRESETS, presetById } from '../../src/core/presets';

describe('presets', () => {
  it('has five presets with unique ids', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['coast', 'beach', 'trio', 'singles', 'budget']);
  });
  it('gives every preset cab seats', () => {
    for (const p of PRESETS) expect(p.modules.some((m) => m.kind === 'cabSeats')).toBe(true);
  });
  it('references only known bench models', () => {
    for (const p of PRESETS) {
      for (const m of p.modules.filter((x) => x.kind === 'rnrBench')) {
        expect(benchById(m.params.model as string), `${p.id}/${m.id}`).toBeDefined();
      }
    }
  });
  it('throws on unknown ids', () => {
    expect(() => presetById('nope')).toThrow(/Unknown preset/);
  });
});
