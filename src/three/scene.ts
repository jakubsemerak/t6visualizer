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

    // Start above the sliding-door side, looking across at the driver-side furniture.
    this.camera.position.copy(toThree(2900, 3300, 3600));
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
