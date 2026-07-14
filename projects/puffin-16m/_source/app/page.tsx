"use client";

import { useEffect, useState } from "react";
import LazyTrajectoryCamera3D from "./LazyTrajectoryCamera3D";
import ViewportVideo from "./ViewportVideo";
import { assetPath } from "./assetPath";

const views = [
  {
    image: assetPath("/images/hero-yaw-left.webp"),
    label: "YAW LEFT",
    index: "01",
    yaw: "−30°",
    roll: "+00.0°",
    pitch: "+10.0°",
    fov: "58°",
  },
  {
    image: assetPath("/images/hero-yaw-center.webp"),
    label: "YAW CENTER",
    index: "02",
    yaw: "+00°",
    roll: "+00.0°",
    pitch: "+10.0°",
    fov: "58°",
  },
  {
    image: assetPath("/images/hero-yaw-right.webp"),
    label: "YAW RIGHT",
    index: "03",
    yaw: "+30°",
    roll: "+00.0°",
    pitch: "+10.0°",
    fov: "58°",
  },
];

const heights = [
  "Underwater",
  "Low-position",
  "Eye-level",
  "High-position",
  "Aerial",
];

const capabilities = [
  {
    id: "understanding",
    number: "01",
    title: "Camera Understanding",
    short: "Read the camera behind an image",
    description:
      "Estimate roll, pitch, vertical field-of-view, and camera height while connecting geometric cues to photographic language.",
    image: assetPath("/images/gallery-understand.png"),
    prompt: "Describe the scene and infer the camera state.",
    output: "Low-position view · pitch +18.2° · vFoV 82°",
    color: "blue",
  },
  {
    id: "generation",
    number: "02",
    title: "Controllable Generation",
    short: "Compose with explicit camera control",
    description:
      "Generate scenes from text while steering viewpoint, orientation, and field-of-view with camera prompts.",
    image: assetPath("/images/gallery-generate.png"),
    prompt: "A coastal road at golden hour · roll −12° · vFoV 74°",
    output: "Text + camera → image",
    color: "coral",
  },
  {
    id: "world",
    number: "03",
    title: "World Exploration",
    short: "Move beyond the initial view",
    description:
      "Generate spatially consistent target views from an initial image and a requested camera motion, enabling cross-view exploration.",
    image: assetPath("/images/gallery-world.png"),
    prompt: "Initial view + orbit right 24° + pitch −6°",
    output: "Image + camera → target view",
    color: "blue",
  },
];

