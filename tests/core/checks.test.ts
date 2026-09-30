import { describe, expect, it } from 'vitest';
import { doorGap, evaluate, metricChecks } from '../../src/core/checks';
import { VAN } from '../../src/core/data';
import { buildLayout } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';

const codes = (id: string, o = {}) => evaluate(VAN, presetById(id), o).checks.map((c) => c.code);

describe('checks', () => {
  it('measures the sliding-door step-in gap', () => {
    expect(doorGap(buildLayout(VAN, presetById('coast')))).toBe(490);
  });
  it('warns when the bench blocks the sliding door', () => {
    expect(codes('coast', { benchFrontX: 1620 })).toContain('DOOR');
  });
  it('reports a seat standing over the wheel arch', () => {
    expect(codes('coast', { benchFrontX: 2220 })).toContain('SEAT_ON_ARCH');
  });
  it('reports colliding modules', () => {
    const ev = evaluate(VAN, presetById('singles'), { kitchenLength: 1100 });
    const c = ev.checks.find((x) => x.code === 'COLLISION')!;
    expect(c.moduleIds).toEqual(['kitchen', 'locker']);
  });
  it('flags a short bed', () => {
    const ev = evaluate(VAN, presetById('budget'));
    expect(metricChecks(ev.metrics).map((c) => c.code)).toContain('BED_SHORT');
  });
  it('orders errors before warnings before info', () => {
    const levels = evaluate(VAN, presetById('budget')).checks.map((c) => c.level);
    expect(levels).toEqual([...levels].sort((a, b) => ['error', 'warn', 'info'].indexOf(a) - ['error', 'warn', 'info'].indexOf(b)));
  });
});
