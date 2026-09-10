import { useEffect, useRef } from "react";
import { resolveMediaUrl } from "../services/mediaStorage";

function isHlsUrl(u: string): boolean {
  return /\.m3u8(\?|$)/i.test(u);
}

type Props = {
  streamUrl: string;
  label?: string;
  className?: string;
};

export function TrailerPlayer({ streamUrl, label, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const resolved = resolveMediaUrl(streamUrl);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !resolved) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    let cancelled = false;
    if (!isHlsUrl(resolved)) {
      v.src = resolved;
      return () => {
        cancelled = true;
      };
    }
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return;
      const el = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(resolved);
        hls.attachMedia(el);
        hlsRef.current = hls;
      } else {
        el.src = resolved;
      }
    });
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
    };
  }, [resolved]);

  if (!resolved) return null;

  return (
    <div className={`trailer-player ${className}`.trim()}>
      <video
        ref={videoRef}
        className="trailer-player-video"
        controls
        playsInline
        preload="metadata"
        aria-label={label ?? "Trailer"}
      />
    </div>
  );
}
