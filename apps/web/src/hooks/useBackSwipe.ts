import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";

/**
 * Left-to-right "back" swipe. Attach the returned `ref` and `handlers` to a
 * page container; a drag that starts near the left edge slides the page to the
 * right under the finger and, once past the threshold, calls `onBack`.
 */
export function useBackSwipe(onBack: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(false);

  const move = (px: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? "transform 0.22s ease" : "none";
    el.style.transform = px ? `translateX(${px}px)` : "";
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    startRef.current = t ? { x: t.clientX, y: t.clientY } : null;
    activeRef.current = false;
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    const s = startRef.current;
    const t = e.touches[0];
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!activeRef.current) {
      // Begin only on a left-edge, left-to-right drag (iOS-style back gesture).
      if (dx > 16 && Math.abs(dx) > Math.abs(dy) + 6 && s.x < 80) {
        activeRef.current = true;
      } else {
        return;
      }
    }
    move(Math.max(0, dx), false);
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const s = startRef.current;
    const t = e.changedTouches[0];
    const dx = s && t ? t.clientX - s.x : 0;
    const vw = typeof window !== "undefined" ? window.innerWidth || 360 : 360;
    if (dx > Math.min(140, vw * 0.32)) {
      move(vw, true);
      window.setTimeout(onBack, 200);
    } else {
      move(0, true);
    }
  };

  return { ref, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
