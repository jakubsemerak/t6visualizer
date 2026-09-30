import type { Overrides } from './layout';

export type View = 'orbit' | 'walk' | 'plan' | 'compare';
export interface AppState { presetId: string; view: View; overrides: Overrides }

const VIEWS: View[] = ['orbit', 'walk', 'plan', 'compare'];

export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  const o = s.overrides;
  q.set('preset', s.presetId);
  q.set('view', s.view);
  if (o.state) q.set('state', o.state);
  if (o.popTop !== undefined) q.set('popTop', o.popTop ? '1' : '0');
  if (o.passenger) q.set('passenger', o.passenger);
  if (o.benchFrontX !== undefined) q.set('benchFrontX', String(o.benchFrontX));
  if (o.benchModel) q.set('benchModel', o.benchModel);
  if (o.kitchenLength !== undefined) q.set('kitchenLength', String(o.kitchenLength));
  if (o.fridge) q.set('fridge', o.fridge);
  return q.toString();
}

/** Parses the location hash; unknown or invalid values are dropped. */
export function decodeState(hash: string, presetIds: string[]): AppState {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const preset = q.get('preset') ?? '';
  const view = q.get('view') ?? '';
  const o: Overrides = {};
  const num = (k: string) => {
    const v = q.get(k);
    if (v === null || v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const state = q.get('state');
  if (state === 'seated' || state === 'bed') o.state = state;
  const popTop = q.get('popTop');
  if (popTop === '1' || popTop === '0') o.popTop = popTop === '1';
  const passenger = q.get('passenger');
  if (passenger === 'doubleBench' || passenger === 'singleSwivel') o.passenger = passenger;
  const benchFrontX = num('benchFrontX');
  if (benchFrontX !== undefined) o.benchFrontX = benchFrontX;
  const benchModel = q.get('benchModel');
  if (benchModel) o.benchModel = benchModel;
  const kitchenLength = num('kitchenLength');
  if (kitchenLength !== undefined) o.kitchenLength = kitchenLength;
  const fridge = q.get('fridge');
  if (fridge === 'none' || fridge === 'coolbox' || fridge === 'compressor42') o.fridge = fridge;
  return {
    presetId: presetIds.includes(preset) ? preset : presetIds[0],
    view: (VIEWS as string[]).includes(view) ? (view as View) : 'orbit',
    overrides: o,
  };
}
