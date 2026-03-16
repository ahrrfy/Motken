import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullRefresh({ onRefresh, threshold = 80, maxPull = 120 }: UsePullRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const startYRef = useRef(0);
  const pullDistRef = useRef(0);
  const directionLocked = useRef(false);
  const isVerticalScroll = useRef(false);
  const startXRef = useRef(0);

  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (!el || el.scrollTop > 5) return;
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      pullingRef.current = true;
      directionLocked.current = false;
      isVerticalScroll.current = false;
    }

    function handleTouchMove(e: TouchEvent) {
      if (!pullingRef.current || refreshingRef.current) return;

      const diffY = e.touches[0].clientY - startYRef.current;
      const diffX = e.touches[0].clientX - startXRef.current;

      if (!directionLocked.current) {
        if (Math.abs(diffY) < 10 && Math.abs(diffX) < 10) return;
        directionLocked.current = true;

        if (diffY <= 0 || Math.abs(diffX) > Math.abs(diffY)) {
          pullingRef.current = false;
          return;
        }
      }

      if (!pullingRef.current) return;

      if (el && el.scrollTop > 0) {
        pullingRef.current = false;
        pullDistRef.current = 0;
        setPullDistance(0);
        return;
      }

      const dampened = Math.min(maxPull, diffY * 0.4);
      if (dampened > 5) {
        e.preventDefault();
        pullDistRef.current = dampened;
        setPullDistance(dampened);
      }
    }

    async function handleTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      directionLocked.current = false;

      if (pullDistRef.current >= threshold && !refreshingRef.current) {
        setRefreshing(true);
        refreshingRef.current = true;
        setPullDistance(threshold);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          refreshingRef.current = false;
          setPullDistance(0);
          pullDistRef.current = 0;
        }
      } else {
        setPullDistance(0);
        pullDistRef.current = 0;
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [maxPull, threshold]);

  return { containerRef, pullDistance, refreshing, isTriggered: pullDistance >= threshold };
}
