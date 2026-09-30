import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/core/checks';
import { VAN } from '../../src/core/data';
import { presetById } from '../../src/core/presets';
import { escapeXml, renderPlanSvg } from '../../src/plan/svg';

const ev = evaluate(VAN, presetById('coast'));
const svg = renderPlanSvg(ev.seated, ev.metrics, { scale: 10, date: '2026-09-30' });

describe('renderPlanSvg', () => {
  it('uses real millimetres so it prints to scale', () => {
    expect(svg).toMatch(/^<svg[^>]+width="540.4mm"/);
    expect(renderPlanSvg(ev.seated, ev.metrics, { scale: 20, date: '2026-09-30' })).toMatch(/width="270.2mm"/);
  });
  it('labels the key dimensions', () => {
    expect(svg).toContain('living length 2400');
    expect(svg).toContain('bed 1950');
    expect(svg).toContain('bed width 1140');
    expect(svg).toContain('kitchen 1430');
    expect(svg).toContain('interior 1370');
  });
  it('has a title block', () => {
    expect(svg).toContain('Coast-style');
    expect(svg).toContain('scale 1:10');
    expect(svg).toContain('verify on your van');
  });
  it('contains no invalid numbers', () => {
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
  it('shows the pop-top when raised', () => {
    const up = evaluate(VAN, presetById('coast'), { popTop: true });
    expect(renderPlanSvg(up.seated, up.metrics, { scale: 20, date: 'x' })).toContain('standing 2300');
  });
  it('escapes XML', () => {
    expect(escapeXml('a<b&"c"')).toBe('a&lt;b&amp;&quot;c&quot;');
  });
});
