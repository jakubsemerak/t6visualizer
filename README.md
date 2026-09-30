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
