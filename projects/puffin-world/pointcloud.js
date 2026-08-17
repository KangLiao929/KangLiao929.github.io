(() => {
  "use strict";

  const canvas = document.getElementById("point-cloud");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  const pointCount = document.getElementById("point-count");
  const stateLabel = document.getElementById("state-label");
  const resetButton = document.getElementById("reset-view");

  const camera = { yaw: -0.56, pitch: -0.24, zoom: 1, panX: 0, panY: 0 };
  const defaultCamera = { ...camera };
  const interaction = { active: false, button: 0, x: 0, y: 0 };
  let activeScene = "living";
  let activeState = "appearance";
  let points = [];
  let projected = [];
  let raf = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;

  function random(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hex = (value) => {
    const clean = value.replace("#", "");
    return [parseInt(clean.slice(0,2),16), parseInt(clean.slice(2,4),16), parseInt(clean.slice(4,6),16)];
  };

  function jitterPoint(arr, x, y, z, color, rand, amount = .018) {
    const rgb = Array.isArray(color) ? color : hex(color);
    arr.push({
      x: x + (rand() - .5) * amount,
      y: y + (rand() - .5) * amount,
      z: z + (rand() - .5) * amount,
      r: rgb[0], g: rgb[1], b: rgb[2]
    });
  }

  function plane(arr, cfg, rand) {
    const { axis, at, a0, a1, b0, b1, density = 1200, color = "#8ca0b9", gap } = cfg;
    for (let i = 0; i < density; i++) {
      const a = a0 + (a1 - a0) * rand();
      const b = b0 + (b1 - b0) * rand();
      if (gap && gap(a, b)) continue;
      if (axis === "y") jitterPoint(arr, a, at, b, color, rand);
      if (axis === "x") jitterPoint(arr, at, a, b, color, rand);
      if (axis === "z") jitterPoint(arr, a, b, at, color, rand);
    }
  }

  function box(arr, cfg, rand) {
    const { x, y, z, w, h, d, color, density = 700 } = cfg;
    const faceDensity = Math.max(20, Math.floor(density / 6));
    plane(arr, { axis: "y", at: y, a0: x-w/2, a1: x+w/2, b0: z-d/2, b1: z+d/2, density: faceDensity, color }, rand);
    plane(arr, { axis: "y", at: y+h, a0: x-w/2, a1: x+w/2, b0: z-d/2, b1: z+d/2, density: faceDensity, color }, rand);
    plane(arr, { axis: "x", at: x-w/2, a0: y, a1: y+h, b0: z-d/2, b1: z+d/2, density: faceDensity, color }, rand);
    plane(arr, { axis: "x", at: x+w/2, a0: y, a1: y+h, b0: z-d/2, b1: z+d/2, density: faceDensity, color }, rand);
    plane(arr, { axis: "z", at: z-d/2, a0: x-w/2, a1: x+w/2, b0: y, b1: y+h, density: faceDensity, color }, rand);
    plane(arr, { axis: "z", at: z+d/2, a0: x-w/2, a1: x+w/2, b0: y, b1: y+h, density: faceDensity, color }, rand);
  }

  function cylinder(arr, cfg, rand) {
    const { x, y, z, radius, height: h, color, density = 500 } = cfg;
    for (let i = 0; i < density; i++) {
      const angle = rand() * Math.PI * 2;
      const onCap = rand() < .28;
      const rad = onCap ? Math.sqrt(rand()) * radius : radius;
      const yy = onCap ? y + (rand() > .5 ? h : 0) : y + rand() * h;
      jitterPoint(arr, x + Math.cos(angle) * rad, yy, z + Math.sin(angle) * rad, color, rand);
    }
  }

  function livingRoom() {
    const arr = [], rand = random(19);
    plane(arr, { axis: "y", at: -1.15, a0: -3.6, a1: 3.6, b0: -3, b1: 3, density: 2800, color: "#c5a77d" }, rand);
    plane(arr, { axis: "z", at: -3, a0: -3.6, a1: 3.6, b0: -1.15, b1: 2.6, density: 1800, color: "#c8d0d3", gap: (x,y) => x > .6 && x < 2.4 && y > -.1 && y < 1.8 }, rand);
    plane(arr, { axis: "x", at: -3.6, a0: -1.15, a1: 2.6, b0: -3, b1: 3, density: 1100, color: "#b7c3ca" }, rand);
    box(arr, { x: -1.25, y: -1.08, z: -.65, w: 2.75, h: .68, d: .82, color: "#507f82", density: 1250 }, rand);
    box(arr, { x: -1.25, y: -.43, z: -.97, w: 2.7, h: .78, d: .22, color: "#426b72", density: 900 }, rand);
    box(arr, { x: -2.52, y: -.78, z: -.65, w: .3, h: .78, d: .9, color: "#426b72", density: 380 }, rand);
    box(arr, { x: .02, y: -.78, z: -.65, w: .3, h: .78, d: .9, color: "#426b72", density: 380 }, rand);
    cylinder(arr, { x: .85, y: -.84, z: .45, radius: .68, height: .12, color: "#b88456", density: 800 }, rand);
    cylinder(arr, { x: .85, y: -1.14, z: .45, radius: .11, height: .32, color: "#765238", density: 250 }, rand);
    box(arr, { x: 2.65, y: -.95, z: -2.76, w: .85, h: 1.38, d: .18, color: "#27394b", density: 520 }, rand);
    box(arr, { x: 2.65, y: -.95, z: -2.64, w: 1.05, h: .15, d: .55, color: "#8e694a", density: 280 }, rand);
    cylinder(arr, { x: -3.05, y: -.95, z: 1.55, radius: .2, height: 1.9, color: "#d2a75f", density: 350 }, rand);
    cylinder(arr, { x: -3.05, y: .84, z: 1.55, radius: .48, height: .35, color: "#e6c77e", density: 400 }, rand);
    return arr;
  }

  function staircase() {
    const arr = [], rand = random(71);
    plane(arr, { axis: "y", at: -1.25, a0: -3.5, a1: 3.5, b0: -3.2, b1: 3.2, density: 2100, color: "#b9a286" }, rand);
    plane(arr, { axis: "z", at: -3.2, a0: -3.5, a1: 3.5, b0: -1.25, b1: 3.5, density: 1700, color: "#d1d2ca" }, rand);
    plane(arr, { axis: "x", at: -3.5, a0: -1.25, a1: 3.5, b0: -3.2, b1: 3.2, density: 1000, color: "#c7cbc5" }, rand);
    for (let i = 0; i < 12; i++) {
      box(arr, { x: .65 + i * .18, y: -1.22 + i * .22, z: 2.5 - i * .42, w: 2.15, h: .24, d: .46, color: i % 2 ? "#7c6759" : "#8b7464", density: 310 }, rand);
    }
    for (let i = 0; i < 12; i++) {
      cylinder(arr, { x: -0.45, y: -1 + i * .22, z: 2.5 - i * .42, radius: .035, height: .82, color: "#e4e6dc", density: 55 }, rand);
      cylinder(arr, { x: 1.75, y: -1 + i * .22, z: 2.5 - i * .42, radius: .035, height: .82, color: "#e4e6dc", density: 55 }, rand);
    }
    box(arr, { x: .65, y: 1.95, z: -.1, w: 2.5, h: .12, d: 3, color: "#b59a79", density: 680 }, rand);
    box(arr, { x: -2.7, y: -.95, z: -2.96, w: 1.05, h: 1.65, d: .14, color: "#38586c", density: 550 }, rand);
    return arr;
  }

  function kitchen() {
    const arr = [], rand = random(137);
    plane(arr, { axis: "y", at: -1.2, a0: -3.5, a1: 3.5, b0: -3.1, b1: 3.1, density: 2400, color: "#d2c1a2" }, rand);
    plane(arr, { axis: "z", at: -3.1, a0: -3.5, a1: 3.5, b0: -1.2, b1: 2.7, density: 1700, color: "#d6d4ce" }, rand);
    plane(arr, { axis: "x", at: -3.5, a0: -1.2, a1: 2.7, b0: -3.1, b1: 3.1, density: 950, color: "#c9cbc6" }, rand);
    for (let i = 0; i < 6; i++) {
      box(arr, { x: -2.85 + i * 1.08, y: -1.12, z: -2.62, w: .98, h: 1.15, d: .78, color: i === 3 ? "#404e54" : "#b77b49", density: 470 }, rand);
      box(arr, { x: -2.85 + i * 1.08, y: .72, z: -2.78, w: .98, h: .85, d: .45, color: "#c08a59", density: 340 }, rand);
    }
    box(arr, { x: .45, y: -1.08, z: .35, w: 3.15, h: 1, d: 1.35, color: "#a66d43", density: 1200 }, rand);
    box(arr, { x: .45, y: -.07, z: .35, w: 3.35, h: .13, d: 1.55, color: "#d7d4c7", density: 650 }, rand);
    cylinder(arr, { x: -.3, y: .08, z: .25, radius: .32, height: .25, color: "#91a6a6", density: 220 }, rand);
    box(arr, { x: 2.75, y: -1.1, z: 1.82, w: .85, h: 2.65, d: .8, color: "#758388", density: 900 }, rand);
    return arr;
  }

  const sceneFactories = { living: livingRoom, stairs: staircase, kitchen };
  const sceneNames = { living: "living room", stairs: "staircase", kitchen: "kitchen" };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scheduleDraw();
  }

  function setScene(name) {
    activeScene = name;
    points = sceneFactories[name]();
    pointCount.textContent = `${points.length.toLocaleString()} pts`;
    canvas.setAttribute("aria-label", `Interactive 3D point cloud of a ${sceneNames[name]}`);
    document.querySelectorAll(".scene-button").forEach((button) => {
      const active = button.dataset.scene === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    resetView();
  }

  function setState(name) {
    activeState = name;
    stateLabel.textContent = name[0].toUpperCase() + name.slice(1);
    document.querySelectorAll(".state-button").forEach((button) => {
      const active = button.dataset.state === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    scheduleDraw();
  }

  function resetView() {
    Object.assign(camera, defaultCamera);
    if (activeScene === "stairs") { camera.yaw = -.72; camera.pitch = -.16; }
    if (activeScene === "kitchen") { camera.yaw = -.48; camera.pitch = -.28; }
    scheduleDraw();
  }

  function stateColor(point, depth) {
    if (activeState === "appearance") return [point.r, point.g, point.b];
    if (activeState === "geometry") {
      const t = Math.max(0, Math.min(1, (depth + 5) / 10));
      return [35 + 45 * t, 115 + 105 * (1 - Math.abs(t - .5) * 2), 245 - 95 * t];
    }
    const t = Math.max(0, Math.min(1, (point.y + 1.3) / 4.2));
    return [55 + 220 * t, 205 - 115 * t, 140 - 60 * t];
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "rgba(120, 144, 179, .075)";
    ctx.lineWidth = 1;
    const spacing = Math.max(42, Math.min(70, width / 12));
    for (let x = width / 2 % spacing; x < width; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = height / 2 % spacing; y < height; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    raf = 0;
    ctx.fillStyle = "#0e1523";
    ctx.fillRect(0, 0, width, height);
    drawGrid();

    const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
    const scale = Math.min(width, height) * .13 * camera.zoom;
    const centerX = width * .53 + camera.panX;
    const centerY = height * .54 + camera.panY;
    projected.length = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x1 = p.x * cy - p.z * sy;
      const z1 = p.x * sy + p.z * cy;
      const y1 = p.y * cp - z1 * sp;
      const z2 = p.y * sp + z1 * cp;
      const perspective = 1 / (1 + Math.max(-.72, z2 * .055));
      projected.push({
        x: centerX + x1 * scale * perspective,
        y: centerY - y1 * scale * perspective,
        z: z2,
        s: Math.max(.58, Math.min(1.7, scale / 95 * perspective)),
        p
      });
    }
    projected.sort((a, b) => b.z - a.z);

    for (let i = 0; i < projected.length; i++) {
      const item = projected[i];
      if (item.x < -3 || item.x > width + 3 || item.y < -3 || item.y > height + 3) continue;
      const color = stateColor(item.p, item.z);
      const alpha = Math.max(.28, Math.min(.9, .84 - item.z * .025));
      ctx.fillStyle = `rgba(${color[0] | 0},${color[1] | 0},${color[2] | 0},${alpha})`;
      ctx.fillRect(item.x, item.y, item.s, item.s);
    }

    if (activeState === "physics") drawGravityField();
  }

  function drawGravityField() {
    ctx.save();
    const x = width - 78, top = 90, bottom = Math.min(height - 105, top + 125);
    ctx.strokeStyle = "rgba(84, 211, 145, .7)";
    ctx.fillStyle = "rgba(84, 211, 145, .84)";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, bottom - 8); ctx.lineTo(x, bottom); ctx.lineTo(x + 5, bottom - 8); ctx.stroke();
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("GRAVITY", x - 21, top - 9);
    ctx.restore();
  }

  function scheduleDraw() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  canvas.addEventListener("pointerdown", (event) => {
    interaction.active = true;
    interaction.button = event.button;
    interaction.x = event.clientX;
    interaction.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!interaction.active) return;
    const dx = event.clientX - interaction.x;
    const dy = event.clientY - interaction.y;
    interaction.x = event.clientX;
    interaction.y = event.clientY;
    if (interaction.button === 2 || event.shiftKey) {
      camera.panX += dx;
      camera.panY += dy;
    } else {
      camera.yaw += dx * .008;
      camera.pitch = Math.max(-1.15, Math.min(1.15, camera.pitch + dy * .008));
    }
    scheduleDraw();
  });
  const endPointer = (event) => {
    interaction.active = false;
    if (event.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    camera.zoom = Math.max(.48, Math.min(2.7, camera.zoom * Math.exp(-event.deltaY * .0011)));
    scheduleDraw();
  }, { passive: false });
  canvas.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 24 : 8;
    if (event.key === "ArrowLeft") camera.yaw -= .08;
    else if (event.key === "ArrowRight") camera.yaw += .08;
    else if (event.key === "ArrowUp") camera.pitch -= .08;
    else if (event.key === "ArrowDown") camera.pitch += .08;
    else if (event.key === "+" || event.key === "=") camera.zoom = Math.min(2.7, camera.zoom * 1.08);
    else if (event.key === "-") camera.zoom = Math.max(.48, camera.zoom / 1.08);
    else if (event.key.toLowerCase() === "r") resetView();
    else return;
    event.preventDefault();
    scheduleDraw();
  });

  document.querySelectorAll(".scene-button").forEach((button) => button.addEventListener("click", () => setScene(button.dataset.scene)));
  document.querySelectorAll(".state-button").forEach((button) => button.addEventListener("click", () => setState(button.dataset.state)));
  resetButton.addEventListener("click", resetView);
  document.getElementById("copy-bibtex")?.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(document.getElementById("bibtex").textContent.trim());
      event.currentTarget.textContent = "Copied";
      setTimeout(() => { event.currentTarget.textContent = "Copy BibTeX"; }, 1500);
    } catch (_) {
      event.currentTarget.textContent = "Select to copy";
    }
  });

  new ResizeObserver(resize).observe(canvas);
  setScene(activeScene);

  window.__puffinWorldViewer = {
    getState: () => ({ scene: activeScene, worldState: activeState, camera: { ...camera }, points: points.length }),
    setScene,
    setState,
    resetView
  };
})();
