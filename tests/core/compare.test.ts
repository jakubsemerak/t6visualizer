import { describe, expect, it } from 'vitest';
import { bestMatch, compareAll, rankRows } from '../../src/core/compare';
import { VAN } from '../../src/core/data';
import { PRESETS } from '../../src/core/presets';

describe('compare', () => {
  it('ranks passing presets by bed width', () => {
    const ranked = rankRows(compareAll(VAN, PRESETS, {})).map((r) => r.preset.id);
    expect(ranked).toEqual(['beach', 'trio', 'singles', 'coast', 'budget']);
  });
  it('picks the best match', () => {
    expect(bestMatch(compareAll(VAN, PRESETS, {}))).toBe('beach');
  });
  it('applies tweaks only to the current preset', () => {
    const rows = compareAll(VAN, PRESETS, {}, { id: 'beach', overrides: { benchFrontX: 2170 } });
    expect(rows.find((r) => r.preset.id === 'beach')!.hard.bed).toBe(false);
    expect(bestMatch(rows)).toBe('trio');
  });
  it('marks the budget preset as failing', () => {
    const budget = compareAll(VAN, PRESETS, {}).find((r) => r.preset.id === 'budget')!;
    expect(budget.hard).toEqual({ seats: true, bed: false, removableRear: false });
    expect(budget.passesAll).toBe(false);
  });
});
