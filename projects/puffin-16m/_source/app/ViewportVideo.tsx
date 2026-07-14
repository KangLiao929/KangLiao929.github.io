"use client";

import { useEffect, useRef } from "react";

export default function ViewportVideo({ src, label }: { src: string; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.05 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return <video ref={videoRef} src={src} loop muted playsInline preload="none" aria-label={label} />;
}
