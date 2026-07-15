"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ViewportVideoProps = {
  src: string;
  mobileSrc?: string;
  label: string;
};

export default function ViewportVideo({ src, mobileSrc, label }: ViewportVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [hasError, setHasError] = useState(false);

  const attemptPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    try {
      await video.play();
      setNeedsInteraction(false);
      setHasError(false);
    } catch {
      if (visibleRef.current) setNeedsInteraction(true);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const clearRetryTimer = () => {
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        clearRetryTimer();
        if (entry.isIntersecting) {
          void attemptPlayback();
          retryTimerRef.current = window.setTimeout(() => {
            if (visibleRef.current && video.paused) setNeedsInteraction(true);
          }, 1200);
        } else {
          video.pause();
        }
      },
      { rootMargin: "80px 0px", threshold: 0.08 },
    );

    const markPlaying = () => setNeedsInteraction(false);
    const markError = () => {
      setHasError(true);
      setNeedsInteraction(true);
    };
    video.addEventListener("playing", markPlaying);
    video.addEventListener("error", markError);
    observer.observe(video);

    return () => {
      clearRetryTimer();
      observer.disconnect();
      video.removeEventListener("playing", markPlaying);
      video.removeEventListener("error", markError);
    };
  }, [attemptPlayback]);

  return (
    <div className="viewport-video">
      <video
        ref={videoRef}
        loop
        muted
        autoPlay
        playsInline
        preload="metadata"
        aria-label={label}
        onClick={() => {
          if (videoRef.current?.paused) void attemptPlayback();
        }}
      >
        {mobileSrc && <source media="(max-width: 720px)" src={mobileSrc} type="video/mp4" />}
        <source src={src} type="video/mp4" />
      </video>
      {needsInteraction && (
        <button
          className={`video-play-button ${hasError ? "has-error" : ""}`}
          type="button"
          onClick={() => void attemptPlayback()}
          aria-label={hasError ? `Retry ${label}` : `Play ${label}`}
        >
          <i aria-hidden="true" />
          <span>{hasError ? "RETRY VIDEO" : "TAP TO PLAY"}</span>
        </button>
      )}
    </div>
  );
}
