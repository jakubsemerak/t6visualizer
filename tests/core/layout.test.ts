import { describe, expect, it } from 'vitest';
import { VAN } from '../../src/core/data';
import { buildLayout, snapToRail } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';

const coast = presetById('coast');
const bench = (l: ReturnType<typeof buildLayout>, id = 'bench') => l.modules.find((m) => m.id === id)!;

describe('snapToRail', () => {
  it('clamps and snaps to lock positions', () => {
    expect(snapToRail(1955, [1620, 2220], 100)).toBe(1920);
    expect(snapToRail(5000, [1620, 2220], 100)).toBe(2220);
    expect(snapToRail(0, [1620, 2220], 100)).toBe(1620);
  });
});

describe('buildLayout', () => {
  it('builds the default coast layout', () => {
    const l = buildLayout(VAN, coast);
    expect(l.state).toBe('seated');
    expect(l.modules.map((m) => m.id)).toEqual(['cab', 'kitchen', 'wardrobe', 'bench']);
    expect(bench(l).bed!.x0).toBe(1920);
    expect(l.notes).toEqual([]);
  });

  it('snaps an off-rail bench position and says so', () => {
    const l = buildLayout(VAN, coast, { benchFrontX: 1955 });
    expect(bench(l).bed!.x0).toBe(1920);
    expect(l.notes[0]).toMatch(/snapped/);
  });

  it('limits the kitchen length', () => {
    const l = buildLayout(VAN, coast, { kitchenLength: 2000 });
    expect(l.modules.find((m) => m.id === 'kitchen')!.kitchen!.counterLength).toBe(1430);
    expect(l.notes[0]).toMatch(/Kitchen length limited/);
  });

  it('adds the roof bed when the pop-top is on', () => {
    const l = buildLayout(VAN, coast, { popTop: true });
    expect(l.modules.some((m) => m.kind === 'popTopBed')).toBe(true);
  });

  it('swaps the front passenger seat', () => {
    expect(buildLayout(VAN, coast, { passenger: 'singleSwivel' }).modules[0].seats).toBe(2);
  });

  it('swaps the bench model only when the preset has one bench', () => {
    const l = buildLayout(VAN, coast, { benchModel: 'rib-1200' });
    expect(bench(l).bed!.y1 - bench(l).bed!.y0).toBe(1200);
    const singles = buildLayout(VAN, presetById('singles'), { benchModel: 'rib-1200' });
    expect(bench(singles, 'seatL').bed!.y1 - bench(singles, 'seatL').bed!.y0).toBe(600);
  });

  it('keeps the preset bench for an unknown model', () => {
    const l = buildLayout(VAN, coast, { benchModel: 'nope' });
    expect(bench(l).seats).toBe(2);
    expect(l.notes[0]).toMatch(/Unknown bench model/);
  });

  it('switches fridge in every kitchen', () => {
    const l = buildLayout(VAN, presetById('beach'), { fridge: 'compressor42' });
    expect(l.modules.find((m) => m.id === 'boxKitchen')!.kitchen!.fridgeL).toBe(42);
  });
});
