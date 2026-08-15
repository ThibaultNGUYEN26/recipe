import { WebSocketServer } from 'ws';

let wss = null;

export function createWsServer(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    ws.on('error', () => {});
  });
}

export function broadcastRecipeEvent(type, slug) {
  if (!wss) return;
  const msg = JSON.stringify({ type, slug });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try { client.send(msg); } catch {}
    }
  }
}
