type Child = Node | string | null | undefined | false;

/** Tiny element factory: props starting with "on" become listeners, non-string values become properties. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Record<string, unknown> = {}, ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (typeof v !== 'string' && k in el) (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const fmtMm = (n: number | null | undefined): string => (n === null || n === undefined ? '–' : `${Math.round(n)} mm`);
export const fmtBed = (b: { length: number; width: number } | null): string => (b ? `${b.length} × ${b.width}` : '–');
export const fmtEur = (r: [number, number]): string =>
  `€${(r[0] / 1000).toFixed(1)}k – €${(r[1] / 1000).toFixed(1)}k`;
