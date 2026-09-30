# T6.1 Camper Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local Vite + Three.js web tool that shows five researched California-style camper layouts on a dimensionally accurate VW T6.1 Mixto SWB. It supports parametric tweaks, checks and a comparison, a first-person walk, and dimensioned SVG plan export.

**Architecture:**
- **Pure core** (`src/core`, no Three.js): loads `data/van.json` (VW bodybuilder dimensions) and the presets. It builds a layout of placed modules made of role-tagged boxes in millimetres, then derives metrics and checks. It is fully unit-tested with Vitest.
- **Three.js layer**: renders the Blender-baked shell GLB plus meshes generated from the core's boxes.
- **SVG plan**: generated from the same layout.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest, Blender 5.0 (headless Python) for the shell.

Spec: `docs/superpowers/specs/2026-09-30-t61-camper-visualizer-design.md`. Research: `docs/research/2026-09-30-t61-swb-dimensions-and-conversions.md`.

---

## Conventions (read first)

- **Frame (core):** millimetres. X points rearward, with X=0 at the front-axle centre. Y is positive to the right (the sliding-door side). Z points up from the cargo-floor top.
- **Frame (three.js):** metres, `three = (X, Z, −Y) / 1000`. This is also what Blender's glTF exporter produces from geometry built in the van frame.
- **Boxes:** every piece of furniture is a list of `Part { role, box }`. The same boxes are used for collisions, 3D meshes and the SVG plan.
- **Tolerances:** boxes that touch or overlap by ≤ 1 mm do not collide.
- **Commands:**
  - `npm test`: Vitest, all tests.
  - `npx tsc --noEmit`: type check.
  - `npm run dev`: dev server on :5173.
- **Code blocks:** a block preceded by "Write `path`:" is the complete content of that file.
- **Commits:** one per task. Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Preset geometry:** if a preset smoke test reports `COLLISION` or `BODY`, adjust the numbers in `data/presets/*.json`, never the checker, and keep gaps of at least 2 mm. The body data is approximate by design.

## File structure

```
package.json, tsconfig.json, vite.config.ts, index.html
data/van.json                     body dimensions, sections, sources, approx flags
data/modules/benches.json         bench catalogue (width, seats, bed size, mass, cost, source)
data/modules/fridges.json         fridge options
data/presets/{coast,beach,trio,singles,budget}.json
src/core/types.ts                 shared data types
src/core/van.ts                   van.json validation + approx lookup
src/core/data.ts                  VAN singleton
src/core/geometry.ts              Box helpers
src/core/body.ts                  interior section model: walls, ceiling, arches, body violations
src/core/catalog.ts               bench / fridge lookup
src/core/modules/seating.ts       cabSeats, rnrBench (+ shared benchSeat)
src/core/modules/furniture.ts     kitchenBlock, wardrobe, sideLocker, boxKitchen, factoryBench, bedPlatform, popTopBed
src/core/presets.ts               preset registry
src/core/layout.ts                buildLayout(van, preset, overrides)
src/core/metrics.ts               computeMetrics (bed, boot volume, payload…)
src/core/checks.ts                layoutChecks, metricChecks, evaluate
src/core/compare.ts               compareAll, rankRows, bestMatch
src/core/urlState.ts              hash <-> app state
src/core/walk.ts                  walk-mode collision helpers (pure)
src/plan/svg.ts                   renderPlanSvg
src/plan/export.ts                downloadText
src/three/coords.ts, materials.ts, moduleMesh.ts, shell.ts, dimensions.ts, scene.ts, walk.ts, minimap.ts
src/ui/dom.ts, presetList.ts, paramsPanel.ts, metricsPanel.ts, compareView.ts, planView.ts, app.ts
src/main.ts, src/style.css
blender/build_shell.py            headless Blender shell builder
public/models/van.glb             committed build output
tests/**                          Vitest
```

---

### Task 1: Scaffold

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Write the project files**

Write `package.json`:

```json
{
  "name": "t6visualizer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:shell": "blender -b --factory-startup --python blender/build_shell.py -- --data data/van.json --out public/models/van.glb"
  }
}
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "data", "vite.config.ts"]
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T6.1 Camper Planner</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Write `src/main.ts`:

```ts
document.getElementById('app')!.textContent = 'T6.1 Camper Planner';
```

- [ ] **Step 2: Install dependencies**

Run: `npm install three && npm install -D typescript vite vitest @types/three @types/node`
Expected: `added N packages`, no errors.

- [ ] **Step 3: Verify the toolchain**

Run: `npx tsc --noEmit && npx vitest run --passWithNoTests`
Expected: no type errors; vitest prints `No test files found, exiting with code 0`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.ts
git commit -m "chore: scaffold Vite + TypeScript + Three.js + Vitest"
```

---

### Task 2: Core types and van data

**Files:** Create `src/core/types.ts`, `data/van.json`, `src/core/van.ts`, `src/core/data.ts`, `tests/core/van.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/core/van.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import vanJson from '../../data/van.json';
import { isApprox, loadVan } from '../../src/core/van';

describe('van data', () => {
  const van = loadVan(vanJson);

  it('describes the SWB Mixto', () => {
    expect(van.wheelbase).toBe(3000);
    expect(van.rearLimitX - van.livingStartX).toBe(2400);
    expect(van.slidingDoor.side).toBe('right');
  });

  it('rejects unsorted sections', () => {
    const bad = structuredClone(vanJson) as { sections: unknown[] };
    bad.sections.reverse();
    expect(() => loadVan(bad)).toThrow(/sorted/);
  });

  it('rejects missing numbers', () => {
    const bad = structuredClone(vanJson) as Record<string, unknown>;
    delete bad.interiorHeight;
    expect(() => loadVan(bad)).toThrow(/interiorHeight/);
  });

  it('flags approximate values', () => {
    expect(isApprox(van, 'arch.x')).toBe(true);
    expect(isApprox(van, 'wheelbase')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/van.test.ts`
Expected: FAIL. The imports `../../data/van.json` and `../../src/core/van` cannot be resolved.

- [ ] **Step 3: Write types, data and loader**

Write `src/core/types.ts`:

```ts
// Core data types. Units: millimetres. Frame: X rearward from the front-axle centre, Y positive to
// the right (sliding-door side), Z up from the cargo-floor top.

export type Vec3 = [number, number, number];
export interface Box { min: Vec3; max: Vec3 }
export type Side = 'left' | 'right';
/** [left wall Y (negative), right wall Y (positive)] */
export type YPair = [number, number];

/** Interior half-widths at one X station: near the floor (lowZ), at the belt line (beltZ), at the roof. */
export interface Section { x: number; low: YPair; belt: YPair; roof: YPair }

export interface WindowSpec { id: string; side: Side; x: [number, number]; z: [number, number] }

export interface Van {
  name: string;
  frame: string;
  wheelbase: number;
  overallLength: number;
  frontOverhang: number;
  bodyWidth: number;
  floorAboveRoad: number;
  cabFrontX: number;
  livingStartX: number;
  rearLimitX: number;
  lowZ: number;
  beltZ: number;
  interiorHeight: number;
  sections: Section[];
  arch: { x: [number, number]; height: number; innerHalf: number };
  slidingDoor: { x: [number, number]; height: number; side: Side };
  tailgate: { width: number; height: number };
  windows: WindowSpec[];
  cab: { seatBackX: number };
  popTop: { lift: number; x: [number, number]; bed: { length: number; width: number } };
  gvwKg: number;
  kerbKg: number;
  approx: string[];
  sources: Record<string, string>;
}

export type BedState = 'seated' | 'bed';
export type FridgeId = 'none' | 'coolbox' | 'compressor42';
export type ModuleKind =
  | 'cabSeats' | 'rnrBench' | 'factoryBench' | 'bedPlatform'
  | 'kitchenBlock' | 'wardrobe' | 'sideLocker' | 'boxKitchen' | 'popTopBed';
export type PartRole = 'cushion' | 'backrest' | 'mattress' | 'frame' | 'carcass' | 'counter';

export interface Part { role: PartRole; box: Box }
export interface BedRect { x0: number; x1: number; y0: number; y1: number; z: number }

export interface PlacedModule {
  id: string;
  kind: ModuleKind;
  label: string;
  parts: Part[];
  seats: number;
  approvedSeats: number;
  isRearSeat: boolean;
  removable: boolean;
  bed?: BedRect;
  roofBed?: BedRect;
  kitchen?: { counterLength: number; fridgeL: number; waterL: number };
  massKg: number;
  costEur: [number, number];
}

export interface BuildCtx { van: Van; state: BedState; popTop: boolean }

export interface BenchModel {
  id: string;
  name: string;
  width: number;
  bedWidth?: number;
  seats: number;
  bedLength: number;
  massKg: number;
  costEur: [number, number];
  approved: boolean;
  source: string;
}

export interface Fridge { id: FridgeId; name: string; litres: number; massKg: number; costEur: [number, number] }

export interface ModuleSpec { id: string; kind: ModuleKind; label: string; params: Record<string, unknown> }

export interface Preset {
  id: string;
  name: string;
  basedOn: string;
  summary: string;
  sources: string[];
  /** Mass of factory parts removed by the conversion (Mixto bench, partition). */
  removedKg: number;
  modules: ModuleSpec[];
}
```

Write `data/van.json`:

```json
{
  "name": "VW T6.1 Kasten Mixto DoKa KR 3000 mm, normal roof",
  "frame": "mm. X rearward from the front-axle centre, Y positive to the right (sliding-door side), Z up from the cargo-floor top.",
  "wheelbase": 3000,
  "overallLength": 4904,
  "frontOverhang": 906,
  "bodyWidth": 1904,
  "floorAboveRoad": 568,
  "cabFrontX": -50,
  "livingStartX": 1470,
  "rearLimitX": 3870,
  "lowZ": 100,
  "beltZ": 650,
  "interiorHeight": 1370,
  "sections": [
    { "x": -50, "low": [-800, 800], "belt": [-790, 790], "roof": [-690, 690] },
    { "x": 1400, "low": [-830, 830], "belt": [-809, 814], "roof": [-707, 681] },
    { "x": 1430, "low": [-830, 790], "belt": [-809, 814], "roof": [-707, 681] },
    { "x": 2450, "low": [-830, 790], "belt": [-809, 814], "roof": [-707, 681] },
    { "x": 2480, "low": [-830, 830], "belt": [-809, 814], "roof": [-707, 681] },
    { "x": 3000, "low": [-830, 830], "belt": [-789, 789], "roof": [-696, 695] },
    { "x": 3870, "low": [-815, 815], "belt": [-788, 789], "roof": [-686, 686] }
  ],
  "arch": { "x": [2600, 3450], "height": 341, "innerHalf": 610 },
  "slidingDoor": { "x": [1430, 2450], "height": 1282, "side": "right" },
  "tailgate": { "width": 1438, "height": 1299 },
  "windows": [
    { "id": "cab-left", "side": "left", "x": [150, 1250], "z": [520, 1150] },
    { "id": "cab-right", "side": "right", "x": [150, 1250], "z": [520, 1150] },
    { "id": "load-left", "side": "left", "x": [1500, 2450], "z": [650, 1190] },
    { "id": "door-right", "side": "right", "x": [1500, 2400], "z": [650, 1190] }
  ],
  "cab": { "seatBackX": 1350 },
  "popTop": { "lift": 930, "x": [1300, 3300], "bed": { "length": 2000, "width": 1200 } },
  "gvwKg": 3000,
  "kerbKg": 2118,
  "approx": ["cabFrontX", "livingStartX", "rearLimitX", "sections", "arch.x", "slidingDoor.x", "windows", "cab.seatBackX", "popTop.x", "floorAboveRoad"],
  "sources": {
    "BRO": "https://www.volkswagen-nutzfahrzeuge.de/idhub/content/dam/onehub_nfz/importers/de/download/technische-zeichnungen/transporter/Transporter-6-1-Kastenwagen-KaEcoProfi.pdf",
    "KA_DRAWING": "https://storage.customized-solution.com/csp-public/content/Technische-Informationen/Transporter/Technische-Zeichnungen/7LA_000_011____DRW_N2D_003_____BAUMASSE___T6-1_KA_KR-LR_N-HD__20210202.pdf",
    "KOMBI_DRAWING": "https://storage.customized-solution.com/csp-public/content/Technische-Informationen/Transporter/Technische-Zeichnungen/7LA_000_011_A__DRW_N2D_002_____BAUMASSE______T6-1_KOMBI_______20210202.pdf",
    "ABR": "https://storage.customized-solution.com/csp-public/content/Technische-Informationen/Transporter/Aufbaurichtlinie-Transporter-DE-48-2023.pdf",
    "CALIFORNIA_AU": "https://www.volkswagen.com.au/idhub/content/dam/onehub_pkw/importers/au/pdfs/showroom-brochures-live/VW_CV_California-6.1_Brochure.pdf",
    "LISTING": "https://suchen.mobile.de/fahrzeuge/details.html?id=45732773827296"
  }
}
```

Write `src/core/van.ts`:

```ts
import type { Van } from './types';

const NUMBER_KEYS = [
  'wheelbase', 'overallLength', 'frontOverhang', 'bodyWidth', 'floorAboveRoad', 'cabFrontX',
  'livingStartX', 'rearLimitX', 'lowZ', 'beltZ', 'interiorHeight', 'gvwKg', 'kerbKg',
] as const;

/** Validates raw van.json and returns it typed. Throws with every problem listed. */
export function loadVan(raw: unknown): Van {
  const v = raw as Van;
  const errors: string[] = [];
  for (const k of NUMBER_KEYS) {
    const val = (v as unknown as Record<string, unknown>)[k];
    if (typeof val !== 'number' || !Number.isFinite(val)) errors.push(`${k} must be a number`);
  }
  if (!Array.isArray(v.sections) || v.sections.length < 2) {
    errors.push('sections needs at least 2 stations');
  } else {
    for (let i = 1; i < v.sections.length; i++) {
      if (v.sections[i].x <= v.sections[i - 1].x) errors.push(`sections must be sorted by x (index ${i})`);
    }
  }
  if (!(v.livingStartX < v.rearLimitX)) errors.push('livingStartX must be < rearLimitX');
  if (!(v.lowZ < v.beltZ && v.beltZ < v.interiorHeight)) errors.push('lowZ < beltZ < interiorHeight required');
  if (errors.length) throw new Error(`Invalid van data: ${errors.join('; ')}`);
  return v;
}

/** True when a value (e.g. "arch.x") was scaled from drawings and should be verified on the real van. */
export function isApprox(van: Van, key: string): boolean {
  return van.approx.some((a) => key === a || key.startsWith(`${a}.`));
}
```

Write `src/core/data.ts`:

```ts
import vanJson from '../../data/van.json';
import { loadVan } from './van';

export const VAN = loadVan(vanJson);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/van.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/van.ts src/core/data.ts data/van.json tests/core/van.test.ts
git commit -m "feat(core): van data model with validation"
```

---

### Task 3: Box geometry helpers

**Files:** Create `src/core/geometry.ts`, `tests/core/geometry.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/core/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { box, intersects, overlap1d, size } from '../../src/core/geometry';

describe('geometry', () => {
  it('normalises corner order', () => {
    expect(box(10, 0, 5, -5, 0, 1)).toEqual({ min: [0, -5, 0], max: [10, 5, 1] });
  });
  it('detects overlap', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(5, 15, 5, 15, 5, 15))).toBe(true);
  });
  it('treats touching boxes as free', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(10, 20, 0, 10, 0, 10))).toBe(false);
  });
  it('ignores overlaps within the 1 mm tolerance', () => {
    expect(intersects(box(0, 10, 0, 10, 0, 10), box(9.5, 20, 0, 10, 0, 10))).toBe(false);
  });
  it('measures size', () => {
    expect(size(box(0, 10, -5, 5, 2, 3))).toEqual([10, 10, 1]);
  });
  it('measures 1D overlap', () => {
    expect(overlap1d(0, 10, 5, 20)).toBe(5);
    expect(overlap1d(0, 10, 20, 30)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/geometry.test.ts`
Expected: FAIL, because `src/core/geometry` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/geometry.ts`:

```ts
import type { Box, Vec3 } from './types';

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box {
  return {
    min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)],
    max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)],
  };
}

/** True when the boxes overlap by more than `eps` on every axis. */
export function intersects(a: Box, b: Box, eps = 1): boolean {
  for (let i = 0; i < 3; i++) {
    if (Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]) <= eps) return false;
  }
  return true;
}

