import type { Layout } from '../core/layout';
import type { Pos } from '../core/walk';

/** Top-down minimap: front at the left, sliding-door side at the top. */
export function drawMinimap(canvas: HTMLCanvasElement, layout: Layout, player: (Pos & { yaw: number }) | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { van } = layout;
  const w = canvas.width;
  const h = canvas.height;
  const x0 = van.cabFrontX;
  const s = Math.min(w / (van.rearLimitX - x0), h / van.bodyWidth);
  const px = (x: number) => (x - x0) * s;
  const py = (y: number) => h / 2 - y * s;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(20, 24, 28, 0.78)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#cfd6dc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  van.sections.forEach((sec, i) => (i ? ctx.lineTo(px(sec.x), py(sec.low[1])) : ctx.moveTo(px(sec.x), py(sec.low[1]))));
  [...van.sections].reverse().forEach((sec) => ctx.lineTo(px(sec.x), py(sec.low[0])));
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(159, 225, 203, 0.7)';
  for (const m of layout.modules) {
    if (m.kind === 'popTopBed') continue;
    for (const p of m.parts) {
      ctx.fillRect(px(p.box.min[0]), py(p.box.max[1]), (p.box.max[0] - p.box.min[0]) * s, (p.box.max[1] - p.box.min[1]) * s);
    }
  }
  if (!player) return;
  ctx.fillStyle = '#ef9f27';
  ctx.strokeStyle = '#ef9f27';
  ctx.beginPath();
  ctx.arc(px(player.x), py(player.y), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px(player.x), py(player.y));
  ctx.lineTo(px(player.x) + Math.cos(player.yaw) * 14, py(player.y) - Math.sin(player.yaw) * 14);
  ctx.stroke();
}
