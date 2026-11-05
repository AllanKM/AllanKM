import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MapPoint } from "../data/points.ts";
import { WORLD_DEPTH, WORLD_WIDTH } from "../data/geo.ts";
import { drawBasemap } from "./basemap.ts";

type BarraMapProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

type DrawnPoint = MapPoint & { scale: number };

const INITIAL_POSITION = new THREE.Vector3(3, 30, 24);
const INITIAL_TARGET = new THREE.Vector3(0, 1.4, -1);
const DOT_COLOR = new THREE.Color("#ff5a45");
const DOT_HOT = new THREE.Color("#ffe7e1");
const RING_COLOR = new THREE.Color("#ffcbbf");
const RING_HOT = new THREE.Color("#fff6f3");

function markerScale(id: string, kind: MapPoint["kind"]): number {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const jitter = 0.9 + (hash % 20) / 100;
  return (kind === "dot" ? 0.62 : 0.7) * jitter;
}

function makeDotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const glow = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  glow.addColorStop(0, "rgba(255, 246, 242, 1)");
  glow.addColorStop(0.28, "rgba(255, 104, 84, 1)");
  glow.addColorStop(0.62, "rgba(255, 78, 62, 0.72)");
  glow.addColorStop(1, "rgba(255, 78, 62, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255, 228, 220, 0.98)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(64, 64, 42, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function paint(mesh: THREE.InstancedMesh, points: DrawnPoint[], selectedId: string | null, base: THREE.Color, hot: THREE.Color) {
  if (points.length === 0) return;
  for (let index = 0; index < points.length; index += 1) {
    mesh.setColorAt(index, points[index].id === selectedId ? hot : base);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function BarraMap({ points, selectedId, onSelect }: BarraMapProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef(points);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const resetRef = useRef<(() => void) | null>(null);
  pointsRef.current = points;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x090b10, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    camera.position.copy(INITIAL_POSITION);

    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(INITIAL_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.minDistance = 14;
    controls.maxDistance = 130;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    controls.addEventListener("change", () => {
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -70, 70);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, -2, 18);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -40, 40);
    });
    controls.update();

    const basemap = drawBasemap();
    const groundTexture = new THREE.CanvasTexture(basemap);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH),
      new THREE.MeshBasicMaterial({ map: groundTexture }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const dotTexture = makeDotTexture();
    const ringTexture = makeRingTexture();
    const markerMaterial = (map: THREE.Texture, ring: boolean) =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        alphaTest: ring ? 0.35 : 0,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
    const dots = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), markerMaterial(dotTexture, false), 2488);
    const rings = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), markerMaterial(ringTexture, true), 2488);
    dots.count = 0;
    rings.count = 0;
    dots.frustumCulled = false;
    rings.frustumCulled = false;
    dots.renderOrder = 2;
    rings.renderOrder = 2;
    scene.add(rings, dots);

    const stemMaterial = new THREE.LineBasicMaterial({
      color: 0xff6a55,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const stems = new THREE.LineSegments(new THREE.BufferGeometry(), stemMaterial);
    stems.frustumCulled = false;
    stems.renderOrder = 1;
    scene.add(stems);

    const dummy = new THREE.Object3D();
    let dotPoints: DrawnPoint[] = [];
    let ringPoints: DrawnPoint[] = [];
    let built: MapPoint[] | null = null;
    let paintedSelection: string | null | undefined;

    const writeMatrices = (
      mesh: THREE.InstancedMesh,
      list: DrawnPoint[],
      selected: string | null,
      flat: boolean,
    ) => {
      for (let index = 0; index < list.length; index += 1) {
        const point = list[index];
        dummy.position.set(point.x, point.y, point.z);
        if (flat) dummy.rotation.set(-Math.PI / 2, 0, 0);
        else dummy.quaternion.copy(camera.quaternion);
        dummy.scale.setScalar(point.scale * (point.id === selected ? 1.65 : 1));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    const rebuild = (next: MapPoint[]) => {
      dotPoints = [];
      ringPoints = [];
      for (const point of next) {
        const drawn = { ...point, scale: markerScale(point.id, point.kind) };
        if (point.kind === "dot") dotPoints.push(drawn);
        else ringPoints.push(drawn);
      }
      dots.count = dotPoints.length;
      rings.count = ringPoints.length;
      paint(dots, dotPoints, selectedRef.current, DOT_COLOR, DOT_HOT);
      paint(rings, ringPoints, selectedRef.current, RING_COLOR, RING_HOT);
      paintedSelection = selectedRef.current;

      const towers = new Map<string, DrawnPoint>();
      for (const point of dotPoints) {
        const key = `${point.x.toFixed(4)}|${point.z.toFixed(4)}`;
        const previous = towers.get(key);
        if (!previous || point.y > previous.y) towers.set(key, point);
      }
      const positions = new Float32Array(Math.max(towers.size, 1) * 6);
      let offset = 0;
      for (const point of towers.values()) {
        positions[offset++] = point.x;
        positions[offset++] = 0.05;
        positions[offset++] = point.z;
        positions[offset++] = point.x;
        positions[offset++] = point.y;
        positions[offset++] = point.z;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, offset), 3));
      const previous = stems.geometry;
      stems.geometry = geometry;
      previous.dispose();
      built = next;
    };

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const center = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const cameraRight = new THREE.Vector3();
    const pick = (event: PointerEvent): string | null => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      camera.updateMatrixWorld();
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
      let bestId: string | null = null;
      let bestScore = Infinity;
      const consider = (point: DrawnPoint) => {
        center.set(point.x, point.y, point.z);
        edge.copy(center).addScaledVector(cameraRight, point.scale * 0.5);
        center.project(camera);
        edge.project(camera);
        if (center.z < -1 || center.z > 1) return;
        const sx = (center.x * 0.5 + 0.5) * rect.width;
        const sy = (-center.y * 0.5 + 0.5) * rect.height;
        const radius = Math.max(14, Math.hypot((edge.x - center.x) * rect.width, (edge.y - center.y) * rect.height) * 0.5 + 8);
        const distance = Math.hypot(sx - x, sy - y);
        if (distance > radius) return;
        const score = distance / radius;
        if (score < bestScore) {
          bestScore = score;
          bestId = point.id;
        }
      };
      for (const point of dotPoints) consider(point);
      for (const point of ringPoints) consider(point);
      return bestId;
    };

    let startX = 0;
    let startY = 0;
    const onPointerDown = (event: PointerEvent) => {
      startX = event.clientX;
      startY = event.clientY;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.buttons) return;
      canvas.style.cursor = pick(event) ? "pointer" : "grab";
    };
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 6) return;
      onSelectRef.current(pick(event));
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);

    resetRef.current = () => {
      camera.position.copy(INITIAL_POSITION);
      controls.target.copy(INITIAL_TARGET);
      controls.update();
    };

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (pointsRef.current !== built) rebuild(pointsRef.current);
      const selected = selectedRef.current;
      writeMatrices(dots, dotPoints, selected, false);
      writeMatrices(rings, ringPoints, selected, true);
      if (selected !== paintedSelection) {
        paint(dots, dotPoints, selected, DOT_COLOR, DOT_HOT);
        paint(rings, ringPoints, selected, RING_COLOR, RING_HOT);
        paintedSelection = selected;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      resetRef.current = null;
      controls.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      groundTexture.dispose();
      dots.geometry.dispose();
      rings.geometry.dispose();
      (dots.material as THREE.Material).dispose();
      (rings.material as THREE.Material).dispose();
      dotTexture.dispose();
      ringTexture.dispose();
      stems.geometry.dispose();
      stemMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div className="map-stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          aria-label="Mapa tridimensional da Barra da Tijuca. Arraste para mover, role para aproximar e toque num ponto para ver o imóvel."
        />
      </div>
      <button
        type="button"
        className="map-control"
        aria-label="Recentralizar o mapa"
        onClick={() => resetRef.current?.()}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M9 1.6v2.1M9 14.3v2.1M1.6 9h2.1M14.3 9h2.1" />
          <path d="M9 4.1 11.2 9 9 13.9 6.8 9Z" />
        </svg>
      </button>
      {selectedId == null && (
        <p className="map-hint">
          Arraste para mover. Role para aproximar. Toque num ponto para ver o imóvel.
        </p>
      )}
    </>
  );
}
