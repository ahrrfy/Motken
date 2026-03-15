import { useRef, useCallback, useEffect } from "react";

interface UseSwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
  elementRef?: React.RefObject<HTMLElement | null>;
}

export function useSwipe({ onSwipeRight, onSwipeLeft, threshold = 80, elementRef }: UseSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = true;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!swiping.current) return;
    swiping.current = false;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX.current;
    const diffY = Math.abs(endY - startY.current);
    if (diffY > Math.abs(diffX)) return;
    if (diffX > threshold && onSwipeRight) onSwipeRight();
    if (diffX < -threshold && onSwipeLeft) onSwipeLeft();
  }, [onSwipeRight, onSwipeLeft, threshold]);

  useEffect(() => {
    const el = elementRef?.current || document;
    el.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    el.addEventListener("touchend", handleTouchEnd as any, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchEnd, elementRef]);
}
