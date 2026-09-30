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
