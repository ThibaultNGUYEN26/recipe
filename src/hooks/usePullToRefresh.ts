import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const THRESHOLD = 72; // px to pull before triggering refresh

export function usePullToRefresh(scrollRef: React.RefObject<HTMLElement | null>) {
  const queryClient = useQueryClient();
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPullDistance(0); return; }
      // Resist pull — feels natural
      const distance = Math.min(delta * 0.4, THRESHOLD + 20);
      setPullDistance(distance);
      setPulling(distance >= THRESHOLD);
      if (delta > 10) e.preventDefault();
    }

    function onTouchEnd() {
      if (!isPulling.current) return;
      isPulling.current = false;
      if (pullDistance >= THRESHOLD) {
        queryClient.invalidateQueries();
      }
      setPullDistance(0);
      setPulling(false);
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollRef, queryClient, pullDistance]);

  return { pulling, pullDistance };
}
