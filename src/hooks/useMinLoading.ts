import { useEffect, useRef, useState } from 'react';

// Keep very short loads legible without making fast API responses feel slow.
export function useMinLoading(isLoading: boolean, minMs = 300): boolean {
  const [showing, setShowing] = useState(isLoading);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      startRef.current = Date.now();
      setShowing(true);
    } else if (startRef.current !== null) {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, minMs - elapsed);
      if (remaining <= 0) {
        setShowing(false);
        startRef.current = null;
      } else {
        timerRef.current = setTimeout(() => {
          setShowing(false);
          startRef.current = null;
        }, remaining);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, minMs]);

  return showing;
}
