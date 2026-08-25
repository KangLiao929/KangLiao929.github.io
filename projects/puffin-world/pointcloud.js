import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const explorer = document.querySelector(".world-app");

if (explorer) {
  const canvas = document.getElementById("point-cloud");
  const video = document.getElementById("world-state-video");
  const viewport = document.getElementById("world-viewport");
  const sceneLabel = document.getElementById("scene-label");
  const stateLabel = document.getElementById("state-label");
  const outputLabel = document.getElementById("output-label");
  const modeLabel = document.getElementById("viewer-mode-label");
  const caption = document.getElementById("world-state-caption");
  const resetButton = document.getElementById("reset-view");
  const gestureHint = document.getElementById("gesture-hint");
  const axisWidget = document.querySelector(".axis-widget");
  const loading = document.getElementById("viewer-loading");
  const loadingText = loading.querySelector("span");
  const progressBar = document.getElementById("viewer-progress");

  const root = "assets/explorer";
  const scenes = {
    "scene-01": { name: "Outdoor Park", short: "outdoor park", points: "459K points", model: `${root}/scene-01/reconstruction.glb` },
    "scene-02": { name: "Kitchen", short: "kitchen", points: "670K points", model: `${root}/scene-02/reconstruction.glb` },
    "scene-03": { name: "Living Room", short: "living room", points: "565K points", model: `${root}/scene-03/reconstruction.glb` },
    "scene-04": { name: "Sunlit Bedroom", short: "sunlit bedroom", points: "779K points", model: `${root}/scene-04/reconstruction.glb` },
    "scene-05": { name: "Bedroom", short: "bedroom", points: "647K points", model: `${root}/scene-05/reconstruction.glb` }
  };

  const states = {
    reconstruction: {
      label: "3D Reconstruction",
      mode: "Interactive 3D reconstruction",
      caption: "Interact with the reconstructed point cloud to inspect the generated world from free viewpoints."
    },
    appearance: {
      label: "Appearance",
      mode: "Appearance world state",
      caption: "The appearance world state presents the generated RGB trajectory across the controlled viewpoints."
    },
    gravity: {
      label: "Gravity",
      mode: "Physics world state · gravity",
      caption: "The gravity-aligned physics world state visualizes the propagated up direction throughout the trajectory."
    },
    latitude: {
      label: "Latitude",
      mode: "Physics world state · latitude",
      caption: "The latitude physics world state exposes absolute camera elevation relative to the real-world horizon."
    },
    geometry: {
      label: "Geometry",
      mode: "Geometry world state",
      caption: "The geometry world state encodes the generated scene structure as a dense depth trajectory."
    }
  };

  let activeScene = "scene-01";
  let activeState = "reconstruction";
  let activeModel = null;
  let activeModelScene = null;
  let modelBounds = null;
  let loadToken = 0;
  let explorerVisible = true;

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

  function videoPath(sceneKey, stateKey) {
    return `${root}/${sceneKey}/${stateKey}.mp4`;
  }

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

  function fitModel() {
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

  function loadModel(sceneKey) {
    if (activeModel && activeModelScene === sceneKey) {
      hideLoading();
      fitModel();
      return;
    }

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
        fitModel();
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

  function loadVideo(sceneKey, stateKey) {
    showLoading(`Loading ${states[stateKey].label.toLowerCase()} state`, 24);
    video.pause();
    video.src = videoPath(sceneKey, stateKey);
    video.load();
    if (explorerVisible) video.play().catch(() => {});
  }

  function updateButtons() {
    document.querySelectorAll(".scene-button").forEach((button) => {
      const selected = button.dataset.scene === activeScene;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    document.querySelectorAll(".state-button").forEach((button) => {
      const selected = button.dataset.state === activeState;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  function updateInterface() {
    const sceneData = scenes[activeScene];
    const stateData = states[activeState];
    const isReconstruction = activeState === "reconstruction";

    updateButtons();
    sceneLabel.textContent = sceneData.name;
    stateLabel.textContent = stateData.label;
    outputLabel.textContent = isReconstruction ? `${sceneData.points} · GLB` : "2 s trajectory · MP4";
    modeLabel.lastChild.textContent = ` ${stateData.mode}`;
    caption.textContent = stateData.caption;
    canvas.setAttribute("aria-label", `Interactive 3D reconstruction of the ${sceneData.short}`);
    video.setAttribute("aria-label", `${stateData.label} world-state video for the ${sceneData.short}`);

    canvas.hidden = !isReconstruction;
    video.hidden = isReconstruction;
    resetButton.hidden = !isReconstruction;
    axisWidget.hidden = !isReconstruction;
    gestureHint.hidden = !isReconstruction;

    if (isReconstruction) {
      video.pause();
      loadModel(activeScene);
    } else {
      loadVideo(activeScene, activeState);
    }
  }

  function setScene(sceneKey) {
    if (!scenes[sceneKey]) return;
    if (sceneKey !== activeScene && activeModelScene !== sceneKey) {
      ++loadToken;
      clearModel();
    }
    activeScene = sceneKey;
    updateInterface();
  }

  function setState(stateKey) {
    if (!states[stateKey]) return;
    activeState = stateKey;
    updateInterface();
  }

  video.addEventListener("loadeddata", () => {
    if (activeState !== "reconstruction") {
      hideLoading();
      if (explorerVisible) video.play().catch(() => {});
    }
  });
  video.addEventListener("error", () => {
    if (activeState === "reconstruction") return;
    loadingText.textContent = "Unable to load this world state";
    progressBar.style.width = "0";
  });

  document.querySelectorAll(".scene-button").forEach((button) => button.addEventListener("click", () => setScene(button.dataset.scene)));
  document.querySelectorAll(".state-button").forEach((button) => button.addEventListener("click", () => setState(button.dataset.state)));
  resetButton.addEventListener("click", fitModel);

  function resize() {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    if (activeModel) renderer.render(threeScene, camera);
  }

  new ResizeObserver(resize).observe(viewport);
  new IntersectionObserver(([entry]) => {
    explorerVisible = entry.isIntersecting;
    if (activeState !== "reconstruction") {
      if (explorerVisible) video.play().catch(() => {});
      else video.pause();
    }
  }, { rootMargin: "120px 0px" }).observe(explorer);

  function animate() {
    requestAnimationFrame(animate);
    if (!explorerVisible || activeState !== "reconstruction" || !activeModel) return;
    controls.update();
    renderer.render(threeScene, camera);
  }

  resize();
  updateInterface();
  animate();

  window.__puffinWorldViewer = {
    getState: () => ({ scene: activeScene, worldState: activeState, modelLoaded: activeModelScene === activeScene }),
    setScene,
    setState,
    resetView: fitModel
  };
}

document.getElementById("copy-bibtex")?.addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText(document.getElementById("bibtex").textContent.trim());
    event.currentTarget.textContent = "Copied";
    setTimeout(() => { event.currentTarget.textContent = "Copy BibTeX"; }, 1500);
  } catch (_) {
    event.currentTarget.textContent = "Select to copy";
  }
});
