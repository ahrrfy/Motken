import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  enabled?: boolean;
}

export function usePullRefresh({ onRefresh, threshold = 80, maxPull = 120, enabled = true }: UsePullRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !pulling || refreshing) return;
    currentY.current = e.touches[0].clientY;
    const diff = Math.max(0, currentY.current - startY.current);
    const dampened = Math.min(maxPull, diff * 0.5);
    // عتبة أعلى لتجنب تعطيل التمرير الطبيعي
    if (dampened > 20) {
      e.preventDefault();
      setPullDistance(dampened);
    }
  }, [enabled, pulling, refreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullDistance: enabled ? pullDistance : 0, refreshing, isTriggered: enabled && pullDistance >= threshold };
}
