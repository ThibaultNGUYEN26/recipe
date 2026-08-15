import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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

      ws.onmessage = (e) => {
        try {
          const { type, slug } = JSON.parse(e.data) as { type: string; slug: string };
          if (type === 'recipe:created' || type === 'recipe:updated' || type === 'recipe:deleted') {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['discover'] });
            queryClient.invalidateQueries({ queryKey: ['myRecipes'] });
            if (slug) queryClient.invalidateQueries({ queryKey: ['recipe', slug] });
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
