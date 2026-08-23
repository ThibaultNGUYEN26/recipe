import jwt from 'jsonwebtoken';
import process from 'node:process';
import { WebSocketServer } from 'ws';
import { SESSION_COOKIE_NAME } from './session.js';
import { prisma } from './prisma.js';

let wss = null;
const userSockets = new Map(); // userId -> Set<WebSocket>

export function createWsServer(server) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws, request) => {
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
    ws.on('error', () => { /* close/reconnect is handled by the client */ });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ping') ws.send(JSON.stringify({ type: 'pong' }));
      } catch { /* ignore malformed client messages */ }
    });
    ws.on('close', () => {
      if (ws.userId) {
        userSockets.get(ws.userId)?.delete(ws);
        if (userSockets.get(ws.userId)?.size === 0) userSockets.delete(ws.userId);
      }
    });
  });
}

export function broadcastRecipeEvent(type, slug) {
  if (!wss) return;
  const msg = JSON.stringify({ type, slug });
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
