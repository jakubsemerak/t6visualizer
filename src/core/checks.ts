import { archBoxes, bodyViolation } from './body';
import { intersects } from './geometry';
import { buildLayout, type Layout, type Overrides } from './layout';
import { computeMetrics, type Metrics } from './metrics';
import type { Box, Preset, Van } from './types';

export type Level = 'error' | 'warn' | 'info';
export interface Check { level: Level; code: string; message: string; moduleIds: string[] }

export const MIN_BED_LENGTH = 1950;
export const MIN_BED_WIDTH = 1120;
export const PREF_BED_WIDTH = 1200;
export const MIN_DOOR_GAP = 250;
export const MIN_TRAVEL_SEATS = 5;
/** Parts reaching further than this towards the door side, and lower than DOOR_ZONE_TOP, block the door. */
export const DOOR_ZONE_Y = 400;
export const DOOR_ZONE_TOP = 1000;

const LEVEL_ORDER: Record<Level, number> = { error: 0, warn: 1, info: 2 };

const footprintOverlap = (a: Box, b: Box) =>
  Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]) > 1 &&
  Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]) > 1;

/** Longest free stretch (mm) of the sliding-door opening at floor level. */
export function doorGap(layout: Layout): number {
  const { van } = layout;
  const [d0, d1] = van.slidingDoor.x;
  const right = van.slidingDoor.side === 'right';
  const blocked = layout.modules
    .filter((m) => m.kind !== 'popTopBed')
    .flatMap((m) => m.parts.map((p) => p.box))
    .filter((b) => (right ? b.max[1] > DOOR_ZONE_Y : b.min[1] < -DOOR_ZONE_Y) && b.min[2] < DOOR_ZONE_TOP)
    .filter((b) => b.max[0] > d0 && b.min[0] < d1)
    .map((b): [number, number] => [Math.max(d0, b.min[0]), Math.min(d1, b.max[0])])
    .sort((a, b) => a[0] - b[0]);
  let gap = 0;
  let cursor = d0;
  for (const [s, e] of blocked) {
    gap = Math.max(gap, s - cursor);
    cursor = Math.max(cursor, e);
  }
  return Math.max(gap, d1 - cursor);
}

export function layoutChecks(layout: Layout): Check[] {
  const { van, modules, popTop, state } = layout;
  const out: Check[] = [];
  const arches = archBoxes(van);
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i];
      const b = modules[j];
      if (a.parts.some((pa) => b.parts.some((pb) => intersects(pa.box, pb.box)))) {
        out.push({ level: 'error', code: 'COLLISION', message: `${a.label} collides with ${b.label} (${state})`, moduleIds: [a.id, b.id] });
      }
    }
  }
  for (const m of modules) {
    for (const p of m.parts) {
      const v = bodyViolation(van, p.box, popTop);
      if (v) {
        out.push({ level: 'error', code: 'BODY', message: `${m.label}: ${v} (${state})`, moduleIds: [m.id] });
        break;
      }
    }
    if (m.isRearSeat && state === 'seated' && m.parts.some((p) => arches.some((a) => footprintOverlap(p.box, a)))) {
      out.push({ level: 'error', code: 'SEAT_ON_ARCH', message: `${m.label} stands over a wheel arch; seats must not be mounted there`, moduleIds: [m.id] });
    } else if (m.parts.some((p) => arches.some((a) => intersects(p.box, a)))) {
      out.push({ level: 'error', code: 'ARCH', message: `${m.label} collides with a wheel arch (${state})`, moduleIds: [m.id] });
    }
  }
  if (state === 'seated') {
    const gap = doorGap(layout);
    if (gap < MIN_DOOR_GAP) {
      out.push({ level: 'warn', code: 'DOOR', message: `Sliding-door step-in gap is only ${Math.round(gap)} mm (min ${MIN_DOOR_GAP})`, moduleIds: [] });
    }
  }
  return out;
}

export function metricChecks(m: Metrics): Check[] {
  const out: Check[] = [];
  const add = (level: Level, code: string, message: string) => out.push({ level, code, message, moduleIds: [] });
  if (!m.bed) {
    add('error', 'NO_BED', 'No lower bed');
  } else {
    if (m.bed.length < MIN_BED_LENGTH) {
      add('error', 'BED_SHORT', `Bed ${m.bed.length} mm long: too short for two 187 cm sleepers (needs ≥ ${MIN_BED_LENGTH})`);
    }
    if (m.bed.width < MIN_BED_WIDTH) {
      add('error', 'BED_NARROW', `Bed ${m.bed.width} mm wide: too narrow for two adults (needs ≥ ${MIN_BED_WIDTH})`);
    } else if (m.bed.width < PREF_BED_WIDTH) {
      add('warn', 'BED_NARROW_PREF', `Bed ${m.bed.width} mm wide: tight for two adults (${PREF_BED_WIDTH}+ is comfortable)`);
    }
  }
  if (m.seats < MIN_TRAVEL_SEATS) add('error', 'SEATS_MIN', `Only ${m.seats} travel seats (need ${MIN_TRAVEL_SEATS})`);
  if (m.approvedSeats < m.seats) add('warn', 'SEAT_APPROVAL', `${m.seats - m.approvedSeats} seat(s) without crash-test approval data`);
  if (!m.rearSeatsRemovable) add('warn', 'REAR_FIXED', 'Rear seats cannot be removed quickly');
  if (m.standingHeight < 1800) add('info', 'HEADROOM', `No standing room (${m.standingHeight} mm); a pop-top lets you stand and cook inside`);
  if (m.payloadLeftKg < 0) add('error', 'PAYLOAD', `Over the gross weight by ${-m.payloadLeftKg} kg with all seats occupied`);
  else if (m.payloadLeftKg < 100) add('warn', 'PAYLOAD_LOW', `Only ${m.payloadLeftKg} kg left for luggage with all seats occupied`);
  return out;
}

export interface Evaluation { seated: Layout; bed: Layout; metrics: Metrics; checks: Check[] }

export function evaluate(van: Van, preset: Preset, o: Overrides = {}): Evaluation {
  const seated = buildLayout(van, preset, { ...o, state: 'seated' });
  const bed = buildLayout(van, preset, { ...o, state: 'bed' });
  const metrics = computeMetrics(seated, bed);
  const seen = new Set<string>();
  const checks: Check[] = [];
  for (const c of [...layoutChecks(seated), ...layoutChecks(bed), ...metricChecks(metrics)]) {
    const key = `${c.code}|${c.moduleIds.join(',')}`;
    if (!seen.has(key)) {
      seen.add(key);
      checks.push(c);
    }
  }
  checks.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return { seated, bed, metrics, checks };
}
