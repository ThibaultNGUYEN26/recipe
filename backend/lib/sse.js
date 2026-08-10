// In-memory map of userId → SSE response object
const clients = new Map();

export function addClient(userId, res) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(res);
}

export function removeClient(userId, res) {
  clients.get(userId)?.delete(res);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

export function pushNotification(userId, payload) {
  const conns = clients.get(userId);
  if (!conns) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of conns) {
    try { res.write(data); } catch { removeClient(userId, res); }
  }
}
