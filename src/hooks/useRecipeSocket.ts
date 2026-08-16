import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getStoredToken } from '../contexts/AuthContext';

const WS_URL = (import.meta.env.VITE_API_URL as string | undefined)
  ? (import.meta.env.VITE_API_URL as string).replace(/^http/, 'ws')
  : 'ws://localhost:4000';

export function useRecipeSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        const token = getStoredToken();
        if (token) ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; slug?: string; notification?: unknown };
          if (msg.type === 'recipe:created' || msg.type === 'recipe:updated' || msg.type === 'recipe:deleted') {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['discover'] });
            queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
            if (msg.slug) queryClient.invalidateQueries({ queryKey: ['recipe', msg.slug] });
          } else if (msg.type === 'notification:new' && msg.notification) {
            window.dispatchEvent(new CustomEvent('ws:notification', { detail: msg.notification }));
          } else if (msg.type === 'user:follow') {
            window.dispatchEvent(new CustomEvent('ws:user-follow', { detail: msg }));
          }
        } catch {}
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws.onclose = null;
      ws?.close();
    };
  }, [queryClient]);
}
