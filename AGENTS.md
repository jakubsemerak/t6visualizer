# Agent Guide – t6visualizer

Web tool for comparing California-style camper conversions on a VW T6.1 Kasten Mixto SWB
(3000 mm, normal roof, 3 front seats). Vite + TypeScript + Three.js, with a headless Blender shell build.

## Commands

- `npm install`: install dependencies. npm is pinned via `packageManager` because `~/package.json`
  declares yarn; do not switch this repo to yarn.
- `npm run dev`: dev server on http://localhost:5173 (`.claude/launch.json` has the preview config).
- `npm test`: Vitest, all tests (core, plan, shell GLB). Must stay green before every commit.
- `npx tsc --noEmit`: type check (TypeScript 7).
- `npm run build`: type check plus static build into `dist/` (gitignored).
- `npm run build:shell`: rebuilds `public/models/van.glb` from `data/van.json` with Blender 5 headless.
  Keep `--factory-startup`: user add-ons hang headless startup. The output is deterministic; commit the GLB
  whenever `data/van.json` or `blender/build_shell.py` changes.

## Architecture

- `data/van.json`: body dimensions (mm) with sources. Keys listed in `approx` were scaled from VW
  drawings. Single source of truth for the body.
- `data/presets/*.json`: the five conversions. `data/modules/*.json` holds the bench and fridge catalogues.
- `src/core/`: pure TypeScript with no Three.js or DOM. Everything testable lives here: the body model
  (`body.ts`), module builders (`modules/`), `buildLayout`, `computeMetrics`, `evaluate` (checks),
  `compareAll`, URL state, and walk collisions.
- `src/plan/`: true-scale SVG renderer (user units are mm; width in `mm` = sheet / scale).
- `src/three/`: rendering only. Meshes are generated from the core's `PlacedModule.parts` boxes.
- `src/ui/`: vanilla DOM panels; `app.ts` wires state → evaluate → scene / panels / URL hash.
- `blender/build_shell.py`: builds the shell in the van frame; AO is baked to vertex colours (`COLOR_0`).

## Conventions

- **Core frame:** mm. X points rearward from the front-axle centre, Y is positive to the right (the
  sliding-door side), Z is up from the cargo-floor top.
- **three.js frame:** metres, `(X, Z, −Y) / 1000`. Use `src/three/coords.ts`, never ad hoc conversions.
- **Furniture:** every module is `Part { role, box }`. The same boxes drive collisions, meshes and the SVG,
  so geometry changes belong in `src/core/modules/`, not in `src/three/`.
- **Collision tolerance:** boxes touching or overlapping by ≤ 1 mm do not collide.
- **Presets must evaluate cleanly:** `tests/core/presetSmoke.test.ts` pins the exact expected check codes.
  If a preset change introduces `COLLISION`/`BODY`, fix the preset numbers (keep gaps of at least 2 mm),
  not the checker.
- **Requirement constants** (`MIN_BED_LENGTH` 1950, `MIN_BED_WIDTH` 1120, `PREF_BED_WIDTH` 1200,
  `MIN_TRAVEL_SEATS` 5) live in `src/core/checks.ts` and come from the owner's requirements: two sleepers
  187 cm tall, 4–5 people.
- **Estimates:** mass and cost figures are estimates. Label them as such in the UI.
- **Tests first:** write the failing test before the implementation for anything in `src/core` or `src/plan`.

## Workflow

- Work on `main`, commit in logical, self-contained steps (one feature or fix per commit), and push
  to `origin` regularly.
- Commit messages: conventional prefix (`feat(core):`, `fix(shell):`, `docs:` …).
- Verify UI changes in the browser (orbit, bed/pop-top, plan export, compare, walk) and check the
  console. Pointer lock is refused inside embedded previews; drag-to-look is the fallback there.

## Docs

- Design spec: `docs/superpowers/specs/2026-09-30-t61-camper-visualizer-design.md`
- Implementation plan and execution deviations: `docs/superpowers/plans/2026-09-30-t61-camper-visualizer.md`
- Dimension and conversion research with sources: `docs/research/2026-09-30-t61-swb-dimensions-and-conversions.md`
