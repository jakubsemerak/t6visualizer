import type { CompareRow } from '../core/compare';
import { fmtBed, h } from './dom';

export function renderPresetList(
  el: HTMLElement, rows: CompareRow[], selectedId: string, best: string | null, onSelect: (id: string) => void,
): void {
  const pill = (ok: boolean, label: string) => h('span', { class: ok ? 'pill ok' : 'pill bad' }, `${ok ? '✓' : '✗'} ${label}`);
  el.replaceChildren(
    h('h2', { class: 'side-title' }, 'Conversions'),
    ...rows.map((r) => {
      const m = r.metrics;
      const selected = r.preset.id === selectedId;
      return h('button', {
        class: `preset-card${selected ? ' selected' : ''}`,
        'aria-pressed': String(selected),
        onclick: () => onSelect(r.preset.id),
      },
      h('div', { class: 'card-head' }, h('strong', {}, r.preset.name), r.preset.id === best ? h('span', { class: 'pill best' }, 'Best match') : null),
      h('div', { class: 'muted small' }, r.preset.basedOn),
      h('div', { class: 'card-stats' }, `${m.seats} seats · bed ${fmtBed(m.bed)} · sleeps ${m.sleepers}`),
      h('div', { class: 'pills' }, pill(r.hard.seats, '5+ seats'), pill(r.hard.bed, '2 × 187 cm'), pill(r.hard.removableRear, 'removable rear')));
    }),
  );
}
