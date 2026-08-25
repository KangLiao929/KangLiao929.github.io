import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(() => {
  const explorer = document.querySelector(".world-app");
  if (!explorer) return;

  const canvas = document.getElementById("point-cloud");
  const viewport = document.getElementById("world-viewport");
  const sceneLabel = document.getElementById("scene-label");
  const outputLabel = document.getElementById("output-label");
  const pointCountLabel = document.getElementById("point-count-label");
  const resetButton = document.getElementById("reset-view");
  const loading = document.getElementById("viewer-loading");
  const loadingText = loading.querySelector("span");
  const progressBar = document.getElementById("viewer-progress");
  const videos = {
    appearance: document.getElementById("state-appearance"),
    gravity: document.getElementById("state-gravity"),
    latitude: document.getElementById("state-latitude"),
    geometry: document.getElementById("state-geometry")
  };

  const root = "assets/explorer";
  const scenes = {
    "scene-01": { name: "Outdoor Park", short: "outdoor park", points: "459K points", model: `${root}/scene-01/reconstruction.glb` },
    "scene-02": { name: "Kitchen", short: "kitchen", points: "670K points", model: `${root}/scene-02/reconstruction.glb` },
    "scene-03": { name: "Living Room", short: "living room", points: "565K points", model: `${root}/scene-03/reconstruction.glb` },
    "scene-04": { name: "Sunlit Bedroom", short: "sunlit bedroom", points: "779K points", model: `${root}/scene-04/reconstruction.glb` },
    "scene-05": { name: "Bedroom", short: "bedroom", points: "647K points", model: `${root}/scene-05/reconstruction.glb` }
  };
  const stateNames = {
    appearance: "Appearance",
    gravity: "Gravity physics",
    latitude: "Latitude physics",
    geometry: "Geometry"
  };

  let activeScene = "scene-01";
  let mediaToken = 0;
  let explorerVisible = true;
  let lastMediaSync = 0;
  let pointCloudViewer = null;

  function pauseVideos() {
    Object.values(videos).forEach((video) => video.pause());
  }

  function syncAndPlayVideos() {
    const list = Object.values(videos);
    if (!list.length) return;
    const masterTime = Number.isFinite(list[0].currentTime) ? list[0].currentTime : 0;
    list.forEach((video, index) => {
      video.muted = true;
      video.playsInline = true;
      if (index && Math.abs(video.currentTime - masterTime) > .08) video.currentTime = masterTime;
      video.play().catch(() => {});
    });
  }

  async function loadVideos(sceneKey) {
    const token = ++mediaToken;
    pauseVideos();
    const ready = Object.entries(videos).map(([state, video]) => new Promise((resolve) => {
      const finish = () => resolve();
      video.addEventListener("loadeddata", finish, { once: true });
      video.addEventListener("error", finish, { once: true });
      video.src = `${root}/${sceneKey}/${state}.mp4`;
      video.setAttribute("aria-label", `${stateNames[state]} world-state video for the ${scenes[sceneKey].short}`);
      video.load();
    }));
    await Promise.all(ready);
    if (token !== mediaToken || activeScene !== sceneKey) return;
    Object.values(videos).forEach((video) => { video.currentTime = 0; });
    if (explorerVisible && !document.hidden) syncAndPlayVideos();
  }

  function updateButtons() {
    document.querySelectorAll(".scene-button").forEach((button) => {
      const selected = button.dataset.scene === activeScene;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  function setScene(sceneKey) {
    if (!scenes[sceneKey] || sceneKey === activeScene && pointCloudViewer?.modelLoaded()) return;
    activeScene = sceneKey;
    const sceneData = scenes[sceneKey];
    updateButtons();
    sceneLabel.textContent = sceneData.name;
    outputLabel.textContent = sceneData.points;
    pointCountLabel.textContent = sceneData.points;
    canvas.setAttribute("aria-label", `Interactive 3D reconstruction of the ${sceneData.short}`);
    loadVideos(sceneKey);
    pointCloudViewer?.loadScene(sceneKey);
  }

  document.querySelectorAll(".scene-button").forEach((button) => button.addEventListener("click", () => setScene(button.dataset.scene)));
  new IntersectionObserver(([entry]) => {
    explorerVisible = entry.isIntersecting;
    pointCloudViewer?.setVisible(explorerVisible);
    if (explorerVisible && !document.hidden) syncAndPlayVideos();
    else pauseVideos();
  }, { rootMargin: "120px 0px" }).observe(explorer);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideos();
    else if (explorerVisible) syncAndPlayVideos();
  });

  function mediaLoop(now) {
    requestAnimationFrame(mediaLoop);
    if (!explorerVisible || document.hidden || now - lastMediaSync < 1200) return;
    lastMediaSync = now;
    const master = videos.appearance.currentTime;
    Object.values(videos).slice(1).forEach((video) => {
      if (Math.abs(video.currentTime - master) > .1) video.currentTime = master;
    });
  }

  function createPointCloudViewer() {
    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, .01, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .075;
    controls.screenSpacePanning = true;
    controls.rotateSpeed = .7;
    controls.zoomSpeed = .85;
    controls.panSpeed = .65;
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());

    const loader = new GLTFLoader();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const IDLE_DELAY = 900;
    const SWAY_AMPLITUDE = .06;
    const SWAY_SPEED = .001;
    const sway = {
      active: false,
      interacting: false,
      baseAngle: 0,
      radius: 1,
      height: 0,
      startedAt: 0,
      lastInteraction: performance.now() - IDLE_DELAY
    };

    let activeModel = null;
    let activeModelScene = null;
    let modelBounds = null;
    let loadToken = 0;
    let viewerVisible = true;

    function captureSwayAnchor(now = performance.now()) {
      const offset = camera.position.clone().sub(controls.target);
      sway.baseAngle = Math.atan2(offset.x, offset.z);
      sway.radius = Math.max(.01, Math.hypot(offset.x, offset.z));
      sway.height = offset.y;
      sway.startedAt = now;
    }

    function beginInteraction() {
      sway.interacting = true;
      sway.active = false;
      sway.lastInteraction = performance.now();
      controls.update();
    }

    function endInteraction() {
      sway.interacting = false;
      sway.active = false;
      sway.lastInteraction = performance.now();
      controls.update();
      captureSwayAnchor();
    }

    controls.addEventListener("start", beginInteraction);
    controls.addEventListener("end", endInteraction);

    function showLoading(message, progress = 0) {
      loadingText.textContent = message;
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
      loading.classList.remove("is-hidden");
    }

    function hideLoading() {
      progressBar.style.width = "100%";
      loading.classList.add("is-hidden");
    }

    function disposeMaterial(material) {
      if (!material) return;
      if (Array.isArray(material)) material.forEach(disposeMaterial);
      else material.dispose?.();
    }

    function clearModel() {
      if (!activeModel) return;
      threeScene.remove(activeModel);
      activeModel.traverse((node) => {
        node.geometry?.dispose?.();
        disposeMaterial(node.material);
      });
      activeModel = null;
      activeModelScene = null;
      modelBounds = null;
    }

    function fitModel(startSway = false) {
      if (!activeModel || !modelBounds) return;
      const center = modelBounds.getCenter(new THREE.Vector3());
      const size = modelBounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * .5, .1);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const distance = radius / Math.sin(fov * .5) * 1.08;
      const direction = new THREE.Vector3(.82, .28, 1).normalize();

      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.near = Math.max(.005, distance / 500);
      camera.far = Math.max(100, distance * 50);
      camera.updateProjectionMatrix();
      controls.minDistance = radius * .08;
      controls.maxDistance = radius * 12;
      controls.update();
      captureSwayAnchor();
      sway.active = false;
      sway.lastInteraction = performance.now() - (startSway ? IDLE_DELAY : 0);
      renderer.render(threeScene, camera);
    }

    function preparePointCloud(model) {
      const initialBounds = new THREE.Box3().setFromObject(model);
      const diagonal = initialBounds.getSize(new THREE.Vector3()).length();
      model.traverse((node) => {
        if (!node.isPoints) return;
        const hasVertexColors = Boolean(node.geometry.getAttribute("color"));
        disposeMaterial(node.material);
        node.material = new THREE.PointsMaterial({
          color: hasVertexColors ? 0xffffff : 0xb8d5f1,
          size: Math.max(.0055, diagonal * .00145),
          sizeAttenuation: true,
          vertexColors: hasVertexColors,
          transparent: false,
          toneMapped: false
        });
        node.frustumCulled = false;
      });
      return new THREE.Box3().setFromObject(model);
    }

    function loadScene(sceneKey) {
      const token = ++loadToken;
      clearModel();
      showLoading("Loading 3D reconstruction", 4);

      loader.load(
        scenes[sceneKey].model,
        (gltf) => {
          if (token !== loadToken || activeScene !== sceneKey) {
            gltf.scene.traverse((node) => {
              node.geometry?.dispose?.();
              disposeMaterial(node.material);
            });
            return;
          }
          activeModel = gltf.scene;
          activeModelScene = sceneKey;
          modelBounds = preparePointCloud(activeModel);
          threeScene.add(activeModel);
          fitModel(true);
          hideLoading();
        },
        (event) => {
          if (token !== loadToken) return;
          const progress = event.total ? event.loaded / event.total * 100 : 32;
          progressBar.style.width = `${Math.max(4, Math.min(94, progress))}%`;
        },
        () => {
          if (token !== loadToken) return;
          loadingText.textContent = "Unable to load this reconstruction";
          progressBar.style.width = "0";
        }
      );
    }

    function resize() {
      const rect = viewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      if (activeModel) renderer.render(threeScene, camera);
    }

    resetButton.addEventListener("click", () => fitModel(false));
    new ResizeObserver(resize).observe(viewport);

    function animate(now) {
      requestAnimationFrame(animate);
      if (!viewerVisible || !activeModel || document.hidden) return;

      const idle = !reducedMotion.matches && !sway.interacting && now - sway.lastInteraction >= IDLE_DELAY;
      if (idle) {
        if (!sway.active) {
          sway.active = true;
          captureSwayAnchor(now);
        }
        const angle = sway.baseAngle + Math.sin((now - sway.startedAt) * SWAY_SPEED) * SWAY_AMPLITUDE;
        camera.position.x = controls.target.x + Math.sin(angle) * sway.radius;
        camera.position.z = controls.target.z + Math.cos(angle) * sway.radius;
        camera.position.y = controls.target.y + sway.height;
        camera.lookAt(controls.target);
      } else {
        controls.update();
      }
      renderer.render(threeScene, camera);
    }

    resize();
    requestAnimationFrame(animate);
    return {
      loadScene,
      modelLoaded: () => activeModelScene === activeScene,
      resetView: () => fitModel(false),
      setVisible: (visible) => { viewerVisible = visible; }
    };
  }

  updateButtons();
  loadVideos(activeScene);
  requestAnimationFrame(mediaLoop);

  try {
    pointCloudViewer = createPointCloudViewer();
    pointCloudViewer.loadScene(activeScene);
  } catch (error) {
    console.error("Puffin-World 3D viewer initialization failed", error);
    loadingText.textContent = "3D viewer unavailable · enable WebGL to continue";
    progressBar.style.width = "0";
    loading.classList.remove("is-hidden");
  }

  window.__puffinWorldViewer = {
    getState: () => ({
      scene: activeScene,
      modelLoaded: pointCloudViewer?.modelLoaded() || false,
      videos: Object.values(videos).map((video) => video.currentSrc)
    }),
    setScene,
    resetView: () => pointCloudViewer?.resetView()
  };
})();

document.getElementById("copy-bibtex")?.addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(document.getElementById("bibtex").textContent.trim());
    event.currentTarget.textContent = "Copied";
    setTimeout(() => { event.currentTarget.textContent = "Copy BibTeX"; }, 1500);
  } catch (_) {
    event.currentTarget.textContent = "Select to copy";
  }
});
