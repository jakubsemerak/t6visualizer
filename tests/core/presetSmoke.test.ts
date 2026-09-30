import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/core/checks';
import { VAN } from '../../src/core/data';
import { PRESETS } from '../../src/core/presets';

const expected: Record<string, string[]> = {
  coast: ['BED_NARROW_PREF', 'HEADROOM'],
  beach: ['HEADROOM'],
  trio: ['HEADROOM'],
  singles: ['HEADROOM'],
  budget: ['BED_SHORT', 'HEADROOM', 'REAR_FIXED'],
};

describe('preset smoke test', () => {
  for (const p of PRESETS) {
    it(`${p.id}: only the expected checks`, () => {
      const checks = evaluate(VAN, p).checks;
      expect(checks.map((c) => c.code).sort(), checks.map((c) => c.message).join('\n')).toEqual(expected[p.id]);
    });
    it(`${p.id} with pop-top: no headroom note, nothing else new`, () => {
      const checks = evaluate(VAN, p, { popTop: true }).checks;
      expect(checks.map((c) => c.code).sort(), checks.map((c) => c.message).join('\n'))
        .toEqual(expected[p.id].filter((c) => c !== 'HEADROOM'));
    });
  }
});
