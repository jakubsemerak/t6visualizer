import { evaluate, type Evaluation } from '../core/checks';
import { bestMatch, compareAll, rankRows } from '../core/compare';
import { VAN } from '../core/data';
import type { Overrides } from '../core/layout';
import { PRESETS, presetById } from '../core/presets';
import { decodeState, encodeState, type AppState, type View } from '../core/urlState';
import { buildDimensionLabels } from '../three/dimensions';
import { drawMinimap } from '../three/minimap';
import { VanScene } from '../three/scene';
import { loadShell, type RoofVariant } from '../three/shell';
import { WalkController } from '../three/walk';
import { renderCompare } from './compareView';
import { h } from './dom';
import { renderMetrics } from './metricsPanel';
import { renderParams } from './paramsPanel';
import { renderPlan } from './planView';
import { renderPresetList } from './presetList';

const TABS: [View, string][] = [['orbit', '3D'], ['walk', 'Walk'], ['plan', 'Plan'], ['compare', 'Compare']];

export function startApp(root: HTMLElement): void {
  let state: AppState = decodeState(location.hash, PRESETS.map((p) => p.id));
  if (state.view === 'walk') state = { ...state, view: 'orbit' }; // pointer lock needs a click
  let lights = false;
  let dims = false;
  let minimap = true;
  let planScale: 10 | 20 = 20;

  const tabButtons = TABS.map(([v, label]) => h('button', { class: 'tab', 'data-view': v, onclick: () => setView(v) }, label));
  const lightsBtn = h('button', { class: 'toggle', onclick: () => { lights = !lights; scene.setLights(lights); syncToggles(); } }, 'Lights (L)');
  const dimsBtn = h('button', { class: 'toggle', onclick: () => { dims = !dims; syncToggles(); update(false); } }, 'Dimensions');
  const sidebar = h('aside', { class: 'sidebar' });
  const viewport = h('div', { class: 'viewport' });
  const miniCanvas = h('canvas', { class: 'minimap', width: 260, height: 130 }) as HTMLCanvasElement;
  const hint = h('div', { class: 'walk-hint' });
  const banner = h('div', { class: 'banner', hidden: true }, 'Baked van model not found: showing a simplified shell. Run npm run build:shell.');
  const planEl = h('div', { class: 'plan-view' });
  const compareEl = h('div', { class: 'compare-view' });
  const paramsEl = h('section', { class: 'params' });
  const metricsEl = h('section', { class: 'metrics-panel' });
  viewport.append(miniCanvas, hint, banner);

  root.replaceChildren(
    h('header', { class: 'topbar' },
      h('div', { class: 'brand' }, h('strong', {}, 'T6.1 Camper Planner'), h('span', { class: 'muted small' }, VAN.name)),
      h('nav', { class: 'tabs', 'aria-label': 'View' }, ...tabButtons),
      h('div', { class: 'toggles' }, dimsBtn, lightsBtn)),
    h('div', { class: 'body' }, sidebar, h('main', { class: 'stage' }, viewport, planEl, compareEl), h('aside', { class: 'panel' }, paramsEl, metricsEl)),
  );

  const scene = new VanScene(viewport, VAN);
  const walk = new WalkController(scene.camera, scene.labels.domElement);
  let evaluation: Evaluation = evaluate(VAN, presetById(state.presetId), state.overrides);
  const currentLayout = () => ((state.overrides.state ?? 'seated') === 'bed' ? evaluation.bed : evaluation.seated);

  scene.onFrame = (dt) => {
    walk.update(dt);
    if (state.view === 'walk' && minimap) drawMinimap(miniCanvas, currentLayout(), walk.position);
  };
  walk.onExit = () => setView('orbit');
  walk.onToggleMinimap = () => { minimap = !minimap; miniCanvas.hidden = !minimap; };

  loadShell(`${import.meta.env.BASE_URL}models/van.glb`, VAN).then(({ group, baked }) => {
    scene.setShell(group);
    banner.hidden = baked;
    update(false);
  });

  function roofVariant(): RoofVariant {
    if (!state.overrides.popTop) return 'fixed';
    return state.overrides.state === 'bed' || state.view === 'walk' ? 'open' : 'closed';
  }

  function update(rerenderParams = true): void {
    const preset = presetById(state.presetId);
    evaluation = evaluate(VAN, preset, state.overrides);
    const layout = currentLayout();
    const flagged = new Set(evaluation.checks.filter((c) => c.level === 'error').flatMap((c) => c.moduleIds));
    // In walk mode the roof bed is folded up into the tent, as it is for collisions.
    const visible = state.view === 'walk' ? layout.modules.filter((m) => m.kind !== 'popTopBed') : layout.modules;
    scene.setModules(visible, flagged);
    scene.setRoof(roofVariant());
    scene.setDimensions(dims && state.view === 'orbit' ? buildDimensionLabels(layout, evaluation.metrics) : null);
    walk.updateLayout(layout);
    const rows = compareAll(VAN, PRESETS, { popTop: state.overrides.popTop, passenger: state.overrides.passenger },
      { id: preset.id, overrides: state.overrides });
    const best = bestMatch(rows);
    renderPresetList(sidebar, rows, preset.id, best, selectPreset);
    if (rerenderParams) renderParams(paramsEl, preset, state.overrides, layout.notes, { onChange, onReset });
    renderMetrics(metricsEl, evaluation.metrics, evaluation.checks);
    if (state.view === 'plan') renderPlan(planEl, layout, evaluation.metrics, planScale, (s) => { planScale = s; update(false); });
    if (state.view === 'compare') renderCompare(compareEl, rankRows(rows), best, selectPreset);
    history.replaceState(null, '', `#${encodeState(state)}`);
  }

  function onChange(patch: Partial<Overrides>, live = false): void {
    state = { ...state, overrides: { ...state.overrides, ...patch } };
    update(!live);
  }

  function keepGlobal(): Overrides {
    const { popTop, passenger, state: bedState } = state.overrides;
    return { popTop, passenger, state: bedState };
  }

  function onReset(): void {
    state = { ...state, overrides: keepGlobal() };
    update();
  }

  function selectPreset(id: string): void {
    state = { ...state, presetId: id, overrides: keepGlobal() };
    update();
  }

  function setView(v: View): void {
    if (state.view === 'walk' && v !== 'walk') walk.exit();
    state = { ...state, view: v };
    scene.setMode(v === 'walk' ? 'walk' : 'orbit');
    if (v === 'walk') {
      const { ghost } = walk.enter(currentLayout());
      hint.textContent = ghost
        ? 'No free floor space in this mode, so collisions are off. Esc to leave.'
        : 'WASD walk · mouse look (or drag) · Shift run · C crouch · X sit · M minimap · Esc leave';
    }
    showView();
    update(false);
  }

  function showView(): void {
    const v = state.view;
    viewport.hidden = v === 'plan' || v === 'compare';
    planEl.hidden = v !== 'plan';
    compareEl.hidden = v !== 'compare';
    miniCanvas.hidden = v !== 'walk' || !minimap;
    hint.hidden = v !== 'walk';
    for (const b of tabButtons) b.classList.toggle('on', b.dataset.view === v);
  }

  function syncToggles(): void {
    lightsBtn.classList.toggle('on', lights);
    dimsBtn.classList.toggle('on', dims);
  }

  window.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
    if (typing || e.repeat) return;
    if (e.code === 'KeyL') { lights = !lights; scene.setLights(lights); syncToggles(); }
  });

  showView();
  update();
}
