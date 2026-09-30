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
