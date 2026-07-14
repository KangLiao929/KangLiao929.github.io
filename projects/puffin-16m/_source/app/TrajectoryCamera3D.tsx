"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { assetPath } from "./assetPath";

type MotionAxis = "roll" | "pitch" | "yaw";

export type TrajectoryPose = {
  type: MotionAxis;
  pattern: string;
  start_deg: number;
  end_deg: number;
  frame_count: number;
};

type RenderEntry = {
  element: HTMLDivElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  posePivot: THREE.Group;
  sample: TrajectoryPose;
  startTime: number;
  modelReady: boolean;
  visible: boolean;
  reducedMotion: boolean;
};

let cameraModelPromise: Promise<THREE.Group> | null = null;
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;
let sharedAnimationFrame = 0;
let renderedWidth = 0;
let renderedHeight = 0;
let lastRenderTime = 0;
let webglUnavailable = false;
const renderEntries = new Set<RenderEntry>();
const FRAME_INTERVAL = 1000 / 24;

function loadCameraModel() {
  if (!cameraModelPromise) {
    cameraModelPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        assetPath("/models/camera-01/Camera_01_1k.gltf"),
        (gltf) => resolve(gltf.scene),
        undefined,
        reject,
      );
    });
  }
  return cameraModelPromise;
}

function interpolatePose(sample: TrajectoryPose, progress: number) {
  if (sample.pattern === "full_circle") {
    return THREE.MathUtils.lerp(sample.start_deg, sample.end_deg, progress);
  }

  if (sample.pattern === "bi_pos_neg" || sample.pattern === "bi_neg_pos") {
    const firstLegFrames = Math.ceil((sample.frame_count - 1) / 2);
    const direction = sample.pattern === "bi_pos_neg" ? 1 : -1;
    const turningPoint = sample.start_deg + direction * firstLegFrames;
    if (progress < 0.5) return THREE.MathUtils.lerp(sample.start_deg, turningPoint, progress * 2);
    return THREE.MathUtils.lerp(turningPoint, sample.end_deg, (progress - 0.5) * 2);
  }

  return THREE.MathUtils.lerp(sample.start_deg, sample.end_deg, progress);
}

function setAxisRotation(group: THREE.Group, type: MotionAxis, angleDeg: number) {
  const angle = THREE.MathUtils.degToRad(angleDeg);
  group.rotation.set(0, 0, 0);
  if (type === "pitch") group.rotation.x = angle;
  if (type === "yaw") group.rotation.y = angle;
  if (type === "roll") group.rotation.z = angle;
}

function addAxis(scene: THREE.Scene, type: MotionAxis) {
  const color = type === "pitch" ? 0xff7062 : type === "yaw" ? 0x7ee59a : 0x73c9ff;
  const direction = type === "pitch"
    ? new THREE.Vector3(1, 0, 0)
    : type === "yaw"
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);

  scene.add(new THREE.ArrowHelper(direction, direction.clone().multiplyScalar(-0.84), 1.68, color, 0.16, 0.08));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.009, 6, 96),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.52 }),
  );
  if (type === "pitch") ring.rotation.y = Math.PI / 2;
  if (type === "yaw") ring.rotation.x = Math.PI / 2;
  scene.add(ring);
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xff6848 }),
  ));
}

function configureSharedRenderer(host?: HTMLElement) {
  if (sharedRenderer) return sharedRenderer;
  if (webglUnavailable || !host) return null;
  try {
    sharedCanvas = host.querySelector<HTMLCanvasElement>(":scope > .trajectory-camera-layer");
    if (!sharedCanvas) return null;
    const context = sharedCanvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "high-performance" });
    if (!context) {
      webglUnavailable = true;
      sharedCanvas = null;
      return null;
    }
    sharedRenderer = new THREE.WebGLRenderer({ canvas: sharedCanvas, context, alpha: true, antialias: true, powerPreference: "high-performance" });
    // A single 1x viewport is crisp enough at this card size and avoids
    // allocating a multi-million-pixel buffer on high-DPI displays.
    sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace;
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.22;
    sharedRenderer.autoClear = false;
  } catch {
    webglUnavailable = true;
    sharedCanvas = null;
    sharedRenderer = null;
    return null;
  }
  return sharedRenderer;
}

