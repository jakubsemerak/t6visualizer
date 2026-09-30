import type { Layout } from '../core/layout';
import type { Metrics } from '../core/metrics';
import { downloadText } from '../plan/export';
import { renderPlanSvg } from '../plan/svg';
import { h } from './dom';

export function renderPlan(el: HTMLElement, layout: Layout, metrics: Metrics, scale: 10 | 20, onScale: (s: 10 | 20) => void): void {
  const svg = renderPlanSvg(layout, metrics, { scale, date: new Date().toISOString().slice(0, 10) });
  const holder = h('div', { class: 'plan-svg' });
  holder.innerHTML = svg;
  const file = `t61-${layout.preset.id}-${layout.state}${layout.popTop ? '-poptop' : ''}-1to${scale}.svg`;
  el.replaceChildren(
    h('div', { class: 'plan-bar' },
      h('label', {}, 'Scale ', h('select', { onchange: (e: Event) => onScale(Number((e.target as HTMLSelectElement).value) as 10 | 20) },
        h('option', { value: '10', selected: scale === 10 }, '1:10'),
        h('option', { value: '20', selected: scale === 20 }, '1:20'))),
      h('button', { class: 'primary', onclick: () => downloadText(svg, file) }, 'Export SVG'),
      h('span', { class: 'muted small' }, 'Prints at true scale at 100 %.')),
    holder,
  );
}
