import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ? (import.meta.env.VITE_API_URL as string).replace(/^http/, 'ws')
  : 'ws://localhost:4000';

export function useRecipeSocket(userId?: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let heartbeatTimer: ReturnType<typeof setInterval>;
    let reconnectAttempts = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        reconnectAttempts = 0;
        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; slug?: string; notification?: unknown; count?: number };
          if (msg.type === 'recipe:created' || msg.type === 'recipe:updated' || msg.type === 'recipe:deleted') {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['discover'] });
            queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
            if (msg.slug) queryClient.invalidateQueries({ queryKey: ['recipe', msg.slug] });
          } else if (msg.type === 'notification:new' && msg.notification) {
            window.dispatchEvent(new CustomEvent('ws:notification', { detail: msg.notification }));
          } else if (msg.type === 'notification:unread-count' && typeof msg.count === 'number') {
            window.dispatchEvent(new CustomEvent('ws:notification-count', { detail: msg.count }));
          } else if (msg.type === 'user:follow') {
            window.dispatchEvent(new CustomEvent('ws:user-follow', { detail: msg }));
          }
        } catch {}
      };

      ws.onclose = () => {
        clearInterval(heartbeatTimer);
        if (disposed) return;
        const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempts);
        reconnectAttempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      clearInterval(heartbeatTimer);
      if (ws) ws.onclose = null;
      ws?.close();
    };
  }, [queryClient, userId]);
}