export function size(b: Box): Vec3 {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

export function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/geometry.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/geometry.ts tests/core/geometry.test.ts
git commit -m "feat(core): box geometry helpers"
```

---

### Task 4: Body model (walls, ceiling, arches)

**Files:** Create `src/core/body.ts`, `tests/core/body.test.ts`

The interior is modelled as cross-sections at X stations. Each section gives left and right wall Y at three heights: near the floor (`lowZ`), at the belt line (`beltZ`), and at the roof (`interiorHeight`). Between stations the values are linear in X; between those heights they are linear in Z. Because the model is piecewise-bilinear, the tightest wall over a box is always found at a station X or a breakpoint Z, which `wallInner` samples.

- [ ] **Step 1: Write the failing test**

Write `tests/core/body.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { archBoxes, bodyViolation, ceilingAt, sectionAt, wallInner, wallY } from '../../src/core/body';
import { VAN } from '../../src/core/data';
import { box } from '../../src/core/geometry';

describe('body', () => {
  it('interpolates sections between stations', () => {
    expect(sectionAt(VAN, 2000).low[1]).toBe(790); // sliding-door zone
    expect(sectionAt(VAN, 2700).low[1]).toBe(830);
    expect(sectionAt(VAN, 3435).belt[1]).toBeCloseTo(789, 0);
  });

  it('follows the wall profile in Z', () => {
    expect(wallY(VAN, 2000, 0, 'right')).toBe(790);
    expect(wallY(VAN, 2000, 650, 'right')).toBe(814);
    expect(wallY(VAN, 2000, 1370, 'right')).toBe(681);
    expect(wallY(VAN, 2000, 650, 'left')).toBe(-809);
  });

  it('finds the tightest wall over a range', () => {
    expect(wallInner(VAN, 1470, 2900, 0, 800, 'left')).toBeCloseTo(-773.1, 0);
  });

  it('lets a bench base overhang the door sill but not the door trim', () => {
    expect(bodyViolation(VAN, box(1920, 2570, -300, 780, 0, 300), false)).toBeNull();
    expect(bodyViolation(VAN, box(1920, 2570, -300, 820, 300, 450), false)).toBe('through right wall');
  });

  it('rejects boxes above the ceiling unless the pop-top is up', () => {
    const b = box(2000, 2400, -200, 200, 1000, 1500);
    expect(bodyViolation(VAN, b, false)).toBe('above ceiling');
    expect(bodyViolation(VAN, b, true)).toBeNull();
  });

  it('rejects boxes behind the tailgate', () => {
    expect(bodyViolation(VAN, box(3500, 3900, -100, 100, 0, 100), false)).toBe('behind tailgate');
  });

  it('raises the ceiling inside the pop-top zone only', () => {
    expect(ceilingAt(VAN, 2000, true)).toBe(2300);
    expect(ceilingAt(VAN, 3600, true)).toBe(1370);
    expect(ceilingAt(VAN, 2000, false)).toBe(1370);
  });

  it('builds wheel-arch boxes on both sides', () => {
    const [left, right] = archBoxes(VAN);
    expect(left.max[1]).toBe(-610);
    expect(right.min[1]).toBe(610);
    expect(right.max[2]).toBe(341);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/body.test.ts`
Expected: FAIL, because `src/core/body` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/body.ts`:

```ts
import { box, lerp } from './geometry';
import type { Box, Section, Side, Van, YPair } from './types';

const lerpPair = (a: YPair, b: YPair, t: number): YPair => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Interior section at any X, linearly interpolated between stations and clamped at the ends. */
export function sectionAt(van: Van, x: number): Section {
  const s = van.sections;
  if (x <= s[0].x) return { ...s[0], x };
  const last = s[s.length - 1];
  if (x >= last.x) return { ...last, x };
  let i = 1;
  while (s[i].x < x) i++;
  const a = s[i - 1];
  const b = s[i];
  const t = (x - a.x) / (b.x - a.x);
  return { x, low: lerpPair(a.low, b.low, t), belt: lerpPair(a.belt, b.belt, t), roof: lerpPair(a.roof, b.roof, t) };
}

/** Wall Y at (x, z). Left wall is negative, right wall positive. */
export function wallY(van: Van, x: number, z: number, side: Side): number {
  const sec = sectionAt(van, x);
  const k = side === 'left' ? 0 : 1;
  if (z <= van.lowZ) return sec.low[k];
  if (z <= van.beltZ) return lerp(sec.low[k], sec.belt[k], (z - van.lowZ) / (van.beltZ - van.lowZ));
  const zc = Math.min(z, van.interiorHeight);
  return lerp(sec.belt[k], sec.roof[k], (zc - van.beltZ) / (van.interiorHeight - van.beltZ));
}

/** Tightest (most inward) wall Y over an X and Z range. */
export function wallInner(van: Van, x0: number, x1: number, z0: number, z1: number, side: Side): number {
  const xs = [x0, x1, ...van.sections.map((s) => s.x).filter((x) => x > x0 && x < x1)];
  const zs = [z0, z1, van.lowZ, van.beltZ, van.interiorHeight].filter((z) => z >= z0 && z <= z1);
  const ys = xs.flatMap((x) => zs.map((z) => wallY(van, x, z, side)));
  return side === 'left' ? Math.max(...ys) : Math.min(...ys);
}

export function ceilingAt(van: Van, x: number, popTop: boolean): number {
  const inPopTop = popTop && x >= van.popTop.x[0] && x <= van.popTop.x[1];
  return inPopTop ? van.interiorHeight + van.popTop.lift : van.interiorHeight;
}

export function archBoxes(van: Van): [Box, Box] {
  const { x, height, innerHalf } = van.arch;
  return [box(x[0], x[1], -1000, -innerHalf, 0, height), box(x[0], x[1], innerHalf, 1000, 0, height)];
}

/** Why a box does not fit inside the body, or null when it fits. */
export function bodyViolation(van: Van, b: Box, popTop: boolean): string | null {
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  if (z0 < -1) return 'below floor';
  if (x0 < van.cabFrontX - 1) return 'in front of cab';
  if (x1 > van.rearLimitX + 1) return 'behind tailgate';
  const ceiling = Math.min(ceilingAt(van, x0, popTop), ceilingAt(van, x1, popTop));
  if (z1 > ceiling + 1) return 'above ceiling';
  const zBot = Math.min(z0, van.interiorHeight);
  const zTop = Math.min(z1, van.interiorHeight);
  if (y0 < wallInner(van, x0, x1, zBot, zTop, 'left') - 1) return 'through left wall';
  if (y1 > wallInner(van, x0, x1, zBot, zTop, 'right') + 1) return 'through right wall';
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/body.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/body.ts tests/core/body.test.ts
git commit -m "feat(core): Z-aware interior body model"
```

---

### Task 5: Catalogues and seating modules

**Files:** Create `data/modules/benches.json`, `data/modules/fridges.json`, `src/core/catalog.ts`, `src/core/modules/seating.ts`, `tests/core/seating.test.ts`

Seat geometry (mm):
- **Rear bench:** the cushion is 550 deep and its top sits at Z 450. The backrest is 100 deep. Its lower part (Z 350–800) is full width; its upper part (Z 800–1000) is inset by 40 on each side, because the body narrows towards the roof. The frame under the cushion is inset by 40.
- **Flat bed:** a 100 mm mattress with its top at Z 450, running from the bench front edge rearward. Bed length = `min(model.bedLength, van.rearLimitX − frontX)`.
- **Cab seats:** use the same seat shape, positioned with the backrest at `cab.seatBackX`.

- [ ] **Step 1: Write the catalogues**

Write `data/modules/benches.json`:

```json
[
  { "id": "cali-1140", "name": "California-style 2-seat bench", "width": 1140, "seats": 2, "bedLength": 1950, "massKg": 55, "costEur": [2500, 3500], "approved": true, "source": "https://www.promobil.de/einzeltest/volkswagen-t6-1-california-ocean-2020/" },
  { "id": "rib-1120", "name": "RIB 3/4 bed 1120 (2 belts)", "width": 1120, "seats": 2, "bedLength": 1950, "massKg": 60, "costEur": [2200, 3000], "approved": true, "source": "https://www.t6forum.com/threads/whats-the-width-of-a-three-quarter-rock-n-roll-bed.21684/" },
  { "id": "reimo-v3100-8", "name": "Reimo Variotech 3100 size 8", "width": 1155, "bedWidth": 1200, "seats": 3, "bedLength": 1900, "massKg": 65, "costEur": [3399, 3900], "approved": true, "source": "https://www.camp-shop24.de/ausbau-shop/t6-ausbau-t5-camping-ausbau-kurzer-radstand/campingausbau-t5-t6-triostyle/51244/reimo-schlafsitzbank-variotech-3100-vw-transporter-t5/t6/t6.1-groesse-8/p-p-br" },
  { "id": "rib-1200", "name": "RIB 1200 (2 belts)", "width": 1200, "seats": 2, "bedLength": 1950, "massKg": 62, "costEur": [2400, 3200], "approved": true, "source": "https://www.t6forum.com/threads/rib-bed-rail-system-width.55643/" },
  { "id": "reimo-v3000", "name": "Reimo Variotech 3000", "width": 1205, "bedWidth": 1260, "seats": 3, "bedLength": 2050, "massKg": 70, "costEur": [3500, 4500], "approved": true, "source": "https://www.reimo.com/us/campervan-conversions/rock-and-roll-bed-campervan-bench-seat-bed-br-van-bench-seat-bed-van-conversion-bed/reimo-variotech-3000-variotech-rock-and-roll-bed-br-reimo-variotech-reimo-rock-and-roll-bed/" },
  { "id": "scope-1250", "name": "Scope 1250 (2 belts)", "width": 1250, "seats": 2, "bedLength": 1950, "massKg": 65, "costEur": [2600, 3400], "approved": true, "source": "https://www.mal-vw.co.uk/freerunner-swb.html" },
  { "id": "rib-1300", "name": "RIB 1300 (3 belts)", "width": 1300, "seats": 3, "bedLength": 1950, "massKg": 70, "costEur": [2800, 3600], "approved": true, "source": "https://www.t6forum.com/threads/rib-bed-rail-system-width.55643/" },
  { "id": "beach-1500", "name": "Beach-style 2-seat bench with bed flaps", "width": 1140, "bedWidth": 1500, "seats": 2, "bedLength": 2000, "massKg": 60, "costEur": [2800, 3800], "approved": true, "source": "https://cookiescampers.ie/wp-content/uploads/2023/07/california-brochure-BEACH.pdf" },
  { "id": "single-600", "name": "Single rock-and-roll seat 600 on rails", "width": 600, "seats": 1, "bedLength": 1950, "massKg": 30, "costEur": [1200, 1600], "approved": true, "source": "https://www.mal-vw.co.uk/tourliner.html" }
]
```

Write `data/modules/fridges.json`:

```json
[
  { "id": "none", "name": "No fridge", "litres": 0, "massKg": 0, "costEur": [0, 0] },
  { "id": "coolbox", "name": "Portable cool box 25 L", "litres": 25, "massKg": 8, "costEur": [150, 300] },
  { "id": "compressor42", "name": "Compressor fridge 42 L", "litres": 42, "massKg": 20, "costEur": [700, 1100] }
]
```

Write `src/core/catalog.ts`:

```ts
import benchesJson from '../../data/modules/benches.json';
import fridgesJson from '../../data/modules/fridges.json';
import type { BenchModel, Fridge, FridgeId } from './types';

export const BENCHES = benchesJson as BenchModel[];
export const FRIDGES = fridgesJson as Fridge[];

export function benchById(id: string): BenchModel | undefined {
  return BENCHES.find((b) => b.id === id);
}

export function fridgeById(id: FridgeId): Fridge {
  const f = FRIDGES.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown fridge ${id}`);
  return f;
}
```

- [ ] **Step 2: Write the failing test**

Write `tests/core/seating.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { benchById } from '../../src/core/catalog';
import { VAN } from '../../src/core/data';
import { cabSeats, rnrBench, type RnrBenchParams } from '../../src/core/modules/seating';
import type { BuildCtx } from '../../src/core/types';

const seated: BuildCtx = { van: VAN, state: 'seated', popTop: false };
const flat: BuildCtx = { ...seated, state: 'bed' };
const cali = benchById('cali-1140')!;
const params: RnrBenchParams = {
  model: 'cali-1140', frontX: 1920, yCenter: 200, railRange: [1620, 2220], railStep: 100, removable: true,
};

describe('cab seats', () => {
  it('double bench gives three factory seats', () => {
    const m = cabSeats('cab', { passenger: 'doubleBench' }, seated);
    expect(m.seats).toBe(3);
    expect(m.approvedSeats).toBe(3);
    expect(m.isRearSeat).toBe(false);
  });
  it('single swivel gives two seats', () => {
    expect(cabSeats('cab', { passenger: 'singleSwivel' }, seated).seats).toBe(2);
  });
  it('backrests end at the cab seat-back line', () => {
    const m = cabSeats('cab', { passenger: 'doubleBench' }, seated);
    expect(Math.max(...m.parts.map((p) => p.box.max[0]))).toBe(VAN.cab.seatBackX);
  });
});

describe('rock-and-roll bench', () => {
  it('occupies seat depth plus backrest when seated', () => {
    const m = rnrBench('bench', 'Rear bench', cali, params, seated);
    expect(Math.max(...m.parts.map((p) => p.box.max[0]))).toBe(2570);
    expect(m.seats).toBe(2);
    expect(m.isRearSeat).toBe(true);
    expect(m.removable).toBe(true);
  });
  it('caps the bed length at the tailgate', () => {
    const back = rnrBench('bench', 'Rear bench', cali, { ...params, frontX: 2020 }, flat);
    expect(back.bed!.x1 - back.bed!.x0).toBe(1850);
    const front = rnrBench('bench', 'Rear bench', cali, { ...params, frontX: 1820 }, flat);
    expect(front.bed!.x1 - front.bed!.x0).toBe(1950);
  });
  it('widens the mattress with bed flaps', () => {
    const beach = benchById('beach-1500')!;
    const m = rnrBench('bench', 'Rear bench', beach, { ...params, yCenter: 0, frontX: 1870 }, flat);
    const mattress = m.parts.find((p) => p.role === 'mattress')!.box;
    expect(mattress.max[1] - mattress.min[1]).toBe(1500);
    expect(mattress.max[2]).toBe(450);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/core/seating.test.ts`
Expected: FAIL, because `src/core/modules/seating` cannot be resolved.

- [ ] **Step 4: Implement**

Write `src/core/modules/seating.ts`:

```ts
import { box } from '../geometry';
import type { BenchModel, BuildCtx, Part, PlacedModule } from '../types';

export const SEAT_Z = 450;
export const MATTRESS = 100;
export const BED_Z = 450;
export const SEAT_DEPTH = 550;
export const BACK_DEPTH = 100;
export const BACK_SPLIT_Z = 800;
export const BACK_TOP_Z = 1000;
export const INSET = 40;

/** A seat facing forward (−X) whose cushion front edge is at x0. */
export function benchSeat(x0: number, y0: number, y1: number): Part[] {
  const back0 = x0 + SEAT_DEPTH;
  const back1 = back0 + BACK_DEPTH;
  return [
    { role: 'frame', box: box(x0, back1, y0 + INSET, y1 - INSET, 0, SEAT_Z - MATTRESS) },
    { role: 'cushion', box: box(x0, back0, y0, y1, SEAT_Z - MATTRESS, SEAT_Z) },
    { role: 'backrest', box: box(back0, back1, y0, y1, SEAT_Z - MATTRESS, BACK_SPLIT_Z) },
    { role: 'backrest', box: box(back0, back1, y0 + INSET, y1 - INSET, BACK_SPLIT_Z, BACK_TOP_Z) },
  ];
}

export interface CabSeatsParams { passenger: 'doubleBench' | 'singleSwivel' }

export function cabSeats(id: string, p: CabSeatsParams, ctx: BuildCtx): PlacedModule {
  const x0 = ctx.van.cab.seatBackX - SEAT_DEPTH - BACK_DEPTH;
  const double = p.passenger === 'doubleBench';
  const seats = double ? 3 : 2;
  return {
    id,
    kind: 'cabSeats',
    label: double ? 'Driver + double passenger bench' : 'Driver + single swivel seat',
    parts: [...benchSeat(x0, -700, -150), ...(double ? benchSeat(x0, 50, 740) : benchSeat(x0, 150, 700))],
    seats,
    approvedSeats: seats,
    isRearSeat: false,
    removable: false,
    massKg: double ? 0 : 5,
    costEur: double ? [0, 0] : [600, 1200],
  };
}

export interface RnrBenchParams {
  model: string;
  frontX: number;
  yCenter: number;
  railRange: [number, number];
  railStep: number;
  removable: boolean;
}

export function rnrBench(id: string, label: string, m: BenchModel, p: RnrBenchParams, ctx: BuildCtx): PlacedModule {
  const y0 = p.yCenter - m.width / 2;
  const y1 = p.yCenter + m.width / 2;
  const bedWidth = m.bedWidth ?? m.width;
  const by0 = p.yCenter - bedWidth / 2;
  const by1 = p.yCenter + bedWidth / 2;
  const x0 = p.frontX;
  const bedLength = Math.min(m.bedLength, ctx.van.rearLimitX - x0);
  const seat = benchSeat(x0, y0, y1);
  const parts: Part[] = ctx.state === 'seated'
    ? seat
    : [seat[0], { role: 'mattress', box: box(x0, x0 + bedLength, by0, by1, BED_Z - MATTRESS, BED_Z) }];
  return {
    id,
    kind: 'rnrBench',
    label: `${label} (${m.name})`,
    parts,
    seats: m.seats,
    approvedSeats: m.approved ? m.seats : 0,
    isRearSeat: true,
    removable: p.removable,
    bed: { x0, x1: x0 + bedLength, y0: by0, y1: by1, z: BED_Z },
    massKg: m.massKg,
    costEur: m.costEur,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/core/seating.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add data/modules src/core/catalog.ts src/core/modules/seating.ts tests/core/seating.test.ts
git commit -m "feat(core): bench/fridge catalogues and seating modules"
```

---

### Task 6: Furniture modules

**Files:** Create `src/core/modules/furniture.ts`, `tests/core/furniture.test.ts`

Rules:
- **Wall-mounted modules** (kitchen, wardrobe, locker) sit 5 mm off the tightest wall over their height.
- **Wheel arches:** where a module reaches into the arch zone (|Y| > `arch.innerHalf`), `aroundArch` splits it. The part above the arch starts 10 mm above the arch top.

- [ ] **Step 1: Write the failing test**

Write `tests/core/furniture.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fridgeById } from '../../src/core/catalog';
import { VAN } from '../../src/core/data';
import { box } from '../../src/core/geometry';
import {
  aroundArch, bedPlatform, factoryBench, kitchenBlock, popTopBed, sideLocker, wardrobe,
} from '../../src/core/modules/furniture';
import type { BuildCtx } from '../../src/core/types';

const seated: BuildCtx = { van: VAN, state: 'seated', popTop: false };
const flat: BuildCtx = { ...seated, state: 'bed' };

describe('aroundArch', () => {
  it('splits a wall cabinet that crosses the arch into three parts', () => {
    const parts = aroundArch(VAN, box(2400, 3600, -780, -400, 0, 800));
    expect(parts).toHaveLength(3);
    expect(parts[1].min[2]).toBe(351);
  });
  it('leaves a centred box alone', () => {
    expect(aroundArch(VAN, box(2400, 3600, -300, 300, 0, 800))).toHaveLength(1);
  });
  it('drops the over-arch part when the module is lower than the arch', () => {
    expect(aroundArch(VAN, box(2480, 3870, -790, -440, 0, 340))).toHaveLength(2);
  });
});

describe('furniture', () => {
  it('kitchen hugs the left wall', () => {
    const k = kitchenBlock('kitchen', 'Kitchen', {
      x0: 1470, length: 1430, maxLength: 1430, depth: 380, height: 800, side: 'left', fridge: 'compressor42', waterL: 30,
    }, fridgeById('compressor42'), seated);
    const b = k.parts[0].box;
    expect(b.min[1]).toBeCloseTo(-768.1, 0);
    expect(b.max[1] - b.min[1]).toBeCloseTo(380, 5);
    expect(k.kitchen).toEqual({ counterLength: 1430, fridgeL: 42, waterL: 30 });
    expect(k.massKg).toBe(122);
  });

  it('wardrobe over the arch starts above it', () => {
    const w = wardrobe('w', 'Wardrobe', { x0: 2900, length: 450, depth: 320, height: 1250, side: 'left' }, seated);
    expect(w.parts).toHaveLength(1);
    expect(w.parts[0].box.min[2]).toBe(351);
  });

  it('low locker skips the arch', () => {
    const l = sideLocker('l', 'Locker', { x0: 2480, length: 1390, height: 340, side: 'left', innerY: 440 }, seated);
    expect(l.parts).toHaveLength(2);
    expect(l.parts[0].box.max[1]).toBe(-440);
  });

  it('factory bench folds its backrest for the bed', () => {
    const b = factoryBench('b', 'Factory bench', { frontX: 1700, width: 1430 }, flat);
    expect(Math.max(...b.parts.map((p) => p.box.max[2]))).toBe(550);
    expect(b.removable).toBe(false);
    expect(b.seats).toBe(3);
  });

  it('bed platform keeps its storage box between the arches', () => {
    const p = bedPlatform('p', 'Bed kit', { x0: 1700, nominalLength: 1880, width: 1430 }, flat);
    expect(p.bed!.x1 - p.bed!.x0).toBe(1880);
    const carcass = p.parts.find((x) => x.role === 'carcass')!.box;
    expect(carcass.max[1]).toBe(600);
  });

  it('pop-top bed sits in the roof', () => {
    const r = popTopBed('poptop', { ...seated, popTop: true });
    expect(r.roofBed!.x1 - r.roofBed!.x0).toBe(2000);
    expect(r.roofBed!.y1 - r.roofBed!.y0).toBe(1200);
    expect(r.parts[0].box.max[2]).toBe(1470);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/furniture.test.ts`
Expected: FAIL, because `src/core/modules/furniture` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/modules/furniture.ts`:

```ts
import { wallInner } from '../body';
import { box } from '../geometry';
import type { Box, BuildCtx, Fridge, FridgeId, ModuleKind, Part, PartRole, PlacedModule, Side, Van } from '../types';
import { BACK_DEPTH, MATTRESS, SEAT_DEPTH, SEAT_Z, benchSeat } from './seating';

export const WALL_GAP = 5;
export const ARCH_CLEARANCE = 10;
export const PLATFORM_Z = 650;

/** Splits a box so no part sits inside a wheel arch; the middle part is lifted above the arch. */
export function aroundArch(van: Van, b: Box): Box[] {
  const [ax0, ax1] = van.arch.x;
  const top = van.arch.height + ARCH_CLEARANCE;
  const [x0, y0, z0] = b.min;
  const [x1, y1, z1] = b.max;
  const reachesArch = y0 < -van.arch.innerHalf || y1 > van.arch.innerHalf;
  if (!reachesArch || x1 <= ax0 || x0 >= ax1 || z0 >= top) return [b];
  const out: Box[] = [];
  if (x0 < ax0) out.push(box(x0, ax0, y0, y1, z0, z1));
  if (z1 > top) out.push(box(Math.max(x0, ax0), Math.min(x1, ax1), y0, y1, top, z1));
  if (x1 > ax1) out.push(box(ax1, x1, y0, y1, z0, z1));
  return out;
}

const partsOf = (van: Van, role: PartRole, b: Box): Part[] => aroundArch(van, b).map((bx) => ({ role, box: bx }));

function againstWall(ctx: BuildCtx, x0: number, x1: number, zTop: number, side: Side, depth: number): [number, number] {
  const wall = wallInner(ctx.van, x0, x1, 0, zTop, side);
  return side === 'left'
    ? [wall + WALL_GAP, wall + WALL_GAP + depth]
    : [wall - WALL_GAP - depth, wall - WALL_GAP];
}

function furniture(
  id: string, kind: ModuleKind, label: string, parts: Part[], massKg: number, costEur: [number, number],
): PlacedModule {
  return { id, kind, label, parts, seats: 0, approvedSeats: 0, isRearSeat: false, removable: false, massKg, costEur };
}

export interface KitchenParams {
  x0: number; length: number; maxLength: number; depth: number; height: number; side: Side; fridge: FridgeId; waterL: number;
}

export function kitchenBlock(id: string, label: string, p: KitchenParams, fridge: Fridge, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const [y0, y1] = againstWall(ctx, p.x0, x1, p.height, p.side, p.depth);
  // Estimates: carcass ≈ 50 kg/m plus fridge and full water tank; €1.5–3k per metre plus fridge.
  const m = furniture(id, 'kitchenBlock', label, [
    ...partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height - 30)),
    ...partsOf(ctx.van, 'counter', box(p.x0, x1, y0, y1, p.height - 30, p.height)),
  ], Math.round(p.length * 0.05) + fridge.massKg + p.waterL,
  [Math.round(p.length * 1.5) + fridge.costEur[0], Math.round(p.length * 3) + fridge.costEur[1]]);
  m.kitchen = { counterLength: p.length, fridgeL: fridge.litres, waterL: p.waterL };
  return m;
}

export interface WardrobeParams { x0: number; length: number; depth: number; height: number; side: Side }

export function wardrobe(id: string, label: string, p: WardrobeParams, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const [y0, y1] = againstWall(ctx, p.x0, x1, p.height, p.side, p.depth);
  return furniture(id, 'wardrobe', label, partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height)),
    Math.round(p.length * 0.03), [Math.round(p.length * 1.2), Math.round(p.length * 2.5)]);
}

/** innerY: absolute Y of the locker's inner face. */
export interface LockerParams { x0: number; length: number; height: number; side: Side; innerY: number }

export function sideLocker(id: string, label: string, p: LockerParams, ctx: BuildCtx): PlacedModule {
  const x1 = p.x0 + p.length;
  const wall = wallInner(ctx.van, p.x0, x1, 0, p.height, p.side);
  const [y0, y1] = p.side === 'left' ? [wall + WALL_GAP, -p.innerY] : [p.innerY, wall - WALL_GAP];
  return furniture(id, 'sideLocker', label, partsOf(ctx.van, 'carcass', box(p.x0, x1, y0, y1, 0, p.height)),
    Math.round(p.length * 0.015), [Math.round(p.length * 0.4), Math.round(p.length * 0.9)]);
}

export interface BoxKitchenParams {
  x0: number; length: number; width: number; height: number; yCenter: number; fridge: FridgeId; waterL: number;
}

export function boxKitchen(id: string, label: string, p: BoxKitchenParams, fridge: Fridge, _ctx: BuildCtx): PlacedModule {
  const m = furniture(id, 'boxKitchen', label, [{
    role: 'carcass',
    box: box(p.x0, p.x0 + p.length, p.yCenter - p.width / 2, p.yCenter + p.width / 2, 0, p.height),
  }], 15 + fridge.massKg + p.waterL, [400 + fridge.costEur[0], 900 + fridge.costEur[1]]);
  m.removable = true;
  m.kitchen = { counterLength: p.length, fridgeL: fridge.litres, waterL: p.waterL };
  return m;
}

export interface FactoryBenchParams { frontX: number; width: number }

export function factoryBench(id: string, label: string, p: FactoryBenchParams, ctx: BuildCtx): PlacedModule {
  const y0 = -p.width / 2;
  const y1 = p.width / 2;
  const seat = benchSeat(p.frontX, y0, y1);
  const parts: Part[] = ctx.state === 'seated'
    ? seat
    // Bed mode: the backrest folds forward onto the cushion.
    : [seat[0], seat[1], { role: 'backrest', box: box(p.frontX, p.frontX + SEAT_DEPTH, y0, y1, SEAT_Z, SEAT_Z + MATTRESS) }];
  return {
    id, kind: 'factoryBench', label, parts, seats: 3, approvedSeats: 3, isRearSeat: true, removable: false,
    massKg: 0, costEur: [0, 0],
  };
}

export interface PlatformParams { x0: number; nominalLength: number; width: number }

/** Bed kit over the factory bench: fixed storage box behind the bench, top extends over the folded bench. */
export function bedPlatform(id: string, label: string, p: PlatformParams, ctx: BuildCtx): PlacedModule {
  const { van } = ctx;
  const length = Math.min(p.nominalLength, van.rearLimitX - p.x0);
  const half = p.width / 2;
  const boxHalf = Math.min(half - 60, van.arch.innerHalf - ARCH_CLEARANCE);
  const boxX0 = p.x0 + SEAT_DEPTH + BACK_DEPTH;
  const x1 = p.x0 + length;
  const m = furniture(id, 'bedPlatform', label, [
    { role: 'carcass', box: box(boxX0, x1, -boxHalf, boxHalf, 0, PLATFORM_Z - MATTRESS) },
    { role: 'mattress', box: box(ctx.state === 'bed' ? p.x0 : boxX0, x1, -half, half, PLATFORM_Z - MATTRESS, PLATFORM_Z) },
  ], 35, [1600, 2200]);
  m.bed = { x0: p.x0, x1, y0: -half, y1: half, z: PLATFORM_Z };
  return m;
}

export function popTopBed(id: string, ctx: BuildCtx): PlacedModule {
  const { x, bed } = ctx.van.popTop;
  const H = ctx.van.interiorHeight;
  const x0 = x[1] - bed.length;
  const y0 = -bed.width / 2;
  const y1 = bed.width / 2;
  const m = furniture(id, 'popTopBed', 'Pop-top roof bed',
    [{ role: 'mattress', box: box(x0, x[1], y0, y1, H + 20, H + 100) }], 75, [4500, 7500]);
  m.roofBed = { x0, x1: x[1], y0, y1, z: H + 100 };
  return m;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/furniture.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/modules/furniture.ts tests/core/furniture.test.ts
git commit -m "feat(core): furniture modules with wall and wheel-arch fitting"
```

---

### Task 7: Presets

**Files:** Create `data/presets/coast.json`, `beach.json`, `trio.json`, `singles.json`, `budget.json`, `src/core/presets.ts`, `tests/core/presets.test.ts`

These positions were chosen so that every default preset is collision-free. Every gap was checked against the body model from Task 4.

- [ ] **Step 1: Write the preset data**

Write `data/presets/coast.json`:

```json
{
  "id": "coast",
  "name": "Coast-style",
  "basedOn": "VW California 6.1 Coast / Ocean",
  "summary": "Driver-side kitchen block (sink, hob, 42 L compressor fridge, 30 L water), 2-seat bench on long floor rails, wardrobe rear left.",
  "sources": [
    "https://www.promobil.de/einzeltest/volkswagen-t6-1-california-ocean-2020/",
    "https://www.caliboard.de/topic/12680-original-küchenblock-maße-gesucht-abstand-zu-schienen/"
  ],
  "removedKg": 70,
  "modules": [
    { "id": "cab", "kind": "cabSeats", "label": "Cab seats", "params": { "passenger": "doubleBench" } },
    { "id": "kitchen", "kind": "kitchenBlock", "label": "Kitchen block", "params": { "x0": 1470, "length": 1430, "maxLength": 1430, "depth": 380, "height": 800, "side": "left", "fridge": "compressor42", "waterL": 30 } },
    { "id": "wardrobe", "kind": "wardrobe", "label": "Wardrobe", "params": { "x0": 2900, "length": 450, "depth": 320, "height": 1250, "side": "left" } },
    { "id": "bench", "kind": "rnrBench", "label": "Rear bench", "params": { "model": "cali-1140", "frontX": 1920, "yCenter": 200, "railRange": [1620, 2220], "railStep": 100, "removable": true } }
  ]
}
```

Write `data/presets/beach.json`:

```json
{
  "id": "beach",
  "name": "Beach-style",
  "basedOn": "VW California Beach Camper",
  "summary": "No fixed kitchen: wide 2-seat bench whose bed flaps give a 1500 mm bed, low lockers behind the wheel arches, portable box kitchen in the boot.",
  "sources": ["https://cookiescampers.ie/wp-content/uploads/2023/07/california-brochure-BEACH.pdf"],
  "removedKg": 70,
  "modules": [
    { "id": "cab", "kind": "cabSeats", "label": "Cab seats", "params": { "passenger": "doubleBench" } },
    { "id": "bench", "kind": "rnrBench", "label": "Rear bench", "params": { "model": "beach-1500", "frontX": 1870, "yCenter": 0, "railRange": [1670, 2170], "railStep": 100, "removable": true } },
    { "id": "lockerL", "kind": "sideLocker", "label": "Locker left", "params": { "x0": 3460, "length": 410, "height": 340, "side": "left", "innerY": 610 } },
    { "id": "lockerR", "kind": "sideLocker", "label": "Locker right", "params": { "x0": 3460, "length": 410, "height": 340, "side": "right", "innerY": 610 } },
    { "id": "boxKitchen", "kind": "boxKitchen", "label": "Box kitchen", "params": { "x0": 3300, "length": 550, "width": 600, "height": 330, "yCenter": 0, "fridge": "coolbox", "waterL": 10 } }
  ]
}
```

Write `data/presets/trio.json`:

```json
{
  "id": "trio",
  "name": "TrioStyle-like",
  "basedOn": "Reimo TrioStyle T6.1 KR",
  "summary": "Slim driver-side kitchen with fridge, Variotech-class 3-seat bench on rails (6 lock positions) for a 6th seat, slim tall cabinet.",
  "sources": ["https://www.reimo.com/media/reimo-com/media/pdf/f1/33/7f/Katalog_VW_T6-1_TrioStyle_2021_web.pdf"],
  "removedKg": 70,
  "modules": [
    { "id": "cab", "kind": "cabSeats", "label": "Cab seats", "params": { "passenger": "doubleBench" } },
    { "id": "kitchen", "kind": "kitchenBlock", "label": "Kitchen block", "params": { "x0": 1470, "length": 1330, "maxLength": 1330, "depth": 300, "height": 800, "side": "left", "fridge": "compressor42", "waterL": 24 } },
    { "id": "wardrobe", "kind": "wardrobe", "label": "Tall cabinet", "params": { "x0": 2800, "length": 500, "depth": 230, "height": 1250, "side": "left" } },
    { "id": "bench", "kind": "rnrBench", "label": "Rear bench", "params": { "model": "reimo-v3000", "frontX": 1870, "yCenter": 160, "railRange": [1730, 2080], "railStep": 70, "removable": true } }
  ]
}
```

Write `data/presets/singles.json`:

```json
{
  "id": "singles",
  "name": "Two sliding singles",
  "basedOn": "MAL Tourliner / Smart Bed rail systems",
  "summary": "Two 600 mm rock-and-roll singles on rails that slide together into one bed and can each be removed; short driver-side kitchen and low locker.",
  "sources": ["https://www.mal-vw.co.uk/tourliner.html", "https://www.t6forum.com/threads/rib-bed-rail-system-width.55643/"],
  "removedKg": 70,
  "modules": [
    { "id": "cab", "kind": "cabSeats", "label": "Cab seats", "params": { "passenger": "doubleBench" } },
    { "id": "kitchen", "kind": "kitchenBlock", "label": "Kitchen block", "params": { "x0": 1470, "length": 1000, "maxLength": 1100, "depth": 340, "height": 800, "side": "left", "fridge": "coolbox", "waterL": 20 } },
    { "id": "locker", "kind": "sideLocker", "label": "Low locker", "params": { "x0": 2480, "length": 1390, "height": 340, "side": "left", "innerY": 440 } },
    { "id": "seatL", "kind": "rnrBench", "label": "Rear seat left", "params": { "model": "single-600", "frontX": 1920, "yCenter": -130, "railRange": [1620, 2220], "railStep": 100, "removable": true } },
    { "id": "seatR", "kind": "rnrBench", "label": "Rear seat right", "params": { "model": "single-600", "frontX": 1920, "yCenter": 475, "railRange": [1620, 2220], "railStep": 100, "removable": true } }
  ]
}
```

Write `data/presets/budget.json`:

```json
{
  "id": "budget",
  "name": "Budget: keep Mixto bench",
  "basedOn": "multivan-shop.cz bed kit for the factory 3-seat bench",
  "summary": "Keeps the fixed factory 3-seat bench; partition removed; bed-kit platform with storage box behind the bench. Cheapest, but the bed is short.",
  "sources": ["https://www.multivan-shop.cz/luzkova-uprava-pro-vw-t5/t6/t6-1-transporter/caravelle-kratky-rozvor-s-trojlavici"],
  "removedKg": 25,
  "modules": [
    { "id": "cab", "kind": "cabSeats", "label": "Cab seats", "params": { "passenger": "doubleBench" } },
    { "id": "bench", "kind": "factoryBench", "label": "Factory Mixto bench (fixed)", "params": { "frontX": 1700, "width": 1430 } },
    { "id": "platform", "kind": "bedPlatform", "label": "Bed-kit platform", "params": { "x0": 1700, "nominalLength": 1880, "width": 1430 } }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Write `tests/core/presets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { benchById } from '../../src/core/catalog';
import { PRESETS, presetById } from '../../src/core/presets';

describe('presets', () => {
  it('has five presets with unique ids', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['coast', 'beach', 'trio', 'singles', 'budget']);
  });
  it('gives every preset cab seats', () => {
    for (const p of PRESETS) expect(p.modules.some((m) => m.kind === 'cabSeats')).toBe(true);
  });
  it('references only known bench models', () => {
    for (const p of PRESETS) {
      for (const m of p.modules.filter((x) => x.kind === 'rnrBench')) {
        expect(benchById(m.params.model as string), `${p.id}/${m.id}`).toBeDefined();
      }
    }
  });
  it('throws on unknown ids', () => {
    expect(() => presetById('nope')).toThrow(/Unknown preset/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/core/presets.test.ts`
Expected: FAIL, because `src/core/presets` cannot be resolved.

- [ ] **Step 4: Implement**

Write `src/core/presets.ts`:

```ts
import beach from '../../data/presets/beach.json';
import budget from '../../data/presets/budget.json';
import coast from '../../data/presets/coast.json';
import singles from '../../data/presets/singles.json';
import trio from '../../data/presets/trio.json';
import type { Preset } from './types';

export const PRESETS: Preset[] = [coast, beach, trio, singles, budget] as unknown as Preset[];

export function presetById(id: string): Preset {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown preset ${id}`);
  return p;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/core/presets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add data/presets src/core/presets.ts tests/core/presets.test.ts
git commit -m "feat(data): five researched conversion presets"
```

---

### Task 8: Layout builder with overrides

**Files:** Create `src/core/layout.ts`, `tests/core/layout.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/core/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VAN } from '../../src/core/data';
import { buildLayout, snapToRail } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';

const coast = presetById('coast');
const bench = (l: ReturnType<typeof buildLayout>, id = 'bench') => l.modules.find((m) => m.id === id)!;

describe('snapToRail', () => {
  it('clamps and snaps to lock positions', () => {
    expect(snapToRail(1955, [1620, 2220], 100)).toBe(1920);
    expect(snapToRail(5000, [1620, 2220], 100)).toBe(2220);
    expect(snapToRail(0, [1620, 2220], 100)).toBe(1620);
  });
});

describe('buildLayout', () => {
  it('builds the default coast layout', () => {
    const l = buildLayout(VAN, coast);
    expect(l.state).toBe('seated');
    expect(l.modules.map((m) => m.id)).toEqual(['cab', 'kitchen', 'wardrobe', 'bench']);
    expect(bench(l).bed!.x0).toBe(1920);
    expect(l.notes).toEqual([]);
  });

  it('snaps an off-rail bench position and says so', () => {
    const l = buildLayout(VAN, coast, { benchFrontX: 1955 });
    expect(bench(l).bed!.x0).toBe(1920);
    expect(l.notes[0]).toMatch(/snapped/);
  });

  it('limits the kitchen length', () => {
    const l = buildLayout(VAN, coast, { kitchenLength: 2000 });
    expect(l.modules.find((m) => m.id === 'kitchen')!.kitchen!.counterLength).toBe(1430);
    expect(l.notes[0]).toMatch(/Kitchen length limited/);
  });

  it('adds the roof bed when the pop-top is on', () => {
    const l = buildLayout(VAN, coast, { popTop: true });
    expect(l.modules.some((m) => m.kind === 'popTopBed')).toBe(true);
  });

  it('swaps the front passenger seat', () => {
    expect(buildLayout(VAN, coast, { passenger: 'singleSwivel' }).modules[0].seats).toBe(2);
  });

  it('swaps the bench model only when the preset has one bench', () => {
    const l = buildLayout(VAN, coast, { benchModel: 'rib-1200' });
    expect(bench(l).bed!.y1 - bench(l).bed!.y0).toBe(1200);
    const singles = buildLayout(VAN, presetById('singles'), { benchModel: 'rib-1200' });
    expect(bench(singles, 'seatL').bed!.y1 - bench(singles, 'seatL').bed!.y0).toBe(600);
  });

  it('keeps the preset bench for an unknown model', () => {
    const l = buildLayout(VAN, coast, { benchModel: 'nope' });
    expect(bench(l).seats).toBe(2);
    expect(l.notes[0]).toMatch(/Unknown bench model/);
  });

  it('switches fridge in every kitchen', () => {
    const l = buildLayout(VAN, presetById('beach'), { fridge: 'compressor42' });
    expect(l.modules.find((m) => m.id === 'boxKitchen')!.kitchen!.fridgeL).toBe(42);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/layout.test.ts`
Expected: FAIL, because `src/core/layout` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/layout.ts`:

```ts
import { benchById, fridgeById } from './catalog';
import {
  bedPlatform, boxKitchen, factoryBench, kitchenBlock, popTopBed, sideLocker, wardrobe,
  type BoxKitchenParams, type FactoryBenchParams, type KitchenParams, type LockerParams, type PlatformParams,
  type WardrobeParams,
} from './modules/furniture';
import { cabSeats, rnrBench, type CabSeatsParams, type RnrBenchParams } from './modules/seating';
import type { BedState, BuildCtx, FridgeId, ModuleSpec, PlacedModule, Preset, Van } from './types';

export interface Overrides {
  state?: BedState;
  popTop?: boolean;
  passenger?: 'doubleBench' | 'singleSwivel';
  benchFrontX?: number;
  benchModel?: string;
  kitchenLength?: number;
  fridge?: FridgeId;
}

export interface Layout {
  van: Van;
  preset: Preset;
  state: BedState;
  popTop: boolean;
  modules: PlacedModule[];
  /** Human-readable notes about clamped or ignored overrides. */
  notes: string[];
}

export const KITCHEN_MIN_LENGTH = 600;

export function snapToRail(value: number, range: [number, number], step: number): number {
  const clamped = Math.min(range[1], Math.max(range[0], value));
  return range[0] + Math.round((clamped - range[0]) / step) * step;
}

export function benchSpecs(preset: Preset): ModuleSpec[] {
  return preset.modules.filter((m) => m.kind === 'rnrBench');
}

const params = <T>(spec: ModuleSpec): T => spec.params as unknown as T;

export function buildLayout(van: Van, preset: Preset, o: Overrides = {}): Layout {
  const state = o.state ?? 'seated';
  const popTop = o.popTop ?? false;
  const ctx: BuildCtx = { van, state, popTop };
  const notes = new Set<string>();
  const singleBench = benchSpecs(preset).length === 1;

  const modules = preset.modules.map((spec): PlacedModule => {
    switch (spec.kind) {
      case 'cabSeats': {
        const p = params<CabSeatsParams>(spec);
        return cabSeats(spec.id, { passenger: o.passenger ?? p.passenger }, ctx);
      }
      case 'rnrBench': {
        const p = params<RnrBenchParams>(spec);
        let frontX = p.frontX;
        if (o.benchFrontX !== undefined) {
          frontX = snapToRail(o.benchFrontX, p.railRange, p.railStep);
          if (frontX !== o.benchFrontX) notes.add(`Bench position ${o.benchFrontX} mm snapped to rail lock position ${frontX} mm`);
        }
        let model = benchById(p.model);
        if (singleBench && o.benchModel) {
          const chosen = benchById(o.benchModel);
          if (chosen) model = chosen;
          else notes.add(`Unknown bench model "${o.benchModel}", using ${p.model}`);
        }
        if (!model) throw new Error(`Preset ${preset.id} references unknown bench ${p.model}`);
        return rnrBench(spec.id, spec.label, model, { ...p, frontX }, ctx);
      }
      case 'factoryBench':
        return factoryBench(spec.id, spec.label, params<FactoryBenchParams>(spec), ctx);
      case 'bedPlatform':
        return bedPlatform(spec.id, spec.label, params<PlatformParams>(spec), ctx);
      case 'kitchenBlock': {
        const p = params<KitchenParams>(spec);
        let length = p.length;
        if (o.kitchenLength !== undefined) {
          length = Math.min(p.maxLength, Math.max(KITCHEN_MIN_LENGTH, Math.round(o.kitchenLength)));
          if (length !== o.kitchenLength) {
            notes.add(`Kitchen length limited to ${length} mm (range ${KITCHEN_MIN_LENGTH}–${p.maxLength})`);
          }
        }
        return kitchenBlock(spec.id, spec.label, { ...p, length }, fridgeById(o.fridge ?? p.fridge), ctx);
      }
      case 'boxKitchen': {
        const p = params<BoxKitchenParams>(spec);
        return boxKitchen(spec.id, spec.label, p, fridgeById(o.fridge ?? p.fridge), ctx);
      }
      case 'wardrobe':
        return wardrobe(spec.id, spec.label, params<WardrobeParams>(spec), ctx);
      case 'sideLocker':
        return sideLocker(spec.id, spec.label, params<LockerParams>(spec), ctx);
      case 'popTopBed':
        return popTopBed(spec.id, ctx);
    }
  });

  if (popTop) modules.push(popTopBed('poptop', ctx));
  return { van, preset, state, popTop, modules, notes: [...notes] };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/layout.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/layout.ts tests/core/layout.test.ts
git commit -m "feat(core): layout builder with clamped overrides"
```

---

### Task 9: Metrics

**Files:** Create `src/core/metrics.ts`, `tests/core/metrics.test.ts`

Definitions:
- **Bed:** the largest group of bed rectangles at the same height that touch in Y (gap ≤ 40 mm) and overlap in X. This is how two singles become one bed.
- **Boot:** measured in the seated state, from the back of the rearmost rear seat to the tailgate. Its volume is the free space between the wheel arches, up to the ceiling, counted on a 50 mm voxel grid.
- **Payload left** = GVW − kerb − conversion mass − 75 kg per travel seat.

- [ ] **Step 1: Write the failing test**

Write `tests/core/metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VAN } from '../../src/core/data';
import { buildLayout, type Overrides } from '../../src/core/layout';
import { bedSize, combinedBed, computeMetrics } from '../../src/core/metrics';
import { presetById } from '../../src/core/presets';

function metricsFor(id: string, o: Overrides = {}) {
  const p = presetById(id);
  return computeMetrics(buildLayout(VAN, p, { ...o, state: 'seated' }), buildLayout(VAN, p, { ...o, state: 'bed' }));
}

describe('combinedBed', () => {
  it('merges two touching singles', () => {
    const r = combinedBed([
      { x0: 1920, x1: 3870, y0: -430, y1: 170, z: 450 },
      { x0: 1920, x1: 3870, y0: 175, y1: 775, z: 450 },
    ]);
    expect(bedSize(r)).toEqual({ length: 1950, width: 1205 });
  });
  it('keeps distant beds apart and returns the biggest', () => {
    const r = combinedBed([
      { x0: 0, x1: 1000, y0: 0, y1: 500, z: 450 },
      { x0: 0, x1: 2000, y0: 700, y1: 1300, z: 450 },
    ]);
    expect(bedSize(r)).toEqual({ length: 2000, width: 600 });
  });
  it('returns null without beds', () => {
    expect(combinedBed([])).toBeNull();
  });
});

describe('computeMetrics', () => {
  it('coast-style', () => {
    const m = metricsFor('coast');
    expect(m.bed).toEqual({ length: 1950, width: 1140 });
    expect(m.seats).toBe(5);
    expect(m.sleepers).toBe(2);
    expect(m.rearLegroom).toBe(570);
    expect(m.bootLength).toBe(1300);
    expect(m.bootVolumeL).toBeGreaterThan(1850);
    expect(m.bootVolumeL).toBeLessThan(2100);
    expect(m.counterLength).toBe(1430);
    expect(m.fridgeL).toBe(42);
    expect(m.waterL).toBe(30);
    expect(m.rearSeatsRemovable).toBe(true);
    expect(m.conversionKg).toBe(121);
    expect(m.payloadLeftKg).toBe(386);
    expect(m.standingHeight).toBe(1370);
  });
  it('pop-top adds a roof bed and standing height', () => {
    const m = metricsFor('coast', { popTop: true });
    expect(m.roofBed).toEqual({ length: 2000, width: 1200 });
    expect(m.sleepers).toBe(4);
    expect(m.standingHeight).toBe(2300);
  });
  it('trio seats six', () => {
    const m = metricsFor('trio');
    expect(m.seats).toBe(6);
    expect(m.bed).toEqual({ length: 2000, width: 1260 });
  });
  it('beach bed is 1500 wide', () => {
    expect(metricsFor('beach').bed).toEqual({ length: 2000, width: 1500 });
  });
  it('singles combine into one bed', () => {
    expect(metricsFor('singles').bed).toEqual({ length: 1950, width: 1205 });
  });
  it('budget keeps the fixed factory bench', () => {
    const m = metricsFor('budget');
    expect(m.bed).toEqual({ length: 1880, width: 1430 });
    expect(m.rearSeatsRemovable).toBe(false);
    expect(m.seats).toBe(6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/metrics.test.ts`
Expected: FAIL, because `src/core/metrics` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/metrics.ts`:

```ts
import { overlap1d } from './geometry';
import type { Layout } from './layout';
import type { BedRect, Box, PlacedModule, Van } from './types';

export const PERSON_KG = 75;
export const GRID = 50;
export const BED_MERGE_GAP = 40;

export interface BedSize { length: number; width: number }

export interface Metrics {
  seats: number;
  approvedSeats: number;
  rearSeatsRemovable: boolean;
  bed: BedSize | null;
  bedRect: BedRect | null;
  roofBed: BedSize | null;
  sleepers: number;
  rearLegroom: number | null;
  counterLength: number;
  fridgeL: number;
  waterL: number;
  bootLength: number;
  bootVolumeL: number;
  standingHeight: number;
  conversionKg: number;
  payloadLeftKg: number;
  costEur: [number, number];
}

const area = (r: BedRect) => (r.x1 - r.x0) * (r.y1 - r.y0);

export function combinedBed(beds: BedRect[]): BedRect | null {
  if (!beds.length) return null;
  const sorted = [...beds].sort((a, b) => a.y0 - b.y0);
  const groups: BedRect[] = [];
  for (const b of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g.z - b.z) < 1 && b.y0 - g.y1 <= BED_MERGE_GAP && overlap1d(g.x0, g.x1, b.x0, b.x1) > 0) {
      groups[groups.length - 1] = {
        x0: Math.max(g.x0, b.x0), x1: Math.min(g.x1, b.x1), y0: g.y0, y1: Math.max(g.y1, b.y1), z: g.z,
      };
    } else {
      groups.push({ ...b });
    }
  }
  return groups.reduce((best, r) => (area(r) > area(best) ? r : best));
}

export function bedSize(r: BedRect | null): BedSize | null {
  return r ? { length: Math.round(r.x1 - r.x0), width: Math.round(r.y1 - r.y0) } : null;
}

/** Free volume in litres between the wheel arches from x0 to x1, floor to ceiling. */
export function freeVolumeL(van: Van, boxes: Box[], x0: number, x1: number): number {
  const half = van.arch.innerHalf;
  const relevant = boxes.filter((b) => b.max[0] > x0 && b.min[0] < x1);
  let free = 0;
  for (let x = x0 + GRID / 2; x < x1; x += GRID) {
    for (let y = -half + GRID / 2; y < half; y += GRID) {
      for (let z = GRID / 2; z < van.interiorHeight; z += GRID) {
        const hit = relevant.some((b) =>
          x >= b.min[0] && x <= b.max[0] && y >= b.min[1] && y <= b.max[1] && z >= b.min[2] && z <= b.max[2]);
        if (!hit) free++;
      }
    }
  }
  return Math.round((free * GRID ** 3) / 1e6);
}

const minX = (m: PlacedModule) => Math.min(...m.parts.map((p) => p.box.min[0]));
const maxX = (m: PlacedModule) => Math.max(...m.parts.map((p) => p.box.max[0]));
const sum = (ms: PlacedModule[], f: (m: PlacedModule) => number) => ms.reduce((s, m) => s + f(m), 0);

/** Seated-state layout gives seats, legroom and boot; bed-state layout gives the beds. */
export function computeMetrics(seated: Layout, bedLayout: Layout): Metrics {
  const { van } = seated;
  const mods = seated.modules;
  const rear = mods.filter((m) => m.isRearSeat);
  const seats = sum(mods, (m) => m.seats);
  const bedRect = combinedBed(bedLayout.modules.flatMap((m) => (m.bed ? [m.bed] : [])));
  const bed = bedSize(bedRect);
  const roofBed = bedSize(bedLayout.modules.find((m) => m.roofBed)?.roofBed ?? null);
  const bootX0 = rear.length ? Math.max(...rear.map(maxX)) : van.livingStartX;
  const boxes = mods.filter((m) => m.kind !== 'popTopBed').flatMap((m) => m.parts.map((p) => p.box));
  const kitchens = mods.flatMap((m) => (m.kitchen ? [m.kitchen] : []));
  const conversionKg = sum(mods, (m) => m.massKg) - seated.preset.removedKg;
  return {
    seats,
    approvedSeats: sum(mods, (m) => m.approvedSeats),
    rearSeatsRemovable: rear.length > 0 && rear.every((m) => m.removable),
    bed,
    bedRect,
    roofBed,
    sleepers: (bed ? (bed.width >= 1100 ? 2 : 1) : 0) + (roofBed ? 2 : 0),
    rearLegroom: rear.length ? Math.min(...rear.map(minX)) - van.cab.seatBackX : null,
    counterLength: kitchens.reduce((s, k) => s + k.counterLength, 0),
    fridgeL: kitchens.reduce((s, k) => s + k.fridgeL, 0),
    waterL: kitchens.reduce((s, k) => s + k.waterL, 0),
    bootLength: Math.max(0, van.rearLimitX - bootX0),
    bootVolumeL: freeVolumeL(van, boxes, bootX0, van.rearLimitX),
    standingHeight: seated.popTop ? van.interiorHeight + van.popTop.lift : van.interiorHeight,
    conversionKg,
    payloadLeftKg: van.gvwKg - van.kerbKg - conversionKg - seats * PERSON_KG,
    costEur: [sum(mods, (m) => m.costEur[0]), sum(mods, (m) => m.costEur[1])],
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/metrics.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/metrics.ts tests/core/metrics.test.ts
git commit -m "feat(core): layout metrics (bed, boot volume, payload, cost)"
```

---

### Task 10: Checks and evaluation

**Files:** Create `src/core/checks.ts`, `tests/core/checks.test.ts`, `tests/core/presetSmoke.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `tests/core/checks.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { doorGap, evaluate, metricChecks } from '../../src/core/checks';
import { VAN } from '../../src/core/data';
import { buildLayout } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';

const codes = (id: string, o = {}) => evaluate(VAN, presetById(id), o).checks.map((c) => c.code);

describe('checks', () => {
  it('measures the sliding-door step-in gap', () => {
    expect(doorGap(buildLayout(VAN, presetById('coast')))).toBe(490);
  });
  it('warns when the bench blocks the sliding door', () => {
    expect(codes('coast', { benchFrontX: 1620 })).toContain('DOOR');
  });
  it('reports a seat standing over the wheel arch', () => {
    expect(codes('coast', { benchFrontX: 2220 })).toContain('SEAT_ON_ARCH');
  });
  it('reports colliding modules', () => {
    const ev = evaluate(VAN, presetById('singles'), { kitchenLength: 1100 });
    const c = ev.checks.find((x) => x.code === 'COLLISION')!;
    expect(c.moduleIds).toEqual(['kitchen', 'locker']);
  });
  it('flags a short bed', () => {
    const ev = evaluate(VAN, presetById('budget'));
    expect(metricChecks(ev.metrics).map((c) => c.code)).toContain('BED_SHORT');
  });
  it('orders errors before warnings before info', () => {
    const levels = evaluate(VAN, presetById('budget')).checks.map((c) => c.level);
    expect(levels).toEqual([...levels].sort((a, b) => ['error', 'warn', 'info'].indexOf(a) - ['error', 'warn', 'info'].indexOf(b)));
  });
});
```

Write `tests/core/presetSmoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/core/checks';
import { VAN } from '../../src/core/data';
import { PRESETS } from '../../src/core/presets';

const expected: Record<string, string[]> = {
  coast: ['BED_NARROW_PREF', 'HEADROOM'],
  beach: ['HEADROOM'],
  trio: ['HEADROOM'],
  singles: ['HEADROOM'],
  budget: ['BED_SHORT', 'HEADROOM', 'REAR_FIXED'],
};

describe('preset smoke test', () => {
  for (const p of PRESETS) {
    it(`${p.id}: only the expected checks`, () => {
      const checks = evaluate(VAN, p).checks;
      expect(checks.map((c) => c.code).sort(), checks.map((c) => c.message).join('\n')).toEqual(expected[p.id]);
    });
    it(`${p.id} with pop-top: no headroom note, nothing else new`, () => {
      const checks = evaluate(VAN, p, { popTop: true }).checks;
      expect(checks.map((c) => c.code).sort(), checks.map((c) => c.message).join('\n'))
        .toEqual(expected[p.id].filter((c) => c !== 'HEADROOM'));
    });
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/core/checks.test.ts tests/core/presetSmoke.test.ts`
Expected: FAIL, because `src/core/checks` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/checks.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/checks.test.ts tests/core/presetSmoke.test.ts`
Expected: PASS (6 + 10 tests). If a smoke test fails with `COLLISION` or `BODY`, the assertion message lists the offending modules. Adjust that preset's JSON (keep gaps of at least 2 mm) and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/core/checks.ts tests/core/checks.test.ts tests/core/presetSmoke.test.ts
git commit -m "feat(core): collision, body, door and requirement checks"
```

---

### Task 11: Comparison ranking and URL state

**Files:** Create `src/core/compare.ts`, `src/core/urlState.ts`, `tests/core/compare.test.ts`, `tests/core/urlState.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `tests/core/compare.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bestMatch, compareAll, rankRows } from '../../src/core/compare';
import { VAN } from '../../src/core/data';
import { PRESETS } from '../../src/core/presets';

describe('compare', () => {
  it('ranks passing presets by bed width', () => {
    const ranked = rankRows(compareAll(VAN, PRESETS, {})).map((r) => r.preset.id);
    expect(ranked).toEqual(['beach', 'trio', 'singles', 'coast', 'budget']);
  });
  it('picks the best match', () => {
    expect(bestMatch(compareAll(VAN, PRESETS, {}))).toBe('beach');
  });
  it('applies tweaks only to the current preset', () => {
    const rows = compareAll(VAN, PRESETS, {}, { id: 'beach', overrides: { benchFrontX: 2170 } });
    expect(rows.find((r) => r.preset.id === 'beach')!.hard.bed).toBe(false);
    expect(bestMatch(rows)).toBe('trio');
  });
  it('marks the budget preset as failing', () => {
    const budget = compareAll(VAN, PRESETS, {}).find((r) => r.preset.id === 'budget')!;
    expect(budget.hard).toEqual({ seats: true, bed: false, removableRear: false });
    expect(budget.passesAll).toBe(false);
  });
});
```

Write `tests/core/urlState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decodeState, encodeState, type AppState } from '../../src/core/urlState';

const ids = ['coast', 'beach'];

describe('url state', () => {
  it('round-trips', () => {
    const s: AppState = {
      presetId: 'beach',
      view: 'plan',
      overrides: { state: 'bed', popTop: true, passenger: 'singleSwivel', benchFrontX: 1970, benchModel: 'rib-1200', kitchenLength: 900, fridge: 'coolbox' },
    };
    expect(decodeState(`#${encodeState(s)}`, ids)).toEqual(s);
  });
  it('falls back on garbage', () => {
    expect(decodeState('#preset=nope&view=x&popTop=maybe&benchFrontX=abc&fridge=ice', ids))
      .toEqual({ presetId: 'coast', view: 'orbit', overrides: {} });
  });
  it('handles an empty hash', () => {
    expect(decodeState('', ids)).toEqual({ presetId: 'coast', view: 'orbit', overrides: {} });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/core/compare.test.ts tests/core/urlState.test.ts`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/compare.ts`:

```ts
import { evaluate, MIN_BED_LENGTH, MIN_BED_WIDTH, MIN_TRAVEL_SEATS, type Check } from './checks';
import type { Overrides } from './layout';
import type { Metrics } from './metrics';
import type { Preset, Van } from './types';

export interface HardRequirements { seats: boolean; bed: boolean; removableRear: boolean }

export interface CompareRow {
  preset: Preset;
  metrics: Metrics;
  checks: Check[];
  hard: HardRequirements;
  passesAll: boolean;
  errors: number;
}

export type GlobalOverrides = Pick<Overrides, 'popTop' | 'passenger'>;

/** Evaluates every preset with the global overrides; the current preset also gets its own tweaks. */
export function compareAll(
  van: Van, presets: Preset[], global: GlobalOverrides, current?: { id: string; overrides: Overrides },
): CompareRow[] {
  return presets.map((preset) => {
    const o = current && current.id === preset.id ? { ...current.overrides, ...global } : { ...global };
    const { metrics, checks } = evaluate(van, preset, o);
    const hard: HardRequirements = {
      seats: metrics.seats >= MIN_TRAVEL_SEATS,
      bed: !!metrics.bed && metrics.bed.length >= MIN_BED_LENGTH && metrics.bed.width >= MIN_BED_WIDTH,
      removableRear: metrics.rearSeatsRemovable,
    };
    const errors = checks.filter((c) => c.level === 'error').length;
    return { preset, metrics, checks, hard, errors, passesAll: hard.seats && hard.bed && hard.removableRear && errors === 0 };
  });
}

export function rankRows(rows: CompareRow[]): CompareRow[] {
  return [...rows].sort((a, b) =>
    Number(b.passesAll) - Number(a.passesAll) ||
    (b.metrics.bed?.width ?? 0) - (a.metrics.bed?.width ?? 0) ||
    b.metrics.bootLength - a.metrics.bootLength);
}

export function bestMatch(rows: CompareRow[]): string | null {
  const top = rankRows(rows)[0];
  return top && top.passesAll ? top.preset.id : null;
}
```

Write `src/core/urlState.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/core/compare.test.ts tests/core/urlState.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/compare.ts src/core/urlState.ts tests/core/compare.test.ts tests/core/urlState.test.ts
git commit -m "feat(core): preset comparison ranking and shareable URL state"
```

---

### Task 12: Dimensioned SVG plan

**Files:** Create `src/plan/svg.ts`, `src/plan/export.ts`, `tests/plan/svg.test.ts`

The SVG uses real millimetres as user units, so `width = sheetMm / scale` in `mm` prints at the chosen scale. The sheet has a top view (front at the left, sliding-door side at the top), a longitudinal section seen from the left, and a title block.

- [ ] **Step 1: Write the failing test**

Write `tests/plan/svg.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/plan/svg.test.ts`
Expected: FAIL, because `src/plan/svg` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/plan/svg.ts`:

```ts
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
```

Write `src/plan/export.ts`:

```ts
/** Triggers a browser download of text content. */
export function downloadText(content: string, filename: string, type = 'image/svg+xml'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/plan/svg.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/plan tests/plan
git commit -m "feat(plan): dimensioned true-scale SVG floor plan"
```

---

### Task 13: Blender shell builder (headless) and GLB check

**Files:** Create `blender/build_shell.py`, `tests/shell.test.ts`, `public/models/van.glb` (generated)

Geometry is built in the van frame, in metres. Face windings are chosen so that normals point into the cabin, which the AO bake relies on:
- Walls are lofted through the sections.
- Window and door areas become separate `_glass` and `_door` objects rather than boolean cuts.
- The roof is built in three variants. `roof_poptop_open` is an empty parent over the roof panel, the lid and the tent.

AO is baked to a vertex-colour attribute and exported as `COLOR_0`. Three.js multiplies it in automatically.

- [ ] **Step 1: Write the failing test**

Write `tests/shell.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VAN } from '../src/core/data';

const GLB = 'public/models/van.glb';

interface Gltf {
  nodes: { name: string }[];
  meshes: { primitives: { attributes: Record<string, number> }[] }[];
  accessors: { min?: number[]; max?: number[] }[];
}

function readGlbJson(path: string): Gltf {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB file');
  const length = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + length).toString('utf8')) as Gltf;
}

describe.skipIf(!existsSync(GLB))('baked van shell', () => {
  const gltf = readGlbJson(GLB);

  it('contains the named parts the app toggles', () => {
    const names = gltf.nodes.map((n) => n.name);
    for (const n of ['wall_left', 'wall_right', 'floor', 'rear_panel', 'roof_fixed', 'roof_poptop_closed', 'roof_poptop_open', 'arch_left', 'arch_right']) {
      expect(names).toContain(n);
    }
  });

  it('matches van.json within 5 mm', () => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives) {
        const acc = gltf.accessors[prim.attributes.POSITION];
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], acc.min![i]);
          max[i] = Math.max(max[i], acc.max![i]);
        }
      }
    }
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(0.005);
    near(min[0], VAN.cabFrontX / 1000);
    near(max[0], VAN.rearLimitX / 1000);
    near(min[1], 0);
    near(max[1], (VAN.interiorHeight + VAN.popTop.lift) / 1000);
    near(max[2], 0.83); // three z = −Y: left wall at Y −830
    near(min[2], -0.83);
  });

  it('carries baked AO vertex colours', () => {
    expect(gltf.meshes.some((m) => m.primitives.some((p) => 'COLOR_0' in p.attributes))).toBe(true);
  });
});
```

- [ ] **Step 2: Write the Blender script**

Write `blender/build_shell.py`:

```python
"""Build the VW T6.1 Mixto SWB interior shell from data/van.json and export it as GLB.

Usage:
  blender -b --factory-startup --python blender/build_shell.py -- --data data/van.json --out public/models/van.glb [--no-bake] [--samples 32]

Geometry is created directly in the van frame (metres): X rearward from the front axle, Y to the right,
Z up from the cargo floor. The glTF exporter converts Blender Z-up to glTF Y-up as (x, z, -y), which is the
mapping src/three/coords.ts uses, so no extra transforms are needed.
"""
import argparse
import json
import sys

import bmesh
import bpy

MM = 0.001
STEP = 100.0  # mm between grid lines; enough vertices for a smooth vertex-colour AO bake
ROW = 16      # subdivisions across floor, roof and end panels


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--no-bake", action="store_true")
    p.add_argument("--samples", type=int, default=32)
    return p.parse_args(argv)


def lerp(a, b, t):
    return a + (b - a) * t


def frange(a, b, step):
    out, v = [], a
    while v < b:
        out.append(v)
        v += step
    return out


def section_at(van, x):
    s = van["sections"]
    if x <= s[0]["x"]:
        return s[0]
    if x >= s[-1]["x"]:
        return s[-1]
    for a, b in zip(s, s[1:]):
        if a["x"] <= x <= b["x"]:
            t = (x - a["x"]) / (b["x"] - a["x"])
            return {k: [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)] for k in ("low", "belt", "roof")}
    raise ValueError(x)


def wall_y(van, x, z, side):
    s = section_at(van, x)
    k = 0 if side == "left" else 1
    if z <= van["lowZ"]:
        return s["low"][k]
    if z <= van["beltZ"]:
        return lerp(s["low"][k], s["belt"][k], (z - van["lowZ"]) / (van["beltZ"] - van["lowZ"]))
    zc = min(z, van["interiorHeight"])
    return lerp(s["belt"][k], s["roof"][k], (zc - van["beltZ"]) / (van["interiorHeight"] - van["beltZ"]))


# ---------------------------------------------------------------- materials

def principled(mat):
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return bsdf


def material(name, rgba, rough=0.8, alpha=1.0):
    mat = bpy.data.materials.new(name)
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    bsdf = principled(mat)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1.0:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        else:
            mat.blend_method = "BLEND"
    return mat


# ---------------------------------------------------------------- mesh helpers

def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def remove_loose(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    loose = [v for v in bm.verts if not v.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(ob.data)
    bm.free()


def mesh_object(name, verts, faces, mats, face_mats=None):
    """verts in mm; returns None when there are no faces."""
    if not faces:
        return None
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x * MM, y * MM, z * MM) for x, y, z in verts], [], faces)
    for m in mats:
        me.materials.append(m)
    if face_mats:
        for poly, idx in zip(me.polygons, face_mats):
            poly.material_index = idx
    me.update()
    ob = link(bpy.data.objects.new(name, me))
    remove_loose(ob)
    return ob


def grid_faces(n_rows, n_cols, reverse=False):
    faces = []
    for i in range(n_rows - 1):
        for j in range(n_cols - 1):
            a = i * n_cols + j
            f = (a, a + 1, a + 1 + n_cols, a + n_cols)
            faces.append(tuple(reversed(f)) if reverse else f)
    return faces


def box_object(name, x0, x1, y0, y1, z0, z1, mat, cuts=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    for v in bm.verts:
        v.co.x = lerp(x0, x1, v.co.x + 0.5) * MM
        v.co.y = lerp(y0, y1, v.co.y + 0.5) * MM
        v.co.z = lerp(z0, z1, v.co.z + 0.5) * MM
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return link(bpy.data.objects.new(name, me))


# ---------------------------------------------------------------- body parts

def side_wall(van, xs, side, holes, mats):
    H = van["interiorHeight"]
    zs = sorted(set([0.0, float(van["lowZ"]), float(van["beltZ"]), float(H)]
                    + [float(z) for h in holes for z in h["z"]] + frange(0.0, H, STEP)))
    zs = [z for z in zs if 0.0 <= z <= H]
    if side == "right":
        zs = zs[::-1]  # keeps normals pointing into the cabin
    verts = [(x, wall_y(van, x, z, side), z) for x in xs for z in zs]
    buckets = {"wall": [], "glass": [], "door": []}
    for i, f in enumerate(grid_faces(len(xs), len(zs))):
        xi, zj = divmod(i, len(zs) - 1)
        cx = (xs[xi] + xs[xi + 1]) / 2
        cz = (zs[zj] + zs[zj + 1]) / 2
        kind = "wall"
        for h in holes:
            if h["x"][0] <= cx <= h["x"][1] and h["z"][0] <= cz <= h["z"][1]:
                kind = h["kind"]
                if kind == "glass":
                    break
        buckets[kind].append(f)
    name = f"wall_{side}"
    return [
        mesh_object(name, verts, buckets["wall"], [mats["trim"]]),
        mesh_object(f"{name}_glass", verts, buckets["glass"], [mats["glass"]]),
        mesh_object(f"{name}_door", verts, buckets["door"], [mats["door"]]),
    ]


def floor_object(van, xs, mats):
    verts = []
    for x in xs:
        yr, yl = wall_y(van, x, 0.0, "right"), wall_y(van, x, 0.0, "left")
        verts += [(x, lerp(yr, yl, j / ROW), 0.0) for j in range(ROW + 1)]  # right → left keeps normals up
    return mesh_object("floor", verts, grid_faces(len(xs), ROW + 1), [mats["floor"]])


def end_panel(van, x, name, reverse, mats, glass_above=None):
    H = van["interiorHeight"]
    zs = sorted(set(frange(0.0, H, STEP) + [float(H)] + ([float(glass_above)] if glass_above else [])))
    verts = []
    for z in zs:
        yl, yr = wall_y(van, x, z, "left"), wall_y(van, x, z, "right")
        verts += [(x, lerp(yl, yr, j / ROW), z) for j in range(ROW + 1)]
    solid, glass = [], []
    for i, f in enumerate(grid_faces(len(zs), ROW + 1, reverse)):
        zi = i // ROW
        cz = (zs[zi] + zs[zi + 1]) / 2
        (glass if glass_above is not None and cz > glass_above else solid).append(f)
    objs = [mesh_object(name, verts, solid, [mats["dash" if glass_above else "trim"]])]
    if glass:
        objs.append(mesh_object("windshield_glass", verts, glass, [mats["glass"]]))
    return objs


def roof_strip(van, xs, name, mats, hole_mode=None):
    """hole_mode: None = plain roof, 'lid' = pop-top lid drawn in, 'cut' = opening left open."""
    H = float(van["interiorHeight"])
    px0, px1 = van["popTop"]["x"]
    hw = van["popTop"]["bed"]["width"] / 2 + 50
    verts = []
    for x in xs:
        yl, yr = section_at(van, x)["roof"]
        ys = [yl, (yl - hw) / 2, -hw] + [lerp(-hw, hw, k / 12) for k in range(1, 12)] + [hw, (hw + yr) / 2, yr]
        verts += [(x, y, H) for y in ys]
    n = 17
    faces, face_mats = [], []
    for i, f in enumerate(grid_faces(len(xs), n)):
        xi, yj = divmod(i, n - 1)
        cx = (xs[xi] + xs[xi + 1]) / 2
        cy = (verts[xi * n + yj][1] + verts[xi * n + yj + 1][1]) / 2
        in_hole = px0 <= cx <= px1 and abs(cy) < hw
        if in_hole and hole_mode == "cut":
            continue
        faces.append(f)
        face_mats.append(1 if in_hole and hole_mode == "lid" else 0)
    return mesh_object(name, verts, faces, [mats["trim"], mats["lid"]], face_mats)


def poptop_open(van, xs, mats):
    H = float(van["interiorHeight"])
    x0, x1 = van["popTop"]["x"]
    hw = van["popTop"]["bed"]["width"] / 2 + 50
    zf, zr = H + van["popTop"]["lift"], H + 150.0  # hinged at the rear, front edge raised
    panel = roof_strip(van, xs, "roof_poptop_open_panel", mats, hole_mode="cut")
    low = [(x0, -hw, H), (x0, hw, H), (x1, hw, H), (x1, -hw, H)]
    high = [(x0, -hw, zf), (x0, hw, zf), (x1, hw, zr), (x1, -hw, zr)]
    lid = mesh_object("poptop_lid", high, [(0, 1, 2, 3)], [mats["lid"]])
    tent_faces = [(k, (k + 1) % 4, 4 + (k + 1) % 4, 4 + k) for k in range(4)]
    tent = mesh_object("poptop_tent", low + high, tent_faces, [mats["tent"]])
    parent = link(bpy.data.objects.new("roof_poptop_open", None))
    for ob in (panel, lid, tent):
        ob.parent = parent
    return parent, [panel, lid, tent]


# ---------------------------------------------------------------- bake + export

def setup_cycles(samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    world = bpy.data.worlds.new("World")
    sc.world = world
    world.light_settings.distance = 0.6  # AO distance in metres


def bake_ao(objs):
    objs = [o for o in objs if o is not None and o.type == "MESH" and len(o.data.polygons) > 0]
    if not objs:
        return
    for ob in objs:
        attrs = ob.data.color_attributes
        attr = attrs.get("AO") or attrs.new("AO", "BYTE_COLOR", "CORNER")
        attrs.active_color = attr
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")


def export(out):
    base = dict(filepath=out, export_format="GLB", use_selection=False, export_yup=True, export_apply=True)
    try:
        bpy.ops.export_scene.gltf(**base, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**base, export_colors=True)


def main():
    a = parse_args()
    with open(a.data) as fh:
        van = json.load(fh)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = {
        "trim": material("trim", (0.78, 0.78, 0.76, 1.0)),
        "door": material("door", (0.70, 0.71, 0.70, 1.0)),
        "floor": material("floor", (0.22, 0.22, 0.23, 1.0), rough=0.95),
        "dash": material("dash", (0.10, 0.10, 0.11, 1.0), rough=0.6),
        "glass": material("glass", (0.55, 0.65, 0.72, 1.0), rough=0.05, alpha=0.3),
        "lid": material("lid", (0.92, 0.92, 0.90, 1.0)),
        "tent": material("tent", (0.30, 0.34, 0.38, 1.0), rough=1.0),
        "arch": material("arch", (0.60, 0.60, 0.58, 1.0)),
    }
    cab, rear = float(van["cabFrontX"]), float(van["rearLimitX"])
    edges = ([e for w in van["windows"] for e in w["x"]] + list(van["slidingDoor"]["x"]) + list(van["arch"]["x"])
             + list(van["popTop"]["x"]) + [s["x"] for s in van["sections"]])
    xs = sorted(set([cab, rear] + frange(cab, rear, STEP) + [float(e) for e in edges]))
    xs = [x for x in xs if cab <= x <= rear]

    holes = {"left": [], "right": []}
    for w in van["windows"]:
        holes[w["side"]].append({"x": w["x"], "z": w["z"], "kind": "glass"})
    door = van["slidingDoor"]
    holes[door["side"]].append({"x": door["x"], "z": [0, door["height"]], "kind": "door"})

    common = []
    common += side_wall(van, xs, "left", holes["left"], mats)
    common += side_wall(van, xs, "right", holes["right"], mats)
    common.append(floor_object(van, xs, mats))
    common += end_panel(van, rear, "rear_panel", True, mats)
    common += end_panel(van, cab, "front_panel", False, mats, glass_above=van["beltZ"])
    ax0, ax1 = van["arch"]["x"]
    inner, height = van["arch"]["innerHalf"], van["arch"]["height"]
    common.append(box_object("arch_left", ax0, ax1, wall_y(van, ax0, 0, "left"), -inner, 0, height, mats["arch"]))
    common.append(box_object("arch_right", ax0, ax1, inner, wall_y(van, ax0, 0, "right"), 0, height, mats["arch"]))
    common.append(box_object("dashboard", cab, cab + 450, -760, 760, 0, 650, mats["dash"]))

    fixed = roof_strip(van, xs, "roof_fixed", mats)
    closed = roof_strip(van, xs, "roof_poptop_closed", mats, hole_mode="lid")
    _, open_meshes = poptop_open(van, xs, mats)
    common = [o for o in common if o is not None]

    if not a.no_bake:
        setup_cycles(a.samples)
        glass = [o for o in bpy.data.objects if "glass" in o.name]
        for o in glass:
            o.hide_render = True
        # Roof variants overlap, so bake each with only itself visible. Walls etc. bake with the fixed roof.
        variants = [[fixed], [closed], open_meshes]
        targets = [[*common, fixed], [closed], open_meshes]
        for i, group in enumerate(targets):
            for j, variant in enumerate(variants):
                for o in variant:
                    o.hide_render = i != j
            bake_ao([o for o in group if "glass" not in o.name])
            print(f"baked AO pass {i + 1}/3")
        for o in bpy.data.objects:
            o.hide_render = False

    export(a.out)
    print(f"Wrote {a.out}")


main()
```

- [ ] **Step 3: Build the shell and verify**

Run: `mkdir -p public/models && npm run build:shell`
Expected: output includes `baked AO pass 3/3` and `Wrote public/models/van.glb`. It takes about 1–5 minutes on CPU.

If `bpy.ops.object.bake` fails in background mode, rerun with `-- --no-bake` to confirm the geometry, then investigate the bake. If `export_scene.gltf` raises a TypeError for an option other than the vertex-colour one, run `blender -b --python-expr "import bpy; print(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())"` and remove that option.

Run: `npx vitest run tests/shell.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add blender/build_shell.py tests/shell.test.ts public/models/van.glb
git commit -m "feat(shell): headless Blender builder with baked AO, committed GLB"
```

---

### Task 14: Three.js scene (coords, meshes, shell, orbit + cutaway)

**Files:** Create `src/three/coords.ts`, `src/three/materials.ts`, `src/three/moduleMesh.ts`, `src/three/shell.ts`, `src/three/dimensions.ts`, `src/three/scene.ts`, `tests/three/coords.test.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/three/coords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { box } from '../../src/core/geometry';
import { boxToThree, fromThree, toThree } from '../../src/three/coords';

describe('coords', () => {
  it('maps van mm to three metres (X, Z, −Y)', () => {
    const v = toThree(1000, 500, 200);
    expect([v.x, v.y, v.z]).toEqual([1, 0.2, -0.5]);
  });
  it('round-trips', () => {
    expect(fromThree(toThree(1234, -567, 890)).map((n) => Math.round(n))).toEqual([1234, -567, 890]);
  });
  it('converts boxes to centre + size', () => {
    const { center, size } = boxToThree(box(0, 1000, -200, 200, 0, 500));
    expect([center.x, center.y, center.z]).toEqual([0.5, 0.25, -0]);
    expect([size.x, size.y, size.z]).toEqual([1, 0.5, 0.4]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/three/coords.test.ts`
Expected: FAIL, because `src/three/coords` cannot be resolved.

- [ ] **Step 3: Implement coords**

Write `src/three/coords.ts`:

```ts
import * as THREE from 'three';
import type { Box, Vec3 } from '../core/types';

export const MM = 0.001;

/** Van frame (mm, X rear, Y right, Z up) → three.js (m, Y up). */
export function toThree(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x * MM, z * MM, -y * MM);
}

export function fromThree(v: THREE.Vector3): Vec3 {
  return [v.x / MM, -v.z / MM, v.y / MM];
}

export function boxToThree(b: Box): { center: THREE.Vector3; size: THREE.Vector3 } {
  const center = toThree((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
  const size = new THREE.Vector3((b.max[0] - b.min[0]) * MM, (b.max[2] - b.min[2]) * MM, (b.max[1] - b.min[1]) * MM);
  return { center, size };
}
```

Run: `npx vitest run tests/three/coords.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Implement materials, module meshes and dimension labels**

Write `src/three/materials.ts`:

```ts
import * as THREE from 'three';
import type { ModuleKind, PartRole } from '../core/types';

const ROLE_COLORS: Record<PartRole, string> = {
  cushion: '#46546a', backrest: '#46546a', mattress: '#d8cfbd', frame: '#4a4a4a', carcass: '#e1dbcd', counter: '#8a6a45',
};

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function partMaterial(kind: ModuleKind, role: PartRole): THREE.MeshStandardMaterial {
  const upholstery = role === 'cushion' || role === 'backrest';
  const color = kind === 'popTopBed' ? '#e4ebf1' : kind === 'cabSeats' && upholstery ? '#2b2f36' : ROLE_COLORS[role];
  const key = `${color}:${role}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: role === 'counter' ? 0.45 : 0.85 });
    cache.set(key, m);
  }
  return m;
}
```

Write `src/three/moduleMesh.ts`:

```ts
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PlacedModule } from '../core/types';
import { boxToThree } from './coords';
import { partMaterial } from './materials';

const SOFT = new Set(['cushion', 'backrest', 'mattress']);
const FLAG = new THREE.LineBasicMaterial({ color: '#e24b4a' });

/** Meshes for one placed module; flagged modules get a red outline. */
export function buildModuleGroup(m: PlacedModule, flagged = false): THREE.Group {
  const g = new THREE.Group();
  g.name = m.id;
  for (const part of m.parts) {
    const { center, size } = boxToThree(part.box);
    const radius = Math.min(0.03, size.x / 2, size.y / 2, size.z / 2);
    const geo = SOFT.has(part.role)
      ? new RoundedBoxGeometry(size.x, size.y, size.z, 3, radius)
      : new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, partMaterial(m.kind, part.role));
    mesh.position.copy(center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    if (flagged) {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)), FLAG);
      edges.position.copy(center);
      g.add(edges);
    }
  }
  return g;
}

export function disposeGroup(root: THREE.Object3D): void {
  root.traverse((o) => {
    const geo = (o as THREE.Mesh).geometry;
    if (geo) geo.dispose();
  });
}
```

Write `src/three/dimensions.ts`:

```ts
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
```

- [ ] **Step 5: Implement the shell loader**

Write `src/three/shell.ts`:

```ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { archBoxes } from '../core/body';
import type { Box, Van } from '../core/types';
import { boxToThree, toThree } from './coords';

export type RoofVariant = 'fixed' | 'closed' | 'open';
const ROOF_NODES: Record<RoofVariant, string> = { fixed: 'roof_fixed', closed: 'roof_poptop_closed', open: 'roof_poptop_open' };

/** Loads the baked GLB; falls back to a procedural box shell from van.json. */
export async function loadShell(url: string, van: Van): Promise<{ group: THREE.Group; baked: boolean }> {
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    prepareShell(gltf.scene);
    return { group: gltf.scene, baked: true };
  } catch (err) {
    console.warn('Shell GLB failed to load, using procedural shell', err);
    return { group: proceduralShell(van), baked: false };
  }
}

function prepareShell(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
    m.side = THREE.DoubleSide;
    mesh.material = m;
    const glass = /glass/.test(shellName(mesh));
    mesh.receiveShadow = true;
    mesh.castShadow = !glass;
  });
}

export function proceduralShell(van: Van): THREE.Group {
  const g = new THREE.Group();
  const mat = (color: string) => new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.85 });
  const len = (van.rearLimitX - van.cabFrontX) / 1000;
  const H = van.interiorHeight;
  const half = van.sections[1].low[1];
  const cx = (van.cabFrontX + van.rearLimitX) / 2;
  const plane = (name: string, w: number, h: number, pos: THREE.Vector3, rot: THREE.Euler, color: string) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(color));
    m.name = name;
    m.position.copy(pos);
    m.rotation.copy(rot);
    m.receiveShadow = true;
    g.add(m);
  };
  plane('floor', len, (2 * half) / 1000, toThree(cx, 0, 0), new THREE.Euler(-Math.PI / 2, 0, 0), '#3a3b3d');
  plane('roof_fixed', len, (2 * half) / 1000, toThree(cx, 0, H), new THREE.Euler(Math.PI / 2, 0, 0), '#c8c8c4');
  plane('wall_left', len, H / 1000, toThree(cx, -half, H / 2), new THREE.Euler(0, 0, 0), '#c8c8c4');
  plane('wall_right', len, H / 1000, toThree(cx, half, H / 2), new THREE.Euler(0, 0, 0), '#c8c8c4');
  plane('rear_panel', (2 * half) / 1000, H / 1000, toThree(van.rearLimitX, 0, H / 2), new THREE.Euler(0, Math.PI / 2, 0), '#c8c8c4');
  archBoxes(van).forEach((b, i) => {
    const clipped: Box = { min: [b.min[0], Math.max(b.min[1], -half), b.min[2]], max: [b.max[0], Math.min(b.max[1], half), b.max[2]] };
    const { center, size } = boxToThree(clipped);
    const m = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat('#b9b7ae'));
    m.name = i === 0 ? 'arch_left' : 'arch_right';
    m.position.copy(center);
    g.add(m);
  });
  return g;
}

export function setRoofVariant(shell: THREE.Object3D, variant: RoofVariant): void {
  for (const [key, name] of Object.entries(ROOF_NODES)) {
    const node = shell.getObjectByName(name);
    if (node) node.visible = key === variant;
  }
}

const CUTAWAY: { match: RegExp; hide: (cam: THREE.Vector3, van: Van) => boolean }[] = [
  { match: /^roof_|^poptop/, hide: (c, van) => c.y > van.interiorHeight / 1000 + 0.2 },
  { match: /^wall_left/, hide: (c) => c.z > 0.9 },
  { match: /^wall_right/, hide: (c) => c.z < -0.9 },
  { match: /^rear_panel/, hide: (c, van) => c.x > van.rearLimitX / 1000 + 0.2 },
  { match: /^front_panel|^windshield|^dashboard/, hide: (c, van) => c.x < van.cabFrontX / 1000 - 0.2 },
];

/** Name of the nearest ancestor that belongs to the shell's named parts (GLTF splits multi-material meshes). */
function shellName(o: THREE.Object3D): string {
  let n: THREE.Object3D | null = o;
  while (n) {
    if (/^(wall_|roof_|poptop|rear_panel|front_panel|windshield|dashboard|floor|arch_)/.test(n.name)) return n.name;
    n = n.parent;
  }
  return o.name;
}

/** Fades the shell parts between the camera and the interior. */
export function applyCutaway(shell: THREE.Object3D, camera: THREE.Camera, van: Van, enabled: boolean): void {
  shell.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = shellName(mesh);
    const rule = CUTAWAY.find((r) => r.match.test(name));
    const hide = enabled && !!rule && rule.hide(camera.position, van);
    const glass = /glass/.test(name);
    const m = mesh.material as THREE.MeshStandardMaterial;
    m.transparent = hide || glass;
    m.opacity = hide ? 0.08 : glass ? 0.3 : 1;
    m.depthWrite = !hide && !glass;
  });
}
```

- [ ] **Step 6: Implement the scene**

Write `src/three/scene.ts`:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { PlacedModule, Van } from '../core/types';
import { toThree } from './coords';
import { disposeLabels } from './dimensions';
import { buildModuleGroup, disposeGroup } from './moduleMesh';
import { applyCutaway, setRoofVariant, type RoofVariant } from './shell';

export type CameraMode = 'orbit' | 'walk';

export class VanScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly labels: CSS2DRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.02, 100);
  readonly controls: OrbitControls;
  onFrame: ((dt: number) => void) | null = null;

  private shell: THREE.Object3D | null = null;
  private modules = new THREE.Group();
  private dims: THREE.Group | null = null;
  private interior: THREE.PointLight[] = [];
  private hemi: THREE.HemisphereLight;
  private mode: CameraMode = 'orbit';
  private saved: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private clock = new THREE.Clock();
  private roof: RoofVariant = 'fixed';

  constructor(private container: HTMLElement, private van: Van) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.append(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'label-layer';
    container.append(this.labels.domElement);

    this.scene.background = new THREE.Color('#dfe3e6');
    this.hemi = new THREE.HemisphereLight('#ffffff', '#6b6b6b', 1.1);
    const sun = new THREE.DirectionalLight('#fff4e5', 1.6);
    sun.position.set(1.5, 5, 3);
    sun.target.position.copy(toThree(2200, 0, 0));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
    this.scene.add(this.hemi, sun, sun.target, this.modules);
    for (const x of [1900, 3200]) {
      const l = new THREE.PointLight('#ffd9a8', 0, 3, 1.5);
      l.position.copy(toThree(x, 0, van.interiorHeight - 80));
      this.interior.push(l);
      this.scene.add(l);
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshStandardMaterial({ color: '#c9ccc9', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -van.floorAboveRoad / 1000;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.camera.position.set(2.4, 3.4, 3.8);
    this.controls = new OrbitControls(this.camera, this.labels.domElement);
    this.controls.target.copy(toThree(2300, 0, 500));
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  setShell(shell: THREE.Object3D): void {
    if (this.shell) this.scene.remove(this.shell);
    this.shell = shell;
    this.scene.add(shell);
    setRoofVariant(shell, this.roof);
  }

  setModules(mods: PlacedModule[], flagged: Set<string>): void {
    disposeGroup(this.modules);
    this.modules.clear();
    for (const m of mods) this.modules.add(buildModuleGroup(m, flagged.has(m.id)));
  }

  setRoof(variant: RoofVariant): void {
    this.roof = variant;
    if (this.shell) setRoofVariant(this.shell, variant);
  }

  setLights(on: boolean): void {
    for (const l of this.interior) l.intensity = on ? 1.4 : 0;
    this.hemi.intensity = on ? 0.35 : 1.1;
    this.scene.background = new THREE.Color(on ? '#1d232b' : '#dfe3e6');
  }

  setDimensions(group: THREE.Group | null): void {
    if (this.dims) {
      disposeLabels(this.dims);
      this.scene.remove(this.dims);
    }
    this.dims = group;
    if (group) this.scene.add(group);
  }

  setMode(mode: CameraMode): void {
    if (mode === this.mode) return;
    if (mode === 'walk') {
      this.saved = { pos: this.camera.position.clone(), target: this.controls.target.clone() };
    } else if (this.saved) {
      this.camera.position.copy(this.saved.pos);
      this.controls.target.copy(this.saved.target);
    }
    this.mode = mode;
    this.controls.enabled = mode === 'orbit';
    this.camera.fov = mode === 'walk' ? 75 : 50;
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private tick(): void {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.mode === 'orbit') this.controls.update();
    if (this.shell) applyCutaway(this.shell, this.camera, this.van, this.mode === 'orbit');
    this.onFrame?.(dt);
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
```

- [ ] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

```bash
git add src/three tests/three
git commit -m "feat(3d): scene, shell loader with cutaway, module meshes, dimension labels"
```

---

### Task 15: Walk mode and minimap

**Files:** Create `src/core/walk.ts`, `tests/core/walk.test.ts`, `src/three/walk.ts`, `src/three/minimap.ts`

- [ ] **Step 1: Write the failing test**

Write `tests/core/walk.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { wallY } from '../../src/core/body';
import { VAN } from '../../src/core/data';
import { buildLayout } from '../../src/core/layout';
import { presetById } from '../../src/core/presets';
import { eyeHeight, findStart, isFree, moveWithCollisions, PLAYER_RADIUS, walkObstacles } from '../../src/core/walk';

const coast = buildLayout(VAN, presetById('coast'));
const obstacles = walkObstacles(coast);

describe('walk', () => {
  it('finds a free start near the sliding door', () => {
    const start = findStart(VAN, obstacles)!;
    expect(start).not.toBeNull();
    expect(isFree(VAN, obstacles, start)).toBe(true);
  });
  it('treats the bench as solid', () => {
    expect(isFree(VAN, obstacles, { x: 2200, y: 200 })).toBe(false);
  });
  it('slides along a wall instead of stopping', () => {
    const r = moveWithCollisions(VAN, [], { x: 2000, y: 0 }, 5, -2000);
    expect(r).toEqual({ x: 2005, y: 0 });
    expect(r.y).toBeGreaterThan(wallY(VAN, 2000, 0, 'left') + PLAYER_RADIUS);
  });
  it('forces a crouch under the fixed roof', () => {
    expect(eyeHeight(VAN, false, 2000, 'stand')).toBe(1250);
    expect(eyeHeight(VAN, true, 2000, 'stand')).toBe(1650);
    expect(eyeHeight(VAN, true, 3600, 'stand')).toBe(1250);
    expect(eyeHeight(VAN, false, 2000, 'sit')).toBe(1100);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/core/walk.test.ts`
Expected: FAIL, because `src/core/walk` cannot be resolved.

- [ ] **Step 3: Implement**

Write `src/core/walk.ts`:

```ts
import { archBoxes, ceilingAt, wallY } from './body';
import type { Layout } from './layout';
import type { Box, Van } from './types';

export const PLAYER_RADIUS = 200;
export const STEP_OVER = 150;
export const HEAD_CLEARANCE = 120;
export const DASH_DEPTH = 450;
export const EYE = { sit: 1100, crouch: 1250, stand: 1650 } as const;
export type Stance = keyof typeof EYE;
export interface Pos { x: number; y: number }

/** Everything the player cannot walk through (the pop-top bed folds up, so it is ignored). */
export function walkObstacles(layout: Layout): Box[] {
  return [
    ...layout.modules.filter((m) => m.kind !== 'popTopBed').flatMap((m) => m.parts.map((p) => p.box)),
    ...archBoxes(layout.van),
  ].filter((b) => b.max[2] > STEP_OVER);
}

export function isFree(van: Van, obstacles: Box[], p: Pos, r = PLAYER_RADIUS): boolean {
  if (p.x < van.cabFrontX + DASH_DEPTH + r || p.x > van.rearLimitX - r) return false;
  if (p.y < wallY(van, p.x, 0, 'left') + r || p.y > wallY(van, p.x, 0, 'right') - r) return false;
  return !obstacles.some((b) => {
    const cx = Math.max(b.min[0], Math.min(p.x, b.max[0]));
    const cy = Math.max(b.min[1], Math.min(p.y, b.max[1]));
    return (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r;
  });
}

/** Moves if possible, otherwise slides along whichever axis is still free. */
export function moveWithCollisions(van: Van, obstacles: Box[], p: Pos, dx: number, dy: number): Pos {
  for (const next of [{ x: p.x + dx, y: p.y + dy }, { x: p.x + dx, y: p.y }, { x: p.x, y: p.y + dy }]) {
    if (isFree(van, obstacles, next)) return next;
  }
  return p;
}

export function eyeHeight(van: Van, popTop: boolean, x: number, stance: Stance): number {
  return Math.min(EYE[stance], ceilingAt(van, x, popTop) - HEAD_CLEARANCE);
}

/** Nearest free spot to the middle of the sliding-door opening, or null when the floor is full. */
export function findStart(van: Van, obstacles: Box[]): Pos | null {
  const cx = (van.slidingDoor.x[0] + van.slidingDoor.x[1]) / 2;
  const candidates: Pos[] = [];
  for (let x = van.livingStartX - 300; x <= van.rearLimitX; x += 50) {
    for (let y = -600; y <= 600; y += 50) candidates.push({ x, y });
  }
  candidates.sort((a, b) => Math.hypot(a.x - cx, a.y) - Math.hypot(b.x - cx, b.y));
  return candidates.find((c) => isFree(van, obstacles, c)) ?? null;
}
```

Write `src/three/walk.ts`:

```ts
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { Layout } from '../core/layout';
import type { Box } from '../core/types';
import { EYE, eyeHeight, findStart, moveWithCollisions, walkObstacles, type Pos, type Stance } from '../core/walk';
import { toThree } from './coords';

const WALK_SPEED = 1200; // mm/s

export class WalkController {
  readonly controls: PointerLockControls;
  active = false;
  onExit: (() => void) | null = null;
  onToggleMinimap: (() => void) | null = null;

  private keys = new Set<string>();
  private pos: Pos = { x: 2000, y: 0 };
  private obstacles: Box[] = [];
  private layout: Layout | null = null;
  private stance: Stance = 'stand';
  private eye: number = EYE.stand;
  private ghost = false;

  constructor(private camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.controls = new PointerLockControls(camera, dom);
    this.controls.addEventListener('unlock', () => {
      if (this.active) this.onExit?.();
    });
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      this.keys.add(e.code);
      if (e.code === 'KeyC') this.stance = this.stance === 'crouch' ? 'stand' : 'crouch';
      if (e.code === 'KeyX') this.stance = this.stance === 'sit' ? 'stand' : 'sit';
      if (e.code === 'KeyM') this.onToggleMinimap?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  /** Places the camera inside the van and locks the pointer. Must be called from a user gesture. */
  enter(layout: Layout): { ghost: boolean } {
    this.layout = layout;
    this.obstacles = walkObstacles(layout);
    const start = findStart(layout.van, this.obstacles);
    this.ghost = !start;
    this.pos = start ?? { x: (layout.van.livingStartX + layout.van.rearLimitX) / 2, y: 0 };
    this.active = true;
    this.eye = eyeHeight(layout.van, layout.popTop, this.pos.x, this.stance);
    this.camera.position.copy(toThree(this.pos.x, this.pos.y, this.eye));
    this.camera.lookAt(toThree(this.pos.x + 1000, this.pos.y, this.eye - 150));
    this.controls.lock();
    return { ghost: this.ghost };
  }

  updateLayout(layout: Layout): void {
    if (!this.active) return;
    this.layout = layout;
    this.obstacles = walkObstacles(layout);
  }

  exit(): void {
    this.active = false;
    this.keys.clear();
    if (this.controls.isLocked) this.controls.unlock();
  }

  /** Van-frame position plus yaw (radians, 0 = facing rear). */
  get position(): Pos & { yaw: number } {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return { ...this.pos, yaw: Math.atan2(-d.z, d.x) };
  }

  update(dt: number): void {
    if (!this.active || !this.layout) return;
    const k = this.keys;
    const run = k.has('ShiftLeft') || k.has('ShiftRight') ? 2 : 1;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // three (x, z) → van (X, −Y); the right-hand vector of facing (fx, fy) is (fy, −fx).
    const flat = Math.hypot(dir.x, dir.z) || 1;
    const fx = dir.x / flat;
    const fy = -dir.z / flat;
    const norm = Math.hypot(fwd, side) || 1;
    const step = (WALK_SPEED * run * dt) / norm;
    const dx = (fx * fwd + fy * side) * step;
    const dy = (fy * fwd - fx * side) * step;
    const { van, popTop } = this.layout;
    this.pos = this.ghost ? { x: this.pos.x + dx, y: this.pos.y + dy } : moveWithCollisions(van, this.obstacles, this.pos, dx, dy);
    const target = eyeHeight(van, popTop, this.pos.x, this.stance);
    this.eye += (target - this.eye) * Math.min(1, dt * 8);
    this.camera.position.copy(toThree(this.pos.x, this.pos.y, this.eye));
  }
}
```

Write `src/three/minimap.ts`:

```ts
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
```

- [ ] **Step 4: Run tests and type-check**

Run: `npx vitest run tests/core/walk.test.ts && npx tsc --noEmit`
Expected: PASS (4 tests), no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/walk.ts tests/core/walk.test.ts src/three/walk.ts src/three/minimap.ts
git commit -m "feat(walk): first-person walk with collisions, auto-crouch and minimap"
```

---

### Task 16: UI panels and app wiring

**Files:** Create `src/ui/dom.ts`, `src/ui/presetList.ts`, `src/ui/paramsPanel.ts`, `src/ui/metricsPanel.ts`, `src/ui/compareView.ts`, `src/ui/planView.ts`, `src/ui/app.ts`, `src/style.css`. Modify `src/main.ts`.

Layout:
- **Top bar:** view tabs (3D · Walk · Plan · Compare), Lights toggle, Dimensions toggle.
- **Left sidebar:** preset cards with pass/fail pills and a "Best match" badge.
- **Centre:** the 3D viewport, with the plan or compare views in the same area.
- **Right panel:** parameters, metrics and checks.

Behaviour:
- Slider `input` events update the scene and metrics live but do not rebuild the parameter panel, so dragging keeps working.
- State is written to the URL hash with `history.replaceState`.

- [ ] **Step 1: Write the DOM helper and panels**

Write `src/ui/dom.ts`:

```ts
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
```

Write `src/ui/presetList.ts`:

```ts
import type { CompareRow } from '../core/compare';
import { fmtBed, h } from './dom';

export function renderPresetList(
  el: HTMLElement, rows: CompareRow[], selectedId: string, best: string | null, onSelect: (id: string) => void,
): void {
  const pill = (ok: boolean, label: string) => h('span', { class: ok ? 'pill ok' : 'pill bad' }, `${ok ? '✓' : '✗'} ${label}`);
  el.replaceChildren(
    h('h2', { class: 'side-title' }, 'Conversions'),
    ...rows.map((r) => {
      const m = r.metrics;
      const selected = r.preset.id === selectedId;
      return h('button', {
        class: `preset-card${selected ? ' selected' : ''}`,
        'aria-pressed': String(selected),
        onclick: () => onSelect(r.preset.id),
      },
      h('div', { class: 'card-head' }, h('strong', {}, r.preset.name), r.preset.id === best ? h('span', { class: 'pill best' }, 'Best match') : null),
      h('div', { class: 'muted small' }, r.preset.basedOn),
      h('div', { class: 'card-stats' }, `${m.seats} seats · bed ${fmtBed(m.bed)} · sleeps ${m.sleepers}`),
      h('div', { class: 'pills' }, pill(r.hard.seats, '5+ seats'), pill(r.hard.bed, '2 × 187 cm'), pill(r.hard.removableRear, 'removable rear')));
    }),
  );
}
```

Write `src/ui/paramsPanel.ts`:

```ts
import { BENCHES, FRIDGES } from '../core/catalog';
import { benchSpecs, KITCHEN_MIN_LENGTH, type Overrides } from '../core/layout';
import type { KitchenParams } from '../core/modules/furniture';
import type { RnrBenchParams } from '../core/modules/seating';
import type { BedState, FridgeId, Preset } from '../core/types';
import { h } from './dom';

export interface ParamsHandlers {
  onChange: (patch: Partial<Overrides>, live?: boolean) => void;
  onReset: () => void;
}

export function renderParams(el: HTMLElement, preset: Preset, o: Overrides, notes: string[], hnd: ParamsHandlers): void {
  const seg = (label: string, options: [string, string][], value: string, pick: (v: string) => void) =>
    h('div', { class: 'field' }, h('span', { class: 'label' }, label),
      h('div', { class: 'seg', role: 'group', 'aria-label': label }, ...options.map(([v, text]) =>
        h('button', { class: v === value ? 'on' : '', 'aria-pressed': String(v === value), onclick: () => pick(v) }, text))));

  const slider = (label: string, min: number, max: number, step: number, value: number, set: (n: number) => Partial<Overrides>) => {
    const out = h('output', {}, `${value} mm`);
    return h('label', { class: 'field' }, h('span', { class: 'label' }, label, ' ', out),
      h('input', {
        type: 'range', min: String(min), max: String(max), step: String(step), value: String(value),
        oninput: (e: Event) => {
          const n = Number((e.target as HTMLInputElement).value);
          out.textContent = `${n} mm`;
          hnd.onChange(set(n), true);
        },
        onchange: (e: Event) => hnd.onChange(set(Number((e.target as HTMLInputElement).value))),
      }));
  };

  const rows: HTMLElement[] = [
    h('h2', {}, preset.name),
    h('p', { class: 'muted small' }, preset.summary),
    seg('Mode', [['seated', 'Seated'], ['bed', 'Bed']], o.state ?? 'seated', (v) => hnd.onChange({ state: v as BedState })),
    seg('Roof', [['0', 'Fixed'], ['1', 'Pop-top']], o.popTop ? '1' : '0', (v) => hnd.onChange({ popTop: v === '1' })),
  ];
  const cab = preset.modules.find((m) => m.kind === 'cabSeats');
  const passenger = o.passenger ?? (cab?.params.passenger as string) ?? 'doubleBench';
  rows.push(seg('Front passenger', [['doubleBench', 'Double bench'], ['singleSwivel', 'Single swivel']], passenger,
    (v) => hnd.onChange({ passenger: v as Overrides['passenger'] })));

  const benches = benchSpecs(preset);
  if (benches.length) {
    const p = benches[0].params as unknown as RnrBenchParams;
    rows.push(slider('Bench position', p.railRange[0], p.railRange[1], p.railStep, o.benchFrontX ?? p.frontX, (n) => ({ benchFrontX: n })));
  }
  if (benches.length === 1) {
    const current = o.benchModel ?? (benches[0].params.model as string);
    rows.push(h('label', { class: 'field' }, h('span', { class: 'label' }, 'Bench model'),
      h('select', { onchange: (e: Event) => hnd.onChange({ benchModel: (e.target as HTMLSelectElement).value }) },
        ...BENCHES.filter((b) => b.seats >= 2).map((b) =>
          h('option', { value: b.id, selected: b.id === current }, `${b.name} (${b.width} mm, ${b.seats} seats)`)))));
  }
  const kitchen = preset.modules.find((m) => m.kind === 'kitchenBlock');
  if (kitchen) {
    const p = kitchen.params as unknown as KitchenParams;
    rows.push(slider('Kitchen length', KITCHEN_MIN_LENGTH, p.maxLength, 10, o.kitchenLength ?? p.length, (n) => ({ kitchenLength: n })));
  }
  const fridgeHost = preset.modules.find((m) => m.kind === 'kitchenBlock' || m.kind === 'boxKitchen');
  if (fridgeHost) {
    const current = o.fridge ?? (fridgeHost.params.fridge as FridgeId);
    rows.push(h('label', { class: 'field' }, h('span', { class: 'label' }, 'Fridge'),
      h('select', { onchange: (e: Event) => hnd.onChange({ fridge: (e.target as HTMLSelectElement).value as FridgeId }) },
        ...FRIDGES.map((f) => h('option', { value: f.id, selected: f.id === current }, f.name)))));
  }
  if (notes.length) rows.push(h('ul', { class: 'notes' }, ...notes.map((n) => h('li', {}, n))));
  rows.push(h('button', { class: 'ghost', onclick: () => hnd.onReset() }, 'Reset tweaks'));
  el.replaceChildren(...rows);
}
```

Write `src/ui/metricsPanel.ts`:

```ts
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
```

Write `src/ui/compareView.ts`:

```ts
import type { CompareRow } from '../core/compare';
import { fmtBed, fmtEur, fmtMm, h } from './dom';

const COLUMNS: [string, (r: CompareRow) => string][] = [
  ['Seats', (r) => String(r.metrics.seats)],
  ['Lower bed', (r) => fmtBed(r.metrics.bed)],
  ['Sleepers', (r) => String(r.metrics.sleepers)],
  ['Rear legroom', (r) => fmtMm(r.metrics.rearLegroom)],
  ['Counter', (r) => fmtMm(r.metrics.counterLength)],
  ['Fridge', (r) => `${r.metrics.fridgeL} L`],
  ['Water', (r) => `${r.metrics.waterL} L`],
  ['Boot', (r) => `${r.metrics.bootLength} mm · ${r.metrics.bootVolumeL} L`],
  ['Standing', (r) => fmtMm(r.metrics.standingHeight)],
  ['Payload left', (r) => `${r.metrics.payloadLeftKg} kg`],
  ['Cost (est.)', (r) => fmtEur(r.metrics.costEur)],
  ['Seats · bed · removable', (r) => [r.hard.seats, r.hard.bed, r.hard.removableRear].map((ok) => (ok ? '✓' : '✗')).join(' ')],
  ['Errors', (r) => String(r.errors)],
];

export function renderCompare(el: HTMLElement, rows: CompareRow[], best: string | null, onSelect: (id: string) => void): void {
  el.replaceChildren(
    h('p', { class: 'muted' }, 'Hard requirements: 5+ travel seats · bed ≥ 1950 × 1120 for two 187 cm sleepers · removable rear seats. Ranked by pass, then bed width, then boot length.'),
    h('div', { class: 'table-wrap' }, h('table', { class: 'compare' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Conversion'), ...COLUMNS.map(([c]) => h('th', {}, c)))),
      h('tbody', {}, ...rows.map((r) => h('tr', { class: r.passesAll ? 'pass' : 'fail' },
        h('th', {}, h('button', { class: 'link', onclick: () => onSelect(r.preset.id) }, r.preset.name),
          r.preset.id === best ? h('span', { class: 'pill best' }, 'Best match') : null),
        ...COLUMNS.map(([, f]) => h('td', {}, f(r)))))))),
  );
}
```

Write `src/ui/planView.ts`:

```ts
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
```

- [ ] **Step 2: Write the app orchestrator and entry point**

Write `src/ui/app.ts`:

```ts
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
    scene.setModules(layout.modules, flagged);
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
        : 'WASD walk · mouse look · Shift run · C crouch · X sit · M minimap · Esc leave';
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
```

Write `src/main.ts`:

```ts
import './style.css';
import { startApp } from './ui/app';

startApp(document.getElementById('app')!);
```

- [ ] **Step 3: Write the stylesheet**

Write `src/style.css`:

```css
:root {
  --bg: #f4f5f3; --surface: #ffffff; --surface-2: #eceeea; --text: #1d2125; --muted: #5f6368;
  --border: #d9dcd6; --accent: #0f6e56; --accent-bg: #e1f5ee; --bad: #a32d2d; --bad-bg: #fcebeb;
  --warn: #854f0b; --warn-bg: #faeeda; --info: #185fa5; --info-bg: #e6f1fb; --radius: 8px;
  color-scheme: light dark;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #15181b; --surface: #1d2125; --surface-2: #262b30; --text: #e8eaed; --muted: #9aa0a6;
    --border: #353b41; --accent: #5dcaa5; --accent-bg: #0b3a2e; --bad: #f09595; --bad-bg: #3a1717;
    --warn: #ef9f27; --warn-bg: #3a2a0d; --info: #85b7eb; --info-bg: #0f2740;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); }
#app { height: 100vh; display: flex; flex-direction: column; }
button { font: inherit; color: inherit; cursor: pointer; }
.muted { color: var(--muted); }
.small { font-size: 12px; }
[hidden] { display: none !important; }

.topbar { display: flex; align-items: center; gap: 16px; padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
.brand { display: flex; flex-direction: column; min-width: 0; }
.tabs, .toggles { display: flex; gap: 4px; }
.toggles { margin-left: auto; }
.tab, .toggle, .seg button, .ghost { background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 6px 12px; }
.tab.on, .toggle.on, .seg button.on { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }
.primary { background: var(--accent); color: #fff; border: 0; border-radius: var(--radius); padding: 6px 14px; }

.body { flex: 1; display: grid; grid-template-columns: 280px 1fr 320px; min-height: 0; }
.sidebar, .panel { overflow-y: auto; padding: 12px; background: var(--surface); }
.sidebar { border-right: 1px solid var(--border); }
.panel { border-left: 1px solid var(--border); }
.side-title { font-size: 14px; margin: 4px 0 8px; color: var(--muted); font-weight: 500; }
.stage { position: relative; min-width: 0; min-height: 0; }
.viewport { position: absolute; inset: 0; }
.viewport canvas:first-child { display: block; }
.label-layer { position: absolute; inset: 0; }
.dim-label { background: rgba(15, 110, 86, 0.9); color: #fff; font-size: 12px; padding: 2px 6px; border-radius: 4px; pointer-events: none; white-space: nowrap; }
.minimap { position: absolute; right: 12px; bottom: 12px; border-radius: var(--radius); pointer-events: none; }
.walk-hint { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); background: rgba(20, 24, 28, 0.78); color: #fff; padding: 6px 12px; border-radius: var(--radius); font-size: 13px; pointer-events: none; }
.banner { position: absolute; left: 12px; top: 12px; background: var(--warn-bg); color: var(--warn); padding: 6px 10px; border-radius: var(--radius); font-size: 13px; }
.plan-view, .compare-view { position: absolute; inset: 0; overflow: auto; padding: 16px; }
.plan-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.plan-svg svg { width: 100%; height: auto; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); }

.preset-card { display: block; width: 100%; text-align: left; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
.preset-card.selected { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.card-head { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.card-stats { font-size: 13px; margin: 6px 0; }
.pills { display: flex; flex-wrap: wrap; gap: 4px; }
.pill { font-size: 11px; padding: 2px 6px; border-radius: 999px; }
.pill.ok { background: var(--accent-bg); color: var(--accent); }
.pill.bad { background: var(--bad-bg); color: var(--bad); }
.pill.best { background: var(--info-bg); color: var(--info); }

.params h2 { font-size: 18px; margin: 4px 0; font-weight: 500; }
.field { display: flex; flex-direction: column; gap: 4px; margin: 10px 0; }
.label { font-size: 12px; color: var(--muted); }
.seg { display: flex; gap: 4px; }
.seg button { flex: 1; padding: 4px 8px; }
input[type='range'] { width: 100%; accent-color: var(--accent); }
select { font: inherit; padding: 4px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
.notes { font-size: 12px; color: var(--warn); padding-left: 16px; }
.metrics-panel h3 { font-size: 14px; margin: 16px 0 6px; font-weight: 500; }
.metrics { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 13px; margin: 0; }
.metrics dt { color: var(--muted); }
.metrics dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.checks { list-style: none; padding: 0; margin: 0; font-size: 13px; }
.check { padding: 6px 8px; border-radius: 6px; margin-bottom: 4px; }
.check .lvl { font-size: 10px; text-transform: uppercase; margin-right: 6px; font-weight: 600; }
.check.error { background: var(--bad-bg); color: var(--bad); }
.check.warn { background: var(--warn-bg); color: var(--warn); }
.check.info { background: var(--info-bg); color: var(--info); }

.table-wrap { overflow-x: auto; }
.compare { border-collapse: collapse; font-size: 13px; width: 100%; background: var(--surface); }
.compare th, .compare td { border-bottom: 1px solid var(--border); padding: 6px 8px; text-align: left; white-space: nowrap; }
.compare tr.fail td { color: var(--muted); }
.link { background: none; border: 0; padding: 0; color: var(--accent); text-decoration: underline; margin-right: 6px; }

@media (max-width: 1000px) {
  .body { grid-template-columns: 1fr; grid-template-rows: auto 60vh auto; overflow-y: auto; }
  .sidebar, .panel { border: 0; }
  .topbar { flex-wrap: wrap; }
}
```

- [ ] **Step 4: Type-check, test and build**

Run: `npx tsc --noEmit && npm test && npx vite build`
Expected: no type errors, all tests pass, and Vite prints `✓ built in …`.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/main.ts src/style.css
git commit -m "feat(ui): configurator panels, compare table, plan export, app wiring"
```

---

### Task 17: Verify in the browser and document

**Files:** Create `README.md`, `.claude/launch.json`

- [ ] **Step 1: Add the dev-server launch config**

Write `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "t6visualizer", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--", "--port", "5173", "--strictPort"], "port": 5173 }
  ]
}
```

- [ ] **Step 2: Manual verification checklist** (start the dev server, open http://localhost:5173)
  - 3D view shows the baked shell (no "simplified shell" banner), the Coast-style furniture, and a cutaway as you orbit.
  - Selecting each preset updates the cards, metrics and checks; Budget shows `BED_SHORT` and the others do not.
  - Mode → Bed flattens the bench; Roof → Pop-top shows the tent in bed mode.
  - Dragging the bench slider moves the bench live. At the far-back position `SEAT_ON_ARCH` appears and the module is outlined in red.
  - Plan view renders both drawings. Export SVG downloads a file whose width is `270.2mm` at 1:20.
  - Compare view ranks Beach-style first with the "Best match" badge.
  - Walk: clicking Walk locks the pointer and WASD moves. You cannot pass through the bench, and the view is auto-crouched under the fixed roof. M toggles the minimap, Esc returns to 3D.
  - No errors in the browser console.

- [ ] **Step 3: Write the README**

Write `README.md`:

```markdown
# T6.1 Camper Planner

Compare California-style camper conversions on a dimensionally accurate VW T6.1 Transporter
Kasten Mixto (SWB 3000 mm, normal roof, 3 front seats): 3D configurator, first-person walk,
comparison table and true-scale SVG floor plans.

## Run

    npm install
    npm run dev        # http://localhost:5173
    npm test           # unit tests (layout core, plan, shell GLB)
    npm run build      # static build in dist/

## Rebuild the 3D shell (Blender 5.0, headless)

    npm run build:shell

This reads `data/van.json` and writes `public/models/van.glb` with ambient occlusion baked into vertex colours.

## Data

- `data/van.json` holds the body dimensions from VW bodybuilder drawings and guidelines, with sources. Keys listed in `approx`
  were scaled from drawings; measure them on your van.
- `data/presets/*.json` holds the five conversions; `data/modules/*.json` holds the bench and fridge catalogues.
- Research notes: `docs/research/2026-09-30-t61-swb-dimensions-and-conversions.md`.

Mass and cost figures are rough estimates for comparison only. Seat approval (M1/N1 re-registration) needs
crash-tested benches or rails with their own approval: check with your inspection authority.
```

- [ ] **Step 4: Commit**

```bash
git add README.md .claude/launch.json
git commit -m "docs: README and dev-server launch config"
```

---

## Self-review notes

- **Spec coverage:**
  - presets: Task 7
  - tweaks and pop-top: Task 8, Task 16
  - Z-aware checks: Tasks 4 and 10
  - metrics: Task 9
  - orbit, cutaway, dimensions and lights: Task 14
  - walk and minimap: Task 15
  - SVG export: Task 12
  - comparison and best match: Task 11
  - URL state: Task 11
  - Blender shell with AO bake: Task 13
  - GLB fallback: Task 14 (`proceduralShell`)
  - tests: every core task
- **Spec deviations:** these were agreed and already written into the spec.
  - Z datum is the cargo floor.
  - Module geometry lives in the core.
  - No Draco.
  - Hard minimum bed width is 1120.
  - AO is baked to vertex colours.

## Deviations found during execution (2026-09-30)

- `~/package.json` declares yarn as its `packageManager`, which blocks npm here. `package.json` now pins `"packageManager": "npm@11.12.1"`.
- Blender hangs on headless startup when user add-ons load. `build:shell` now runs with `--factory-startup`.
- The GLB test needs `@types/node`, added to `types` in `tsconfig.json`. `dimensions.ts` uses `instanceof CSS2DObject`.
- AO distance was reduced from 0.6 m to 0.25 m, because the narrow interior baked too dark.
- The default camera now starts above the sliding-door side.
- In walk mode the roof bed is hidden (folded into the tent). Esc exits even without pointer lock, and dragging to look is a fallback when pointer lock is refused (e.g. embedded previews).
