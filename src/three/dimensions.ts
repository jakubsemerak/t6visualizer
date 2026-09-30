import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { Layout } from '../core/layout';
import type { Metrics } from '../core/metrics';
import { toThree } from './coords';

/** Floating dimension labels (CSS2D) for the orbit view. */
export function buildDimensionLabels(layout: Layout, m: Metrics): THREE.Group {
  const g = new THREE.Group();
  const { van } = layout;
  const add = (text: string, x: number, y: number, z: number) => {
    const div = document.createElement('div');
    div.className = 'dim-label';
    div.textContent = text;
    const o = new CSS2DObject(div);
    o.position.copy(toThree(x, y, z));
    g.add(o);
  };
  add(`living length ${van.rearLimitX - van.livingStartX} mm`, (van.livingStartX + van.rearLimitX) / 2, -700, 20);
  if (m.bedRect && m.bed) {
    const r = m.bedRect;
    add(`bed ${m.bed.length} × ${m.bed.width}`, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.z + 60);
  }
  for (const mod of layout.modules) {
    if (!mod.kitchen) continue;
    const xs = mod.parts.flatMap((p) => [p.box.min[0], p.box.max[0]]);
    const ys = mod.parts.flatMap((p) => [p.box.min[1], p.box.max[1]]);
    const top = Math.max(...mod.parts.map((p) => p.box.max[2]));
    add(`${mod.label} ${mod.kitchen.counterLength} mm`, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2, top + 60);
  }
  add(`interior height ${van.interiorHeight} mm`, van.rearLimitX - 100, 0, van.interiorHeight / 2);
  return g;
}

/** CSS2DRenderer leaves removed labels in the DOM; call before discarding a label group. */
export function disposeLabels(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof CSS2DObject) o.element.remove();
  });
}
