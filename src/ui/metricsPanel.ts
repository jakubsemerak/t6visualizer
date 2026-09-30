import type { Check } from '../core/checks';
import type { Metrics } from '../core/metrics';
import { fmtBed, fmtEur, fmtMm, h } from './dom';

export function renderMetrics(el: HTMLElement, m: Metrics, checks: Check[]): void {
  const rows: [string, string][] = [
    ['Travel seats', `${m.seats}${m.approvedSeats < m.seats ? ` (${m.approvedSeats} approved)` : ''}`],
    ['Lower bed', fmtBed(m.bed)],
    ['Roof bed', fmtBed(m.roofBed)],
    ['Sleepers', String(m.sleepers)],
    ['Rear legroom', fmtMm(m.rearLegroom)],
    ['Counter', fmtMm(m.counterLength)],
    ['Fridge / water', `${m.fridgeL} L / ${m.waterL} L`],
    ['Boot (seated)', `${fmtMm(m.bootLength)} · ${m.bootVolumeL} L`],
    ['Standing height', fmtMm(m.standingHeight)],
    ['Conversion mass', `${m.conversionKg} kg (est.)`],
    ['Payload left, all seats', `${m.payloadLeftKg} kg`],
    ['Cost', `${fmtEur(m.costEur)} (est.)`],
  ];
  el.replaceChildren(
    h('h3', {}, 'Metrics'),
    h('dl', { class: 'metrics' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
    h('h3', {}, 'Checks'),
    checks.length
      ? h('ul', { class: 'checks' }, ...checks.map((c) => h('li', { class: `check ${c.level}` }, h('span', { class: 'lvl' }, c.level), c.message)))
      : h('p', { class: 'muted' }, 'No issues found.'),
    h('p', { class: 'muted small' }, 'Some body dimensions are scaled from VW drawings (marked approx in data/van.json). ± verify on your van.'),
  );
}
