import type { Layout } from '../core/layout';
import type { Metrics } from '../core/metrics';
import type { ModuleKind } from '../core/types';

export interface PlanOptions { scale: 10 | 20; date: string }

const MARGIN = 250;
const INK = '#222';
const FILL: Record<ModuleKind, string> = {
  cabSeats: '#cecbf6', rnrBench: '#9fe1cb', factoryBench: '#9fe1cb', bedPlatform: '#fac775',
  kitchenBlock: '#f5c4b3', boxKitchen: '#f5c4b3', wardrobe: '#d3d1c7', sideLocker: '#d3d1c7', popTopBed: '#b5d4f4',
};

const f = (n: number) => String(Math.round(n * 10) / 10);

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderPlanSvg(layout: Layout, m: Metrics, opts: PlanOptions): string {
  const { van, popTop } = layout;
  const k = opts.scale;
  const font = 3 * k;
  const thin = 0.18 * k;
  const bold = 0.5 * k;
  const rearOverhang = van.overallLength - van.frontOverhang - van.wheelbase;
  const W = van.bodyWidth;
  const ceiling = van.interiorHeight + (popTop ? van.popTop.lift : 0);

  const topY0 = MARGIN + font * 6;
  const tx = (x: number) => MARGIN + van.frontOverhang + x;
  const ty = (y: number) => topY0 + W / 2 - y;
  const sideY0 = topY0 + W + font * 14;
  const sz = (z: number) => sideY0 + ceiling - z;
  const titleY = sz(-van.floorAboveRoad) + font * 5;
  const sheetW = van.overallLength + 2 * MARGIN;
  const sheetH = titleY + font * 7 + MARGIN;

  const out: string[] = [];
  const dash = ` stroke-dasharray="${f(2 * k)} ${f(1.5 * k)}"`;
  const line = (x1: number, y1: number, x2: number, y2: number, w = thin, extra = '') =>
    out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${INK}" stroke-width="${f(w)}"${extra}/>`);
  const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
    out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${INK}" stroke-width="${f(thin)}"${extra}/>`);
  const text = (x: number, y: number, s: string, anchor = 'middle', size = font, extra = '') =>
    out.push(`<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" text-anchor="${anchor}" font-family="Helvetica, Arial, sans-serif" fill="${INK}"${extra}>${escapeXml(s)}</text>`);
  const tick = (x: number, y: number) => line(x - font * 0.3, y + font * 0.3, x + font * 0.3, y - font * 0.3, thin * 2);
  const dimH = (x1: number, x2: number, y: number, label: string) => {
    line(x1, y - font * 0.8, x1, y + font * 0.4);
    line(x2, y - font * 0.8, x2, y + font * 0.4);
    line(x1, y, x2, y);
    tick(x1, y);
    tick(x2, y);
    text((x1 + x2) / 2, y - font * 0.4, label);
  };
  const dimV = (y1: number, y2: number, x: number, label: string) => {
    line(x - font * 0.4, y1, x + font * 0.8, y1);
    line(x - font * 0.4, y2, x + font * 0.8, y2);
    line(x, y1, x, y2);
    tick(x, y1);
    tick(x, y2);
    const cy = (y1 + y2) / 2;
    text(x - font * 0.4, cy, label, 'middle', font, ` transform="rotate(-90 ${f(x - font * 0.4)} ${f(cy)})"`);
  };

  // ---- Top view ----
  text(MARGIN, topY0 - font * 4, 'Top view (front left, sliding-door side top)', 'start', font * 1.2);
  rect(tx(-van.frontOverhang), ty(W / 2), van.overallLength, W, 'none', dash);
  dimH(tx(-van.frontOverhang), tx(van.wheelbase + rearOverhang), topY0 - font * 1.5, `overall ${van.overallLength}`);
  const belt = [
    ...van.sections.map((s) => `${f(tx(s.x))},${f(ty(s.belt[1]))}`),
    ...[...van.sections].reverse().map((s) => `${f(tx(s.x))},${f(ty(s.belt[0]))}`),
  ].join(' ');
  out.push(`<polygon points="${belt}" fill="#f7f7f5" stroke="${INK}" stroke-width="${f(bold)}"/>`);
  for (const x of [0, van.wheelbase]) line(tx(x), ty(W / 2), tx(x), ty(-W / 2), thin, dash);
  const [ax0, ax1] = van.arch.x;
  rect(tx(ax0), ty(van.sections[1].low[1]), ax1 - ax0, van.sections[1].low[1] - van.arch.innerHalf, '#e2e0d8');
  rect(tx(ax0), ty(-van.arch.innerHalf), ax1 - ax0, van.sections[1].low[1] - van.arch.innerHalf, '#e2e0d8');
  const [d0, d1] = van.slidingDoor.x;
  const doorY = van.slidingDoor.side === 'right' ? ty(W / 2) : ty(-W / 2);
  out.push(`<line x1="${f(tx(d0))}" y1="${f(doorY)}" x2="${f(tx(d1))}" y2="${f(doorY)}" stroke="#378ADD" stroke-width="${f(bold * 3)}"/>`);
  text(tx((d0 + d1) / 2), doorY - font * 0.6, `sliding door ${d1 - d0}`);

  for (const mod of layout.modules) {
    const fill = FILL[mod.kind];
    for (const p of mod.parts) {
      const b = p.box;
      rect(tx(b.min[0]), ty(b.max[1]), b.max[0] - b.min[0], b.max[1] - b.min[1], fill,
        mod.kind === 'popTopBed' ? `${dash} fill-opacity="0.35"` : ' fill-opacity="0.85"');
    }
  }
  if (m.bedRect) {
    const r = m.bedRect;
    out.push(`<rect x="${f(tx(r.x0))}" y="${f(ty(r.y1))}" width="${f(r.x1 - r.x0)}" height="${f(r.y1 - r.y0)}" fill="none" stroke="#0F6E56" stroke-width="${f(bold)}"${dash}/>`);
  }
  for (const mod of layout.modules) {
    if (mod.kind === 'popTopBed') continue;
    const xs = mod.parts.flatMap((p) => [p.box.min[0], p.box.max[0]]);
    const ys = mod.parts.flatMap((p) => [p.box.min[1], p.box.max[1]]);
    if (!xs.length) continue;
    text(tx((Math.min(...xs) + Math.max(...xs)) / 2), ty((Math.min(...ys) + Math.max(...ys)) / 2) + font * 0.3, mod.label, 'middle', font * 0.7);
    if (mod.kitchen) {
      const top = ty(Math.max(...ys)) - font * 0.6;
      if (mod.kind === 'kitchenBlock') dimH(tx(Math.min(...xs)), tx(Math.max(...xs)), top, `kitchen ${mod.kitchen.counterLength}`);
    }
  }
  const chain1 = ty(-W / 2) + font * 3;
  dimH(tx(van.livingStartX), tx(van.rearLimitX), chain1, `living length ${van.rearLimitX - van.livingStartX}`);
  if (m.bedRect && m.bed) {
    const r = m.bedRect;
    const chain2 = chain1 + font * 3;
    if (r.x0 > van.livingStartX) dimH(tx(van.livingStartX), tx(r.x0), chain2, `${Math.round(r.x0 - van.livingStartX)}`);
    dimH(tx(r.x0), tx(r.x1), chain2, `bed ${m.bed.length}`);
    dimV(ty(r.y1), ty(r.y0), tx(van.wheelbase + rearOverhang) + font * 3, `bed width ${m.bed.width}`);
  }

  // ---- Longitudinal section ----
  text(MARGIN, sideY0 - font * 3, 'Longitudinal section (viewed from the left)', 'start', font * 1.2);
  line(tx(van.cabFrontX), sz(0), tx(van.rearLimitX), sz(0), bold);
  line(tx(van.cabFrontX), sz(van.interiorHeight), tx(van.rearLimitX), sz(van.interiorHeight), bold);
  line(tx(van.cabFrontX), sz(0), tx(van.cabFrontX), sz(van.interiorHeight), bold);
  line(tx(van.rearLimitX), sz(0), tx(van.rearLimitX), sz(van.interiorHeight), bold);
  line(tx(-van.frontOverhang), sz(-van.floorAboveRoad), tx(van.wheelbase + rearOverhang), sz(-van.floorAboveRoad), thin, dash);
  for (const x of [0, van.wheelbase]) {
    out.push(`<circle cx="${f(tx(x))}" cy="${f(sz(-van.floorAboveRoad + 330))}" r="330" fill="none" stroke="${INK}" stroke-width="${f(thin)}"/>`);
  }
  rect(tx(ax0), sz(van.arch.height), ax1 - ax0, van.arch.height, '#e2e0d8');
  if (popTop) {
    const [p0, p1] = van.popTop.x;
    out.push(`<polyline points="${f(tx(p0))},${f(sz(van.interiorHeight))} ${f(tx(p0))},${f(sz(ceiling))} ${f(tx(p1))},${f(sz(van.interiorHeight + 150))}" fill="none" stroke="${INK}" stroke-width="${f(bold)}"${dash}/>`);
    dimV(sz(ceiling), sz(0), tx(p0) - font * 2, `standing ${ceiling}`);
  }
  for (const mod of layout.modules) {
    for (const p of mod.parts) {
      const b = p.box;
      rect(tx(b.min[0]), sz(b.max[2]), b.max[0] - b.min[0], b.max[2] - b.min[2], FILL[mod.kind], ' fill-opacity="0.6"');
    }
  }
  dimV(sz(van.interiorHeight), sz(0), tx(van.rearLimitX) + font * 3, `interior ${van.interiorHeight}`);
  if (m.bedRect) dimV(sz(m.bedRect.z), sz(0), tx(m.bedRect.x1) - font * 2, `bed height ${m.bedRect.z}`);

  // ---- Title block ----
  const bedText = m.bed ? `${m.bed.length}×${m.bed.width}` : 'none';
  text(MARGIN, titleY, `${layout.preset.name}: ${layout.state}, ${popTop ? 'pop-top raised' : 'fixed roof'}`, 'start', font * 1.4);
  text(MARGIN, titleY + font * 2, `${van.name} · scale 1:${k} (print at 100 %) · ${opts.date}`, 'start');
  text(MARGIN, titleY + font * 3.6, `Seats ${m.seats} · bed ${bedText} · sleepers ${m.sleepers} · boot ${m.bootLength} mm · dimensions in mm`, 'start');
  text(MARGIN, titleY + font * 5.2, 'Values marked approx in data/van.json are scaled from VW drawings; verify on your van.', 'start');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(sheetW / k)}mm" height="${f(sheetH / k)}mm" viewBox="0 0 ${f(sheetW)} ${f(sheetH)}">`
    + `<rect width="${f(sheetW)}" height="${f(sheetH)}" fill="#ffffff"/>${out.join('')}</svg>`;
}
