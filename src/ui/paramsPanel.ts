import { BENCHES, FRIDGES } from '../core/catalog';
import { benchSpecs, KITCHEN_MIN_LENGTH, type Overrides } from '../core/layout';
import type { KitchenParams } from '../core/modules/furniture';
import type { RnrBenchParams } from '../core/modules/seating';
import type { BedState, FridgeId, Preset } from '../core/types';
import { h } from './dom';

export interface ParamsHandlers {
  onChange: (patch: Partial<Overrides>, live?: boolean) => void;
  onReset: () => void;
}

export function renderParams(el: HTMLElement, preset: Preset, o: Overrides, notes: string[], hnd: ParamsHandlers): void {
  const seg = (label: string, options: [string, string][], value: string, pick: (v: string) => void) =>
    h('div', { class: 'field' }, h('span', { class: 'label' }, label),
      h('div', { class: 'seg', role: 'group', 'aria-label': label }, ...options.map(([v, text]) =>
        h('button', { class: v === value ? 'on' : '', 'aria-pressed': String(v === value), onclick: () => pick(v) }, text))));

  const slider = (label: string, min: number, max: number, step: number, value: number, set: (n: number) => Partial<Overrides>) => {
    const out = h('output', {}, `${value} mm`);
    return h('label', { class: 'field' }, h('span', { class: 'label' }, label, ' ', out),
      h('input', {
        type: 'range', min: String(min), max: String(max), step: String(step), value: String(value),
        oninput: (e: Event) => {
          const n = Number((e.target as HTMLInputElement).value);
          out.textContent = `${n} mm`;
          hnd.onChange(set(n), true);
        },
        onchange: (e: Event) => hnd.onChange(set(Number((e.target as HTMLInputElement).value))),
      }));
  };

  const rows: HTMLElement[] = [
    h('h2', {}, preset.name),
    h('p', { class: 'muted small' }, preset.summary),
    seg('Mode', [['seated', 'Seated'], ['bed', 'Bed']], o.state ?? 'seated', (v) => hnd.onChange({ state: v as BedState })),
    seg('Roof', [['0', 'Fixed'], ['1', 'Pop-top']], o.popTop ? '1' : '0', (v) => hnd.onChange({ popTop: v === '1' })),
  ];
  const cab = preset.modules.find((m) => m.kind === 'cabSeats');
  const passenger = o.passenger ?? (cab?.params.passenger as string) ?? 'doubleBench';
  rows.push(seg('Front passenger', [['doubleBench', 'Double bench'], ['singleSwivel', 'Single swivel']], passenger,
    (v) => hnd.onChange({ passenger: v as Overrides['passenger'] })));

  const benches = benchSpecs(preset);
  if (benches.length) {
    const p = benches[0].params as unknown as RnrBenchParams;
    rows.push(slider('Bench position', p.railRange[0], p.railRange[1], p.railStep, o.benchFrontX ?? p.frontX, (n) => ({ benchFrontX: n })));
  }
  if (benches.length === 1) {
    const current = o.benchModel ?? (benches[0].params.model as string);
    rows.push(h('label', { class: 'field' }, h('span', { class: 'label' }, 'Bench model'),
      h('select', { onchange: (e: Event) => hnd.onChange({ benchModel: (e.target as HTMLSelectElement).value }) },
        ...BENCHES.filter((b) => b.seats >= 2).map((b) =>
          h('option', { value: b.id, selected: b.id === current }, `${b.name} (${b.width} mm, ${b.seats} seats)`)))));
  }
  const kitchen = preset.modules.find((m) => m.kind === 'kitchenBlock');
  if (kitchen) {
    const p = kitchen.params as unknown as KitchenParams;
    rows.push(slider('Kitchen length', KITCHEN_MIN_LENGTH, p.maxLength, 10, o.kitchenLength ?? p.length, (n) => ({ kitchenLength: n })));
  }
  const fridgeHost = preset.modules.find((m) => m.kind === 'kitchenBlock' || m.kind === 'boxKitchen');
  if (fridgeHost) {
    const current = o.fridge ?? (fridgeHost.params.fridge as FridgeId);
    rows.push(h('label', { class: 'field' }, h('span', { class: 'label' }, 'Fridge'),
      h('select', { onchange: (e: Event) => hnd.onChange({ fridge: (e.target as HTMLSelectElement).value as FridgeId }) },
        ...FRIDGES.map((f) => h('option', { value: f.id, selected: f.id === current }, f.name)))));
  }
  if (notes.length) rows.push(h('ul', { class: 'notes' }, ...notes.map((n) => h('li', {}, n))));
  rows.push(h('button', { class: 'ghost', onclick: () => hnd.onReset() }, 'Reset tweaks'));
  el.replaceChildren(...rows);
}
