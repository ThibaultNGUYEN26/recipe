import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const THRESHOLD = 60;
const REFRESH_INDICATOR_HEIGHT = 48;
const MAX_PULL_DISTANCE = 84;

export function usePullToRefresh(scrollRef: React.RefObject<HTMLElement | null>) {
  const queryClient = useQueryClient();
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const startX = useRef(0);
  const currentDistance = useRef(0);
  const isPulling = useRef(false);
  const isRefreshing = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let disposed = false;

    function updateDistance(distance: number) {
      currentDistance.current = distance;
      setPullDistance(distance);
      setPulling(distance >= THRESHOLD);
    }

    function resetPull() {
      isPulling.current = false;
      updateDistance(0);
    }

    async function refresh() {
      if (isRefreshing.current) return;
      isRefreshing.current = true;
      setRefreshing(true);
      setPulling(false);
      setPullDistance(REFRESH_INDICATOR_HEIGHT);

      try {
        await Promise.all([
          queryClient.invalidateQueries({ refetchType: 'active' }),
          new Promise((resolve) => window.setTimeout(resolve, 400)),
        ]);
      } finally {
        isRefreshing.current = false;
        if (!disposed) {
          currentDistance.current = 0;
          setPullDistance(0);
          setRefreshing(false);
        }
      }
    }

    function onTouchStart(event: TouchEvent) {
      if (isRefreshing.current || el.scrollTop > 2 || event.touches.length !== 1) return;
      startY.current = event.touches[0].clientY;
      startX.current = event.touches[0].clientX;
      currentDistance.current = 0;
      isPulling.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!isPulling.current) return;
      const deltaY = event.touches[0].clientY - startY.current;
      const deltaX = Math.abs(event.touches[0].clientX - startX.current);

      if (deltaX > Math.max(deltaY, 8) || el.scrollTop > 2) {
        resetPull();
        return;
      }
      if (deltaY <= 0) {
        updateDistance(0);
        return;
      }

      const distance = Math.min(deltaY * 0.6, MAX_PULL_DISTANCE);
      updateDistance(distance);
      if (deltaY > 4) event.preventDefault();
    }

    function onTouchEnd() {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (currentDistance.current >= THRESHOLD) void refresh();
      else updateDistance(0);
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', resetPull);
    return () => {
      disposed = true;
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', resetPull);
    };
  }, [scrollRef, queryClient]);

  return { pulling, refreshing, pullDistance };
}
