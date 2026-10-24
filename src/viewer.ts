import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { MeshData } from './core/mesh';
import type { Footprint } from './core/extrude';

export interface RootPreview { footprint: Footprint; z: number }

/** Display geometry only. Source triangles retain their order for picking. */
export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100000);
  private controls: OrbitControls;
  private modelGroup = new THREE.Group();
  private modifierGroup = new THREE.Group();
  private selectionGroup = new THREE.Group();
  private hoverGroup = new THREE.Group();
  private rootGroup = new THREE.Group();
  private original?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private model?: MeshData;
  private resize: ResizeObserver;
  private bounds = new THREE.Box3();
  private xray = false;
  private lastHover?: number;
  private frame?: number;
  private down?: { x: number; y: number; moved: boolean };
  onPick?: (face: number) => void;
  onHover?: (face: number | undefined) => void;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xeff3f6);
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-label', '3D model. Hover a side face to preview its surface, then click to select.');
    canvas.tabIndex = 0;
    container.append(canvas);
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.addEventListener('change', () => { this.clearHover(); this.render(); });
    canvas.addEventListener('pointerdown', event => {
      if (event.button === 0) this.down = { x: event.clientX, y: event.clientY, moved: false };
      this.clearHover();
    });
    canvas.addEventListener('pointermove', event => {
      if (this.down) {
        this.down.moved ||= Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 4;
        return;
      }
      if (event.buttons) return;
      if (this.frame !== undefined) cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        this.frame = undefined;
        const face = this.hit(event.clientX, event.clientY);
        if (face !== this.lastHover) { this.lastHover = face; this.onHover?.(face); }
      });
    });
    canvas.addEventListener('pointerup', event => {
      const down = this.down; this.down = undefined;
      if (!down || down.moved || event.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) return;
      const face = this.hit(event.clientX, event.clientY);
      if (face !== undefined) this.onPick?.(face);
    });
    canvas.addEventListener('pointercancel', () => { this.down = undefined; this.clearHover(); });
    canvas.addEventListener('pointerleave', () => this.clearHover());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x73909e, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(0.8, -1.4, 2.2);
    const fill = new THREE.DirectionalLight(0xd5e5f1, 1.2);
    fill.position.set(-1, 0.5, 1);
    this.scene.add(key, fill, this.modelGroup, this.modifierGroup, this.selectionGroup, this.hoverGroup, this.rootGroup);
    this.resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      this.renderer.setSize(width, height);
      const previousFit = 1 / Math.min(1, this.camera.aspect);
      this.camera.aspect = width / Math.max(height, 1);
      if (this.original) {
        const scale = 1 / Math.min(1, this.camera.aspect) / previousFit;
        this.camera.position.sub(this.controls.target).multiplyScalar(scale).add(this.controls.target);
      }
      this.camera.updateProjectionMatrix();
      this.render();
    });
    this.resize.observe(container);
  }
  private hit(x: number, y: number): number | undefined {
    if (!this.original) return;
    const box = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((x - box.left) / box.width * 2 - 1, -(y - box.top) / box.height * 2 + 1), this.camera);
    return ray.intersectObject(this.original)[0]?.faceIndex ?? undefined;
  }
  private geometry(data: MeshData, faces?: readonly number[]) {
    const positions: number[] = [];
    for (const t of faces ? faces.map(f => data.triangles[f]) : data.triangles) for (const v of t) positions.push(...data.vertices[v]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  private release(group: THREE.Group) {
    for (const child of [...group.children]) {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
      }
      group.remove(child);
    }
  }
  private clearHover() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.lastHover = undefined;
    this.release(this.hoverGroup);
    this.renderer.domElement.style.cursor = '';
    this.onHover?.(undefined);
    this.render();
  }
  clear() {
    this.clearHover();
    for (const group of [this.modelGroup, this.modifierGroup, this.selectionGroup, this.rootGroup]) this.release(group);
    this.original = undefined; this.model = undefined;
    this.render();
  }
  setModel(data: MeshData, normals: readonly (readonly number[])[]) {
    this.clear(); this.model = data;
    const geometry = this.geometry(data);
    const colors: number[] = [];
    for (const normal of normals) {
      const color = new THREE.Color(Math.abs(normal[2]) < 1e-4 ? 0x87a9bf : 0xd4dfe5);
      for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.original = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, flatShading: true }));
    this.modelGroup.add(this.original);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), new THREE.LineBasicMaterial({ color: 0x3c6073, transparent: true, opacity: 0.28 }));
    this.modelGroup.add(edges);
    this.bounds.setFromBufferAttribute(geometry.getAttribute('position') as THREE.BufferAttribute);
    this.setXray(this.xray);
    this.fitView();
  }
  private overlay(faces: readonly number[], color: number, opacity: number, group: THREE.Group) {
    if (!this.model || !faces.length) return;
    const mesh = new THREE.Mesh(this.geometry(this.model, faces), new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    mesh.renderOrder = group === this.hoverGroup ? 5 : 4;
    group.add(mesh);
  }
  setHover(faces: readonly number[], base = false) {
    this.release(this.hoverGroup);
    this.overlay(faces, base ? 0x9673d0 : 0x1aab95, base ? 0.65 : 0.35, this.hoverGroup);
    this.renderer.domElement.style.cursor = faces.length ? 'pointer' : '';
    this.container.dataset.hover = faces.length ? (base ? 'base' : 'side') : 'none';
    this.render();
  }
  setPreview(modifiers: readonly MeshData[], selected: readonly number[], root?: RootPreview) {
    for (const group of [this.modifierGroup, this.selectionGroup, this.rootGroup]) this.release(group);
    for (const data of modifiers) {
      const mesh = new THREE.Mesh(this.geometry(data), new THREE.MeshBasicMaterial({
        color: 0xf2993e, transparent: true, opacity: 0.64, depthWrite: false, depthTest: false, side: THREE.FrontSide,
      }));
      mesh.renderOrder = 6;
      this.modifierGroup.add(mesh);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 35), new THREE.LineBasicMaterial({ color: 0x9c4709, transparent: true, opacity: 0.95, depthTest: false }));
      outline.renderOrder = 7; this.modifierGroup.add(outline);
    }
    this.overlay(selected, 0x139783, 0.18, this.selectionGroup);
    if (this.model && selected.length) {
      const surface = this.geometry(this.model, selected);
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(surface, 35), new THREE.LineBasicMaterial({ color: 0x087c83, transparent: true, opacity: 0.95, depthTest: false }));
      surface.dispose(); outline.renderOrder = 4; this.selectionGroup.add(outline);
    }
    if (root) {
      for (const loop of [root.footprint.outer, ...root.footprint.holes]) {
        const points = [...loop, loop[0]].map(p => new THREE.Vector3(p[0], p[1], root.z));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x895bc7, depthTest: false, transparent: true }));
        line.renderOrder = 8; this.rootGroup.add(line);
      }
    }
    this.render();
  }
  setXray(enabled: boolean) {
    this.xray = enabled;
    if (this.original) {
      const material = this.original.material;
      material.transparent = enabled; material.opacity = enabled ? 0.25 : 1;
      material.depthWrite = !enabled; material.needsUpdate = true;
    }
    this.render();
  }
  fitView(top = false) {
    if (!this.original) return;
    const center = this.bounds.getCenter(new THREE.Vector3());
    const radius = this.bounds.getSize(new THREE.Vector3()).length() * 0.5;
    this.controls.target.copy(center);
    const fit = 1 / Math.min(1, this.camera.aspect);
    const direction = top ? new THREE.Vector3(0, -0.001, 1) : new THREE.Vector3(1.25, -1.8, 1.35).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(radius * 2.8 * fit));
    this.camera.near = Math.max(radius / 1000, 0.001);
    this.camera.far = Math.max(radius * 100, 1000);
    this.camera.updateProjectionMatrix(); this.controls.update();
    this.render();
  }
  private render() { this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.clear(); this.resize.disconnect(); this.controls.dispose(); this.renderer.dispose();
  }
}
