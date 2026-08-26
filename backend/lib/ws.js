import jwt from 'jsonwebtoken';
import process from 'node:process';
import { WebSocket, WebSocketServer } from 'ws';
import { SESSION_COOKIE_NAME } from './session.js';
import { prisma } from './prisma.js';

let wss = null;
const userSockets = new Map(); // userId -> Set<WebSocket>

function removeUserSocket(ws) {
  if (ws.userId == null) return;
  const sockets = userSockets.get(ws.userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) userSockets.delete(ws.userId);
}

export function createWsServer(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws, request) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const sessionToken = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim().split('='))
      .find(([name]) => name === SESSION_COOKIE_NAME)?.[1];
    if (sessionToken) {
      try {
        const payload = jwt.verify(decodeURIComponent(sessionToken), process.env.JWT_SECRET);
        ws.userId = payload.id;
        if (!userSockets.has(payload.id)) userSockets.set(payload.id, new Set());
        userSockets.get(payload.id).add(ws);
        prisma.notification.count({ where: { userId: payload.id, read: false } })
          .then((count) => {
            if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'notification:unread-count', count }));
          })
          .catch(() => {});
      } catch { /* anonymous socket */ }
    }
    ws.on('error', () => removeUserSocket(ws));
    ws.on('message', (data) => {
      ws.isAlive = true;
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch { /* ignore malformed client messages */ }
    });
    ws.on('close', () => removeUserSocket(ws));
  });

  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) {
        removeUserSocket(client);
        if (client.readyState !== WebSocket.CLOSED) client.terminate();
        continue;
      }
      if (client.isAlive === false) {
        removeUserSocket(client);
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30_000);
  heartbeat.unref?.();
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}

export function broadcastRecipeEvent(type, slug) {
  if (!wss) return;
  const msg = JSON.stringify({ type, slug });
  for (const client of wss.clients) {
    if (client.readyState === 1) { try { client.send(msg); } catch { /* ignore failed socket sends */ } }
  }
}

export function broadcastRecipeLikeEvent(slug, likeCount) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'recipe:like', slug, likeCount });
  for (const client of wss.clients) {
    if (client.readyState === 1) { try { client.send(msg); } catch { /* ignore failed socket sends */ } }
  }
}

export function broadcastRecipeStatsEvent(slug, stats) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'recipe:stats', slug, ...stats });
  for (const client of wss.clients) {
    if (client.readyState === 1) { try { client.send(msg); } catch { /* ignore failed socket sends */ } }
  }
}

export function pushNotificationToUser(userId, payload) {
  const sockets = userSockets.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify({ type: 'notification:new', notification: payload });
  for (const ws of sockets) {
    if (ws.readyState === 1) { try { ws.send(msg); } catch { /* ignore failed socket sends */ } }
  }
}

export function broadcastFollowEvent(followingId, followerId, delta) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'user:follow', followingId, followerId, delta });
  for (const client of wss.clients) {
    if (client.readyState === 1) { try { client.send(msg); } catch { /* ignore failed socket sends */ } }
  }
}
