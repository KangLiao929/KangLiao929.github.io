"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { TrajectoryPose } from "./TrajectoryCamera3D";
import { assetPath } from "./assetPath";

const TrajectoryCamera3D = lazy(() => import("./TrajectoryCamera3D"));

export default function LazyTrajectoryCamera3D({ sample }: { sample: TrajectoryPose }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = anchorRef.current;
    if (!element || shouldLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={anchorRef} className="trajectory-camera-lazy">
      {shouldLoad ? (
        <Suspense fallback={<CameraPlaceholder sample={sample} />}>
          <TrajectoryCamera3D sample={sample} />
        </Suspense>
      ) : (
        <CameraPlaceholder sample={sample} />
      )}
    </div>
  );
}

function CameraPlaceholder({ sample }: { sample: TrajectoryPose }) {
  return (
    <img
      className={`trajectory-camera-placeholder placeholder-${sample.type}`}
      src={assetPath("/models/camera-01/camera-fallback.webp")}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
    />
  );
}