const scaleDatasets = [
  {
    name: "Puffin-16M",
    scope: "16.47M samples",
    image: assetPath("/data/scale-extension/datasets/puffin-16m.webp"),
    href: "https://huggingface.co/datasets/KangLiao/Puffin-16M",
  },
  {
    name: "CC12M-Camera",
    scope: "10.97M images",
    image: assetPath("/data/scale-extension/datasets/cc12m-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/CC12M-Camera",
  },
  {
    name: "Megalith-10M-Camera",
    scope: "9.58M photos",
    image: assetPath("/data/scale-extension/datasets/megalith-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/Megalith-10M-Camera",
  },
  {
    name: "GPIC-Camera",
    scope: "4.9M profiled images",
    image: assetPath("/data/scale-extension/datasets/gpic-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/GPIC-Camera",
  },
  {
    name: "ImageNet-1K-Camera",
    scope: "1.33M images",
    image: assetPath("/data/scale-extension/datasets/imagenet-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/ImageNet-1K-Camera",
  },
  {
    name: "COCO-Camera",
    scope: "122K images",
    image: assetPath("/data/scale-extension/datasets/coco-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/COCO-Camera",
  },
  {
    name: "ScanNet-Absolute-Camera",
    scope: "2.32M frames",
    image: assetPath("/data/scale-extension/datasets/scannet-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/ScanNet-Absolute-Camera",
  },
  {
    name: "DL3DV-Absolute-Camera",
    scope: "2.16M frames",
    image: assetPath("/data/scale-extension/datasets/dl3dv-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/DL3DV-Absolute-Camera",
  },
  {
    name: "RealEstate10K-Absolute-Camera",
    scope: "595K frames",
    image: assetPath("/data/scale-extension/datasets/realestate10k-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/RealEstate10K-Absolute-Camera",
  },
  {
    name: "TartanAir-Absolute-Camera",
    scope: "307K frames",
    image: assetPath("/data/scale-extension/datasets/tartanair-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/TartanAir-Absolute-Camera",
  },
  {
    name: "HyperSim-Absolute-Camera",
    scope: "73.6K frames",
    image: assetPath("/data/scale-extension/datasets/hypersim-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/HyperSim-Absolute-Camera",
  },
  {
    name: "MVS-Synth-Absolute-Camera",
    scope: "12K frames",
    image: assetPath("/data/scale-extension/datasets/mvs-synth-camera.webp"),
    href: "https://huggingface.co/datasets/KangLiao/MVS-Synth-Absolute-Camera",
  },
] as const;

const radarBenchmarks = [
  {
    name: "MegaDepth",
    series: [
      { name: "Puffin-World", values: [1, 1, 1] },
      { name: "Puffin", values: [0.81, 0.75, 0.72] },
      { name: "GeoCalib", values: [0.56, 0.29, 0.38] },
      { name: "UVP", values: [0.27, 0.13, 0.16] },
    ],
  },
  {
    name: "TartanAir",
    series: [
      { name: "Puffin-World", values: [1, 1, 1] },
      { name: "Puffin", values: [0.78, 0.58, 0.58] },
      { name: "GeoCalib", values: [0.56, 0.36, 0.55] },
      { name: "UVP", values: [0.27, 0.12, 0.17] },
    ],
  },
  {
    name: "LaMAR",
    series: [
      { name: "Puffin-World", values: [1, 1, 1] },
      { name: "Puffin", values: [0.75, 0.72, 0.51] },
      { name: "GeoCalib", values: [0.98, 0.74, 0.78] },
      { name: "UVP", values: [0.38, 0.17, 0.33] },
    ],
  },
  {
    name: "Stanford2D3D",
    series: [
      { name: "Puffin-World", values: [1, 1, 1] },
      { name: "GeoCalib", values: [0.72, 0.43, 0.27] },
      { name: "UVP", values: [0.39, 0.16, 0.28] },
    ],
  },
] as const;

const radarColors: Record<string, string> = {
  "Puffin-World": "#3f8edb",
  Puffin: "#3b9f2f",
  GeoCalib: "#ef6a24",
  UVP: "#d35fc8",
};

function radarPoints(values: readonly number[]) {
  const centerX = 150;
  const centerY = 142;
  const radius = 98;
  return values
    .map((value, index) => {
      const angle = (-90 + index * 120) * (Math.PI / 180);
      return `${centerX + Math.cos(angle) * radius * value},${centerY + Math.sin(angle) * radius * value}`;
    })
    .join(" ");
}

function BenchmarkRadar() {
  return (
    <div className="benchmark-radar" role="img" aria-label="Normalized camera-parameter estimation comparison on four public benchmarks">
      <div className="benchmark-radar-grid">
        {radarBenchmarks.map((benchmark) => (
          <div className="radar-cell" key={benchmark.name}>
            <strong>{benchmark.name}</strong>
            <svg viewBox="0 0 300 275" aria-hidden="true">
              {[24.5, 49, 73.5, 98].map((radius) => (
                <circle key={radius} cx="150" cy="142" r={radius} className="radar-ring" />
              ))}
              <line x1="150" y1="142" x2="150" y2="44" className="radar-axis" />
              <line x1="150" y1="142" x2="235" y2="191" className="radar-axis" />
              <line x1="150" y1="142" x2="65" y2="191" className="radar-axis" />
              {benchmark.series.map((series) => (
                <polygon
                  key={series.name}
                  points={radarPoints(series.values)}
                  fill={radarColors[series.name]}
                  stroke={radarColors[series.name]}
                  className={`radar-polygon ${series.name === "Puffin-World" ? "is-world" : ""}`}
                />
              ))}
              <text x="150" y="24" textAnchor="middle">Roll</text>
              <text x="251" y="210" textAnchor="middle">Pitch</text>
              <text x="49" y="210" textAnchor="middle">FoV</text>
            </svg>
          </div>
        ))}
      </div>
      <div className="radar-legend" aria-hidden="true">
        {Object.entries(radarColors).map(([name, color]) => (
          <span key={name}><i style={{ borderColor: color, background: `${color}22` }} />{name}</span>
        ))}
      </div>
    </div>
  );
}

type CamSample = {
  id: number;
  image: string;
  source_hash: string;
  camera_height: string;
  caption: string;
};

type TrajectorySample = {
  id: string;
  type: "roll" | "pitch" | "yaw";
  order: number;
  pattern: string;
  source_shard: string;
  source_scene: string;
  vfov_deg: number;
  frame_count: number;
  sampled_frames: number;
  start_deg: number;
  end_deg: number;
  video: string;
};

const trajectoryTabs = [
  { id: "pitch", label: "Pitch", description: "Camera tilts upward or downward" },
  { id: "yaw", label: "Yaw", description: "Camera pans left or right" },
  { id: "roll", label: "Roll", description: "Rotation around the optical axis" },
] as const;

const patternLabels: Record<string, string> = {
  mono_pos: "Positive sweep",
  mono_neg: "Negative sweep",
  bi_pos_neg: "+ → − sweep",
  bi_neg_pos: "− → + sweep",
  full_circle: "Full 360° orbit",
};

const motionAxisLabels: Record<TrajectorySample["type"], string> = {
  roll: "Z AXIS",
  pitch: "X AXIS",
  yaw: "Y AXIS",
};

const motionAxisShort: Record<TrajectorySample["type"], string> = {
  roll: "Z",
  pitch: "X",
  yaw: "Y",
};

const mosaicRatios = [
  { className: "ratio-1-1", label: "1:1" },
  { className: "ratio-3-2", label: "3:2" },
  { className: "ratio-2-3", label: "2:3" },
  { className: "ratio-16-9", label: "16:9" },
  { className: "ratio-3-4", label: "3:4" },
  { className: "ratio-4-3", label: "4:3" },
  { className: "ratio-9-16", label: "9:16" },
] as const;

const citation = `@article{liao2025puffin,
  title={Thinking with Camera: A Unified Multimodal Model for Camera-Centric Understanding and Generation},
  author={Liao, Kang and Wu, Size and Wu, Zhonghua and Jin, Linyi and Wang, Chao and Wang, Yikai and Wang, Fei and Li, Wei and Loy, Chen Change},
  journal={arXiv preprint arXiv:2510.08673},
  year={2025}
}`;

export default function Home() {
  const [activeView, setActiveView] = useState(1);
  const [activeCapability, setActiveCapability] = useState(0);
  const [camSamples, setCamSamples] = useState<CamSample[]>([]);
  const [activeCamSample, setActiveCamSample] = useState(0);
  const [trajectorySamples, setTrajectorySamples] = useState<TrajectorySample[]>([]);
  const [trajectoryType, setTrajectoryType] = useState<"roll" | "pitch" | "yaw">("pitch");
  const [copied, setCopied] = useState<"command" | "citation" | null>(null);
  const view = views[activeView];
  const capability = capabilities[activeCapability];
  const currentCamSample = camSamples[activeCamSample];
  const visibleTrajectories = trajectorySamples
    .filter((item) => item.type === trajectoryType)
    .sort((a, b) => {
      if (trajectoryType === "yaw") {
        const fullCircleOrder = Number(b.pattern === "full_circle") - Number(a.pattern === "full_circle");
        if (fullCircleOrder !== 0) return fullCircleOrder;
      }
      return a.order - b.order;
    });
  const activeTrajectoryTab = trajectoryTabs.find((item) => item.id === trajectoryType)!;

  useEffect(() => {
    Promise.all([
      fetch(assetPath("/data/cam/manifest.json")).then((response) => response.json()),
      fetch(assetPath("/data/traj/manifest.json")).then((response) => response.json()),
    ]).then(([cam, trajectories]) => {
      setCamSamples(cam.map((sample: CamSample) => ({ ...sample, image: assetPath(sample.image) })));
      setTrajectorySamples(trajectories.map((sample: TrajectorySample) => ({ ...sample, video: assetPath(sample.video) })));
    });
  }, []);

  function moveCamSample(direction: number) {
    if (!camSamples.length) return;
    setActiveCamSample((current) => (current + direction + camSamples.length) % camSamples.length);
  }

  function selectCamSample(index: number, reveal = false) {
    setActiveCamSample(index);
    if (reveal) {
      window.setTimeout(() => {
        document.getElementById("cam-preview")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  }

  function renderMosaicLane(laneIndex: number) {
    const laneSamples = camSamples
      .map((sample, index) => ({ sample, index }))
      .filter(({ index }) => index % 2 === laneIndex);

    return [0, 1].map((copy) => (
      <div className="marquee-sequence" aria-hidden={copy === 1} key={copy}>
        {laneSamples.map(({ sample, index }, laneItemIndex) => {
          const ratio = mosaicRatios[(laneItemIndex + laneIndex * 3) % mosaicRatios.length];
          return (
            <button
              key={`${copy}-${sample.source_hash}`}
              className={`mosaic-tile ${ratio.className} ${activeCamSample === index ? "is-active" : ""}`}
              onClick={() => selectCamSample(index, true)}
              tabIndex={copy === 1 ? -1 : 0}
              aria-label={`Open sample ${String(index + 1).padStart(2, "0")} caption, ${ratio.label} frame`}
              aria-pressed={activeCamSample === index}
            >
              <img src={sample.image} alt={`Puffin-Cam-15M sample ${String(index + 1).padStart(2, "0")}`} loading="lazy" decoding="async" />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{ratio.label}</small>
            </button>
          );
        })}
      </div>
    ));
  }

  function copyText(value: string, key: "command" | "citation") {
    const fallbackCopy = () => {
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    };

    setCopied(key);
    window.setTimeout(() => setCopied(null), 1800);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Puffin-16M home">
          <img src={assetPath("/images/puffin-logo.png")} alt="" aria-hidden="true" />
          <span className="brand-title">Puffin<em>−16M</em></span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#dataset">Dataset</a>
          <a href="#gallery">Gallery</a>
          <a href="#model">Model</a>
          <a href="#scale-extension">Scale</a>
          <a href="#resources">Resources</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> Camera-centric multimodal intelligence</p>
          <h1>
            See the world.
            <br />
            From any <em>camera.</em>
          </h1>
          <p className="hero-intro">
            16.5 million samples with precise camera annotations—built for spatial
            understanding, controllable generation, and world exploration.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#dataset">
              Explore the dataset <span aria-hidden="true">↓</span>
            </a>
            <a
              className="button button-secondary"
              href="https://huggingface.co/datasets/KangLiao/Puffin-16M"
              target="_blank"
              rel="noreferrer"
            >
              Get the data <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <div className="orbit-lab">
          <div className="view-counter">
            <span>PURE YAW</span> <b>{view.index}</b> / 03
          </div>
          <a
            className="hero-source-credit"
            href="https://polyhaven.com/a/quattro_canti"
            target="_blank"
            rel="noreferrer"
          >
            CC0 scene · Poly Haven ↗
          </a>
          <div className="frame-stage" data-active={activeView}>
            <div className="yaw-arc" />
            {views.map((item, index) => (
              <button
                className={`view-frame frame-${index} ${activeView === index ? "is-active" : ""}`}
                key={item.label}
                onClick={() => setActiveView(index)}
                aria-label={`Select fixed-center ${item.label.toLowerCase()} camera view`}
                aria-pressed={activeView === index}
              >
                <img src={item.image} alt={`Quattro Canti, fixed-center ${item.label.toLowerCase()} camera view`} />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="camera-reticle"><i /><i /></div>
            <div className="yaw-arrow" aria-hidden="true">▲</div>
          </div>
          <div className="view-controls" aria-label="Camera viewpoints">
            {views.map((item, index) => (
              <button
                key={item.label}
                className={activeView === index ? "is-active" : ""}
                onClick={() => setActiveView(index)}
                aria-label={`Switch to ${item.label.toLowerCase()} view`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <div className="camera-readout">
            <span>YAW <b>{view.yaw}</b></span>
            <span>ROLL <b>{view.roll}</b></span>
            <span>PITCH <b>{view.pitch}</b></span>
            <span>V.FOV <b>{view.fov}</b></span>
          </div>
          <p className="yaw-label">FIXED OPTICAL CENTER · YAW <b>{view.yaw}</b></p>
        </div>

        <div className="metrics-rail" aria-label="Dataset highlights">
          <div><span className="metric-icon coral">▧</span><p><b>16.5M</b><small>total samples</small></p></div>
          <div><span className="metric-icon blue">◎</span><p><b>Precise</b><small>camera parameters</small></p></div>
          <div><span className="metric-icon coral">◇</span><p><b>Understanding</b><small>+ generation</small></p></div>
          <div><span className="metric-icon blue">◉</span><p><b>90 frames</b><small>per trajectory</small></p></div>
        </div>
      </section>

      <section className="dataset-section" id="dataset">
        <div className="section-kicker">
          <span>01</span>
          <p>THE DATASET</p>
        </div>
        <div className="section-heading">
          <h2>One dataset. Two complementary views of the world.</h2>
          <p>
            Puffin-16M pairs large-scale single-view camera supervision with dense
            motion trajectories, giving models both the vocabulary of a camera and
            the continuity of moving through a scene.
          </p>
        </div>

        <div className="dataset-split">
          <article className="dataset-block cam-block">
            <div className="block-index">A / SINGLE VIEW</div>
            <strong>15,338,221</strong>
            <h3>Puffin-Cam-15M</h3>
            <p>Image–caption–camera triplets rendered from diverse indoor and outdoor panoramas.</p>
            <div className="parameter-ranges">
              <div><span>ROLL</span><b>−45°</b><i /><b>+45°</b></div>
              <div><span>PITCH</span><b>−45°</b><i /><b>+45°</b></div>
              <div><span>V.FOV</span><b>20°</b><i className="wide" /><b>105°</b></div>
            </div>
          </article>

          <article className="dataset-block traj-block">
            <div className="block-index">B / TRAJECTORY</div>
            <strong>1,136,696</strong>
            <h3>Puffin-Traj-1M</h3>
            <p>Continuous 90-frame sequences with dense per-frame intrinsics, Euler angles, and camera pose.</p>
            <div className="trajectory-visual" aria-hidden="true">
              <div className="trajectory-path" />
              {[0, 1, 2, 3, 4].map((item) => <i key={item} />)}
              <span>90 × 1°</span>
            </div>
          </article>
        </div>

        <div className="height-row">
          <div>
            <p>CAMERA HEIGHT TAXONOMY</p>
            <span>Five viewpoints, from below the surface to aerial scale.</span>
          </div>
          <ol>
            {heights.map((height, index) => (
              <li key={height}>
                <span>{String(index + 1).padStart(2, "0")}</span>{height}
              </li>
            ))}
          </ol>
        </div>

        <div className="source-note">
          <span>11.6 TB compressed download · 13 TB repository size</span>
          <a href="https://huggingface.co/datasets/KangLiao/Puffin-16M" target="_blank" rel="noreferrer">
            Inspect the dataset card <b>↗</b>
          </a>
        </div>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="section-kicker">
          <span>02</span>
          <p>DATASET GALLERY</p>
        </div>
        <div className="gallery-title-row">
          <h2>Look through the dataset.</h2>
          <p>
            Real samples selected directly from Puffin-16M on Hugging Face—paired
            images and captions above, camera trajectories below.
          </p>
        </div>

        <div className="gallery-dataset-label">
          <div>
            <span>A / IMAGE–CAPTION PAIRS</span>
            <h3>Puffin-Cam-15M</h3>
          </div>
          <p>36 curated samples · 4× offline-enhanced previews · seven frame ratios</p>
        </div>

        <div className="cam-mosaic" aria-label="Scrolling Puffin-Cam-15M sample mosaic">
          {camSamples.length ? [0, 1].map((laneIndex) => (
            <div className={`cam-marquee-row row-${laneIndex + 1}`} key={laneIndex}>
              <div className="cam-marquee-track">
                {renderMosaicLane(laneIndex)}
              </div>
            </div>
          )) : (
            <div className="mosaic-loading-band" aria-label="Loading image samples" />
          )}
          <div className="mosaic-ratio-key" aria-hidden="true">
            <span>1:1</span><span>2:3</span><span>3:2</span><span>3:4</span>
            <span>4:3</span><span>16:9</span><span>9:16</span>
          </div>
        </div>

        <div className="cam-preview-window" id="cam-preview">
          <div className="cam-preview-image">
            {currentCamSample ? (
              <img
                src={currentCamSample.image.replace("/samples/", "/superres/").replace(".jpg", ".webp")}
                alt={`Selected Puffin-Cam sample ${activeCamSample + 1}`}
                decoding="async"
              />
            ) : <div className="preview-loading" />}
            <div className="preview-counter">
              <span>PUFFIN-CAM-15M</span>
              <b>{String(activeCamSample + 1).padStart(2, "0")} / {String(camSamples.length || 36).padStart(2, "0")}</b>
            </div>
            <button className="preview-arrow arrow-left" onClick={() => moveCamSample(-1)} aria-label="Previous image">←</button>
            <button className="preview-arrow arrow-right" onClick={() => moveCamSample(1)} aria-label="Next image">→</button>
          </div>
          <div className="cam-preview-sidebar">
            <div className="sidebar-sample-heading">
              <span>36 SAMPLES</span>
              <p>Select an image to reveal its paired caption</p>
            </div>
            <div className="cam-thumbnail-grid" aria-label="Choose among 36 image samples">
              {camSamples.map((sample, index) => (
                <button
                  key={sample.source_hash}
                  className={activeCamSample === index ? "is-active" : ""}
                  onClick={() => selectCamSample(index)}
                  aria-label={`Select sample ${String(index + 1).padStart(2, "0")}`}
                  aria-pressed={activeCamSample === index}
                >
                  <img src={sample.image} alt="" loading="lazy" decoding="async" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
            <aside className="caption-panel" aria-live="polite">
              <div className="caption-heading">
                <span>PAIRED CAPTION</span>
                <b>{currentCamSample?.camera_height || "Loading"}</b>
              </div>
              <p>{currentCamSample?.caption || "Loading the selected image and its camera-aware caption…"}</p>
              <div className="caption-source">
                <span>HASH</span>
                <code>{currentCamSample?.source_hash || "—"}</code>
              </div>
            </aside>
          </div>
        </div>

        <div className="gallery-dataset-label trajectory-label">
          <div>
            <span>B / 90-FRAME CAMERA TRAJECTORIES</span>
            <h3>Puffin-Traj-1M</h3>
          </div>
          <p>24 sequences · 4× offline-enhanced previews · 8 per motion axis</p>
        </div>

        <div className="trajectory-gallery" id="trajectory-gallery">
          <div className="trajectory-tabs" role="tablist" aria-label="Trajectory motion type">
            {trajectoryTabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={trajectoryType === tab.id}
                className={`trajectory-tab tab-${tab.id} ${trajectoryType === tab.id ? "is-active" : ""}`}
                onClick={() => setTrajectoryType(tab.id)}
              >
                <span><i aria-hidden="true">{motionAxisShort[tab.id]}</i>{tab.label}</span>
                <small>{tab.description}</small>
                <b>{trajectorySamples.filter((sample) => sample.type === tab.id).length || 8} SEQS</b>
              </button>
            ))}
          </div>

          <div className="trajectory-axis-intro">
            <div className={`axis-symbol axis-${trajectoryType}`} aria-hidden="true">
              <div className="camera-coordinates compact-coordinates">
                <i className="coordinate-x"><span>X</span></i>
                <i className="coordinate-y"><span>Y</span></i>
                <i className="coordinate-z"><span>Z</span></i>
              </div>
              <i className="axis-ring" />
              <i className="axis-camera"><span /></i>
              <i className="axis-arrow">↻</i>
            </div>
            <div>
              <span>{trajectoryType.toUpperCase()} · {motionAxisLabels[trajectoryType]}</span>
              <h4>{activeTrajectoryTab.description}</h4>
              <div className={`axis-mapping active-${trajectoryType}`} aria-label="Puffin camera-axis mapping">
                <span className="mapping-x"><b>X</b> Pitch</span>
                <span className="mapping-y"><b>Y</b> Yaw</span>
                <span className="mapping-z"><b>Z</b> Roll</span>
              </div>
            </div>
            <p>
              Camera frame: X points right, Y points down, and Z points forward. The optical center remains fixed throughout every rotation.
              <a href="https://polyhaven.com/a/Camera_01" target="_blank" rel="noreferrer">3D camera: Camera 01 · Poly Haven CC0 ↗</a>
            </p>
          </div>

          <div className="trajectory-grid" role="tabpanel">
            <canvas className="trajectory-camera-layer" aria-hidden="true" />
            {visibleTrajectories.map((sample) => (
              <article className="trajectory-card" key={sample.id}>
                <div className="trajectory-media">
                  <ViewportVideo src={sample.video} label={`${sample.type} trajectory ${sample.order}`} />
                  <span>{sample.frame_count} FRAMES · V.FOV {sample.vfov_deg}°</span>
                </div>
                <div className={`motion-diagram motion-${sample.type} pattern-${sample.pattern}`}>
                  <div className="motion-hud" aria-hidden="true">
                    <i className="hud-ring ring-outer" />
                    <i className="hud-ring ring-inner" />
                    <i className="hud-sweep" />
                  </div>
                  <div className="camera-coordinates motion-coordinates" aria-hidden="true">
                    <i className="coordinate-x"><span>X</span></i>
                    <i className="coordinate-y"><span>Y</span></i>
                    <i className="coordinate-z"><span>Z</span></i>
                  </div>
                  <div className="motion-trail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                  <div className="motion-orbit"><i /><i /><i /><i /></div>
                  <div className="rotation-pivot" aria-hidden="true"><i /></div>
                  <div className="motion-camera-webgl">
                    <LazyTrajectoryCamera3D sample={sample} />
                  </div>
                  <span className="motion-axis-name">{sample.type.toUpperCase()} · {motionAxisLabels[sample.type]}</span>
                  <span className="motion-status"><i /> FIXED OPTICAL CENTER</span>
                  <b>{patternLabels[sample.pattern] || sample.pattern}</b>
                  <small>{sample.start_deg > 0 ? "+" : ""}{sample.start_deg}° → {sample.end_deg > 0 ? "+" : ""}{sample.end_deg}°</small>
                </div>
                <footer className="trajectory-meta">
                  <span>{sample.type.toUpperCase()} / {String(sample.order).padStart(2, "0")}</span>
                  <code>SHARD {sample.source_shard}</code>
                </footer>
              </article>
            ))}
          </div>
        </div>

        <div className="gallery-provenance">
          <span>PROVENANCE</span>
          <p>Source images, captions, and trajectory frames were sampled directly from the released Hugging Face shards; large image previews use offline 4× super-resolution enhancement.</p>
          <a href="https://huggingface.co/datasets/KangLiao/Puffin-16M" target="_blank" rel="noreferrer">Open source dataset ↗</a>
        </div>
      </section>

      <section className="model-section" id="model">
        <div className="section-kicker">
          <span>03</span>
          <p>MODEL CAPABILITIES</p>
        </div>
        <div className="section-heading model-heading">
          <h2>Think with the camera, not just the pixels.</h2>
          <p>
            Puffin brings understanding and generation into one camera-centric
            multimodal framework, then extends that foundation to cross-view tasks.
          </p>
        </div>

        <div className="capability-lab">
          <div className="capability-list" role="tablist" aria-label="Model capabilities">
            {capabilities.map((item, index) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={activeCapability === index}
                aria-controls="capability-panel"
                className={activeCapability === index ? "is-active" : ""}
                onClick={() => setActiveCapability(index)}
              >
                <span>{item.number}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.short}</small>
                </div>
                <b aria-hidden="true">↗</b>
              </button>
            ))}
          </div>

          <div className="capability-panel" id="capability-panel" role="tabpanel">
            <div className="lab-toolbar">
              <span>PUFFIN LAB / {capability.id.toUpperCase()}</span>
              <div><i className="status-dot" /> LIVE PREVIEW</div>
            </div>
            <div className="lab-visual">
              <img src={capability.image} alt={`${capability.title} preview`} />
            </div>
            <div className="lab-output">
              <div>
                <span>INPUT</span>
                <p>{capability.prompt}</p>
              </div>
              <div>
                <span>OUTPUT</span>
                <p>{capability.output}</p>
              </div>
            </div>
          </div>

          <aside className="capability-copy">
            <span>{capability.number} / 03</span>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
            <a href="https://kangliao929.github.io/projects/puffin/" target="_blank" rel="noreferrer">
              Explore the project <b>↗</b>
            </a>
          </aside>
        </div>

        <div className="model-variants" aria-label="Puffin model variants">
          <div>
            <span>01</span><strong>Puffin-Base</strong><small>Unified foundation</small>
          </div>
          <div>
            <span>02</span><strong>Puffin-Thinking</strong><small>Camera reasoning</small>
          </div>
          <div>
            <span>03</span><strong>Puffin-Instruct</strong><small>Cross-view interactions</small>
          </div>
        </div>
      </section>

      <section className="scale-section" id="scale-extension">
        <div className="section-kicker scale-kicker">
          <span>03B</span>
          <p>SCALE EXTENSION</p>
        </div>

        <div className="scale-intro">
          <div>
            <p className="scale-overline">PUFFIN-16M → PUFFIN-WORLD</p>
            <h2>Scale Extension</h2>
          </div>
          <div className="scale-intro-copy">
            <strong>Top-1 physics perception, unlocked by scale.</strong>
            <p>
              Training Puffin-World on Puffin-16M turns camera understanding into a
              reliable physical perception capability—estimating roll, pitch, and
              vertical field-of-view directly from an image.
            </p>
          </div>
        </div>

        <div className="scale-ranking">
          <div className="ranking-mark">
            <span>TOP</span>
            <strong>01</strong>
            <small>PHYSICS PERCEPTION</small>
          </div>
          <div>
            <span>FOUR AUTHORITATIVE PUBLIC BENCHMARKS</span>
            <h3>Consistently stronger camera-parameter estimation.</h3>
            <p>
              Across Stanford2D3D, MegaDepth, TartanAir, and LaMAR, our Puffin-World
              outperforms previous methods on all median error metrics and most AUC metrics.
            </p>
          </div>
        </div>

        <div className="benchmark-showcase">
          <figure className="benchmark-card benchmark-radar-card">
            <div className="benchmark-card-heading">
              <span>01 / NORMALIZED OVERVIEW</span>
              <b>HIGHER IS BETTER</b>
            </div>
            <BenchmarkRadar />
            <figcaption>Roll · Pitch · FoV accuracy across four public benchmarks.</figcaption>
          </figure>
          <figure className="benchmark-card benchmark-table-card">
            <div className="benchmark-card-heading">
              <span>02 / FULL RESULTS</span>
              <b>MEDIAN ERROR ↓ · AUC ↑</b>
            </div>
            <div className="benchmark-table-scroll">
              <img
                src={assetPath("/images/scale-extension/benchmark-table.webp")}
                alt="Puffin-World camera parameter estimation results on Stanford2D3D, MegaDepth, TartanAir, and LaMAR"
                loading="lazy"
              />
            </div>
            <figcaption>Best and second-best results are highlighted in green.</figcaption>
          </figure>
        </div>

        <div className="annotation-bridge">
          <div>
            <span>01</span>
            <strong>Puffin-16M</strong>
            <small>Scale training data</small>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>02</span>
            <strong>Puffin-World</strong>
            <small>Top-ranked camera perception</small>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>03</span>
            <strong>Camera Labelling</strong>
            <small>Roll · pitch · vertical FoV</small>
          </div>
          <i aria-hidden="true">→</i>
          <div>
            <span>04</span>
            <strong>12 Public Releases</strong>
            <small>Ready for downstream research</small>
          </div>
        </div>

        <div className="scale-gallery-heading">
          <div>
            <span>CAMERA-LABELLED DATASETS</span>
            <h3>One model, twelve datasets.</h3>
          </div>
          <p>
            We use Puffin-World to label widely used image and video corpora with
            physically grounded camera parameters. Select any preview to open the
            corresponding Hugging Face release.
          </p>
        </div>

        <div className="annotation-taxonomy" aria-label="Camera annotation naming convention">
          <div>
            <span>CAMERA</span>
            <p>
              For single-image datasets. Each independent image is captioned with
              its visible camera state: roll, pitch, and vertical FoV.
            </p>
          </div>
          <div>
            <span>ABSOLUTE-CAMERA</span>
            <p>
              For video or multi-timestep datasets. Each frame is captioned with
              absolute camera parameters in a shared world frame, preserving its
              real-world pose meaning across time.
            </p>
          </div>
        </div>

        <div className="scale-dataset-grid" aria-label="Twelve camera-labelled datasets">
          {scaleDatasets.map((dataset, index) => (
            <a key={dataset.name} href={dataset.href} target="_blank" rel="noreferrer">
              <div className="scale-dataset-image">
                <img src={dataset.image} alt={`${dataset.name} official camera-map preview`} loading="lazy" decoding="async" />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b aria-hidden="true">↗</b>
              </div>
              <div>
                <em className={dataset.name.includes("Absolute-Camera") ? "is-absolute" : "is-camera"}>
                  {dataset.name.includes("Absolute-Camera")
                    ? "ABSOLUTE-CAMERA"
                    : dataset.name === "Puffin-16M"
                      ? "CAMERA + TRAJECTORY"
                      : "CAMERA"}
                </em>
                <strong>{dataset.name}</strong>
                <small>{dataset.scope}</small>
              </div>
            </a>
          ))}
        </div>

        <div className="scale-summary">
          <div>
            <strong>48.8M<sup>+</sup></strong>
            <span>CAMERA-ANNOTATED SAMPLES</span>
          </div>
          <div>
            <strong>15.34M</strong>
            <span>SCENE–CAMERA CAPTIONS</span>
          </div>
          <div>
            <strong>1.14M</strong>
            <span>DENSE CAMERA TRAJECTORIES</span>
          </div>
          <div>
            <strong>12</strong>
            <span>PUBLIC DATASET RELEASES</span>
          </div>
        </div>
        <p className="scale-footnote">
          Conservative total from published dataset-card figures; the GPIC contribution uses only the public 4.9M-image profiled subset.
          Every release links camera labels back to its source image or frame.
        </p>
        <div className="scale-update-note">
          <span><i aria-hidden="true" /> CONTINUOUSLY UPDATED</span>
          <p>
            This camera-labelled collection will continue to grow. We will regularly
            annotate and release additional datasets beyond the twelve currently available.
          </p>
        </div>
      </section>

      <section className="resources-section" id="resources">
        <div className="section-kicker">
          <span>04</span>
          <p>DOWNLOAD & RESOURCES</p>
        </div>
        <div className="resources-hero">
          <div>
            <h2>Ready to think<br />with camera?</h2>
            <p>
              Download either part or the complete dataset from Hugging Face.
              The release includes sharded archives, indices, captions, and dense camera annotations.
            </p>
          </div>
          <a className="resource-orbit" href="https://huggingface.co/datasets/KangLiao/Puffin-16M" target="_blank" rel="noreferrer">
            <span>OPEN DATASET</span>
            <i>↗</i>
          </a>
        </div>

        <div className="download-terminal">
          <div className="terminal-bar">
            <span>FULL DATASET · ~11.6 TB DOWNLOAD</span>
            <button onClick={() => copyText("hf download KangLiao/Puffin-16M --repo-type dataset", "command")}>
              {copied === "command" ? "COPIED" : "COPY COMMAND"}
            </button>
          </div>
          <code><b>$</b> hf download KangLiao/Puffin-16M --repo-type dataset</code>
        </div>

        <div className="resource-links">
          <a href="https://huggingface.co/datasets/KangLiao/Puffin-16M" target="_blank" rel="noreferrer">
            <span>DATASET</span><strong>Hugging Face</strong><p>16.5M samples · data card · files</p><b>↗</b>
          </a>
          <a href="https://github.com/KangLiao929/Puffin" target="_blank" rel="noreferrer">
            <span>IMPLEMENTATION</span><strong>GitHub</strong><p>Training, inference, and camera tools</p><b>↗</b>
          </a>
          <a href="https://arxiv.org/abs/2510.08673" target="_blank" rel="noreferrer">
            <span>PUBLICATION</span><strong>Paper</strong><p>Thinking with Camera · ICLR 2026</p><b>↗</b>
          </a>
          <a href="https://kangliao929.github.io/projects/puffin/" target="_blank" rel="noreferrer">
            <span>OVERVIEW</span><strong>Project page</strong><p>Method, results, and applications</p><b>↗</b>
          </a>
        </div>

        <div className="citation-block">
          <div>
            <span>CITATION</span>
            <p>If Puffin supports your research, please cite the paper.</p>
          </div>
          <pre>{citation}</pre>
          <button onClick={() => copyText(citation, "citation")}>
            {copied === "citation" ? "CITATION COPIED" : "COPY BIBTEX"}
          </button>
        </div>
        <div className="license-line">
          <span>NTU S-Lab License 1.0</span>
          <span>Developed at S-Lab, Nanyang Technological University</span>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <img src={assetPath("/images/puffin-logo.png")} alt="" aria-hidden="true" />
          <span className="brand-title">Puffin<em>−16M</em></span>
        </a>
        <p>Camera-centric data for spatial multimodal intelligence.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