function renderSharedViewports(now: number) {
  sharedAnimationFrame = 0;
  const hasVisibleEntries = [...renderEntries].some((entry) => entry.visible && entry.modelReady);
  if (!sharedRenderer || !sharedCanvas || !hasVisibleEntries || document.hidden) return;

  if (now - lastRenderTime < FRAME_INTERVAL) {
    sharedAnimationFrame = requestAnimationFrame(renderSharedViewports);
    return;
  }
  lastRenderTime = now;

  const canvasWidth = Math.max(1, sharedCanvas.clientWidth);
  const canvasHeight = Math.max(1, sharedCanvas.clientHeight);
  if (renderedWidth !== canvasWidth || renderedHeight !== canvasHeight) {
    renderedWidth = canvasWidth;
    renderedHeight = canvasHeight;
    sharedRenderer.setSize(renderedWidth, renderedHeight, false);
  }

  const canvasRect = sharedCanvas.getBoundingClientRect();

  sharedRenderer.setScissorTest(false);
  sharedRenderer.setClearColor(0x000000, 0);
  sharedRenderer.clear(true, true, true);
  sharedRenderer.setScissorTest(true);

  renderEntries.forEach((entry) => {
    if (!entry.modelReady || !entry.visible) return;
    const rect = entry.element.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;

    const left = Math.max(0, rect.left - canvasRect.left);
    const right = Math.min(canvasRect.width, rect.right - canvasRect.left);
    const top = Math.max(0, rect.top - canvasRect.top);
    const bottom = Math.min(canvasRect.height, rect.bottom - canvasRect.top);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const viewportBottom = canvasRect.height - bottom;

    entry.camera.aspect = rect.width / Math.max(1, rect.height);
    entry.camera.updateProjectionMatrix();
    const duration = entry.sample.pattern === "full_circle" ? 5200 : 4200;
    const progress = entry.reducedMotion ? 0.5 : ((now - entry.startTime) % duration) / duration;
    setAxisRotation(entry.posePivot, entry.sample.type, interpolatePose(entry.sample, progress));

    sharedRenderer!.setViewport(left, viewportBottom, width, height);
    sharedRenderer!.setScissor(left, viewportBottom, width, height);
    sharedRenderer!.clearDepth();
    sharedRenderer!.render(entry.scene, entry.camera);
  });

  if ([...renderEntries].some((entry) => entry.visible && entry.modelReady)) {
    sharedAnimationFrame = requestAnimationFrame(renderSharedViewports);
  }
}

function ensureSharedLoop(host?: HTMLElement) {
  if (!configureSharedRenderer(host)) return false;
  if (!sharedAnimationFrame) sharedAnimationFrame = requestAnimationFrame(renderSharedViewports);
  return true;
}

function makeScene(sample: TrajectoryPose) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 30);
  camera.position.set(0.08, 0.04, 4.25);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xdcefff, 0x21110d, 2.5));
  const keyLight = new THREE.DirectionalLight(0xffe1c4, 4.2);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x73c9ff, 3.4);
  rimLight.position.set(-4, 1, -3);
  scene.add(rimLight);
  addAxis(scene, sample.type);
  const posePivot = new THREE.Group();
  scene.add(posePivot);
  return { scene, camera, posePivot };
}

export default function TrajectoryCamera3D({ sample }: { sample: TrajectoryPose }) {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;
    const canvasHost = element.closest<HTMLElement>(".trajectory-grid");
    if (!canvasHost || !ensureSharedLoop(canvasHost)) {
      element.dataset.modelError = "true";
      return;
    }
    const { scene, camera, posePivot } = makeScene(sample);
    const entry: RenderEntry = {
      element,
      scene,
      camera,
      posePivot,
      sample,
      startTime: performance.now(),
      modelReady: false,
      visible: false,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    renderEntries.add(entry);

    const visibilityObserver = new IntersectionObserver(
      ([observation]) => {
        entry.visible = observation.isIntersecting;
        if (entry.visible) {
          entry.startTime = performance.now();
          ensureSharedLoop();
        }
      },
      { rootMargin: "80px 0px", threshold: 0.01 },
    );
    visibilityObserver.observe(element);

    const resumeWhenVisible = () => {
      if (!document.hidden && entry.visible) ensureSharedLoop();
    };
    document.addEventListener("visibilitychange", resumeWhenVisible);

    let disposed = false;
    loadCameraModel().then((source) => {
      if (disposed) return;
      const model = source.clone(true);
      model.traverse((child) => {
        if (child.name.toLowerCase().includes("strap")) child.visible = false;
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 0.85;
          });
        }
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar(1.58 / Math.max(size.x, size.y, size.z));
      model.rotation.set(0.07, -0.28, -0.02);
      posePivot.add(model);
      entry.modelReady = true;
      element.dataset.modelReady = "true";
      if (entry.visible) ensureSharedLoop();
    }).catch(() => {
      element.dataset.modelError = "true";
    });

    return () => {
      disposed = true;
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", resumeWhenVisible);
      renderEntries.delete(entry);
    };
  }, [sample]);

  return (
    <>
      <div
        ref={targetRef}
        className="trajectory-camera-canvas"
        role="img"
        aria-label={`${sample.type} camera pose rendered with a fixed optical center`}
      />
      <img className="trajectory-camera-fallback" src={assetPath("/models/camera-01/camera-fallback.webp")} alt="" aria-hidden="true" />
    </>
  );
}
