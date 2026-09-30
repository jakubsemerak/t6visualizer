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
