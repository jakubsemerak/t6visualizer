import type { CompareRow } from '../core/compare';
import { fmtBed, fmtEur, fmtMm, h } from './dom';

const COLUMNS: [string, (r: CompareRow) => string][] = [
  ['Seats', (r) => String(r.metrics.seats)],
  ['Lower bed', (r) => fmtBed(r.metrics.bed)],
  ['Sleepers', (r) => String(r.metrics.sleepers)],
  ['Rear legroom', (r) => fmtMm(r.metrics.rearLegroom)],
  ['Counter', (r) => fmtMm(r.metrics.counterLength)],
  ['Fridge', (r) => `${r.metrics.fridgeL} L`],
  ['Water', (r) => `${r.metrics.waterL} L`],
  ['Boot', (r) => `${r.metrics.bootLength} mm · ${r.metrics.bootVolumeL} L`],
  ['Standing', (r) => fmtMm(r.metrics.standingHeight)],
  ['Payload left', (r) => `${r.metrics.payloadLeftKg} kg`],
  ['Cost (est.)', (r) => fmtEur(r.metrics.costEur)],
  ['Seats · bed · removable', (r) => [r.hard.seats, r.hard.bed, r.hard.removableRear].map((ok) => (ok ? '✓' : '✗')).join(' ')],
  ['Errors', (r) => String(r.errors)],
];

export function renderCompare(el: HTMLElement, rows: CompareRow[], best: string | null, onSelect: (id: string) => void): void {
  el.replaceChildren(
    h('p', { class: 'muted' }, 'Hard requirements: 5+ travel seats · bed ≥ 1950 × 1120 for two 187 cm sleepers · removable rear seats. Ranked by pass, then bed width, then boot length.'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'compare' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Conversion'), ...COLUMNS.map(([c]) => h('th', {}, c)))),
      h('tbody', {}, ...rows.map((r) => h('tr', { class: r.passesAll ? 'pass' : 'fail' },
        h('th', {}, h('button', { class: 'link', onclick: () => onSelect(r.preset.id) }, r.preset.name),
          r.preset.id === best ? h('span', { class: 'pill best' }, 'Best match') : null),
        ...COLUMNS.map(([, f]) => h('td', {}, f(r)))))))),
  );
}
