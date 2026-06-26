const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Attach standard WebSocket server for live-stream score updates
  const wss = new WebSocketServer({ noServer: true });

  // Track all active WebSocket client connections
  const clients = new Set();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total clients: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected. Remaining clients: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client connection error:', err);
      clients.delete(ws);
    });
  });

  // ─── WebRTC Video Signaling Server ───────────────────────────────────
  const videoWss = new WebSocketServer({ noServer: true });

  // Per-match video rooms: Map<matchId, { broadcaster: ws, viewers: Set<ws> }>
  const videoRooms = new Map();

  function getOrCreateRoom(matchId) {
    if (!videoRooms.has(matchId)) {
      videoRooms.set(matchId, { broadcaster: null, viewers: new Set() });
    }
    return videoRooms.get(matchId);
  }

  function cleanupRoom(matchId) {
    const room = videoRooms.get(matchId);
    if (room && !room.broadcaster && room.viewers.size === 0) {
      videoRooms.delete(matchId);
    }
  }

  function sendJson(ws, data) {
    if (ws.readyState === 1) {
      try { ws.send(JSON.stringify(data)); } catch (_) {}
    }
  }

  videoWss.on('connection', (ws, request) => {
    const url = new URL(request.url, `http://localhost:${port}`);
    const matchId = url.searchParams.get('matchId');
    const role = url.searchParams.get('role'); // 'broadcaster' or 'viewer'

    if (!matchId || !role) {
      ws.close(4000, 'Missing matchId or role');
      return;
    }

    const room = getOrCreateRoom(matchId);

    if (role === 'broadcaster') {
      // Only one broadcaster per room
      if (room.broadcaster && room.broadcaster.readyState === 1) {
        ws.close(4001, 'Broadcaster already active for this match');
        return;
      }
      room.broadcaster = ws;
      console.log(`[Video] Broadcaster connected for match ${matchId}`);

      // Notify all existing viewers that broadcaster is available
      room.viewers.forEach((viewer) => {
        sendJson(viewer, { type: 'broadcaster-ready', matchId });
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          // Relay signaling messages to specific viewer
          if (msg.type === 'answer' || msg.type === 'ice-candidate') {
            const targetViewer = Array.from(room.viewers).find(v => v._viewerId === msg.viewerId);
            if (targetViewer) {
              sendJson(targetViewer, { ...msg, from: 'broadcaster' });
            }
          }
          // Broadcast viewer count
          if (msg.type === 'request-viewer-count') {
            sendJson(ws, { type: 'viewer-count', count: room.viewers.size });
          }
        } catch (_) {}
      });

      ws.on('close', () => {
        room.broadcaster = null;
        console.log(`[Video] Broadcaster disconnected for match ${matchId}`);
        // Notify all viewers that stream ended
        room.viewers.forEach((viewer) => {
          sendJson(viewer, { type: 'broadcaster-stopped', matchId });
        });
        cleanupRoom(matchId);
      });

      ws.on('error', () => {
        room.broadcaster = null;
        room.viewers.forEach((viewer) => {
          sendJson(viewer, { type: 'broadcaster-stopped', matchId });
        });
        cleanupRoom(matchId);
      });

    } else if (role === 'viewer') {
      // Assign a unique viewer ID
      ws._viewerId = `viewer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      room.viewers.add(ws);
      console.log(`[Video] Viewer ${ws._viewerId} connected for match ${matchId}. Total viewers: ${room.viewers.size}`);

      // Notify broadcaster of updated viewer count
      if (room.broadcaster) {
        sendJson(room.broadcaster, { type: 'viewer-count', count: room.viewers.size });
      }

      // Tell viewer their ID and if broadcaster is available
      sendJson(ws, { type: 'welcome', viewerId: ws._viewerId, broadcasterActive: !!(room.broadcaster && room.broadcaster.readyState === 1) });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          // Relay signaling messages to broadcaster
          if (msg.type === 'offer' || msg.type === 'ice-candidate') {
            if (room.broadcaster && room.broadcaster.readyState === 1) {
              sendJson(room.broadcaster, { ...msg, viewerId: ws._viewerId });
            }
          }
        } catch (_) {}
      });

      ws.on('close', () => {
        room.viewers.delete(ws);
        console.log(`[Video] Viewer ${ws._viewerId} disconnected for match ${matchId}. Remaining viewers: ${room.viewers.size}`);
        // Notify broadcaster of updated viewer count
        if (room.broadcaster) {
          sendJson(room.broadcaster, { type: 'viewer-count', count: room.viewers.size });
          sendJson(room.broadcaster, { type: 'viewer-disconnected', viewerId: ws._viewerId });
        }
        cleanupRoom(matchId);
      });

      ws.on('error', () => {
        room.viewers.delete(ws);
        if (room.broadcaster) {
          sendJson(room.broadcaster, { type: 'viewer-count', count: room.viewers.size });
          sendJson(room.broadcaster, { type: 'viewer-disconnected', viewerId: ws._viewerId });
        }
        cleanupRoom(matchId);
      });
    }
  });

  // Intercept HTTP upgrade request to bind WebSocket protocol
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);

    if (pathname === '/ws/live-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (pathname === '/ws/live-video') {
      videoWss.handleUpgrade(request, socket, head, (ws) => {
        videoWss.emit('connection', ws, request);
      });
    }
    // Note: Do NOT call socket.destroy() for other paths. 
    // This allows Next.js standard Hot Module Replacement (HMR) sockets to upgrade successfully.
  });

  // Expose a thread-safe global broadcasting helper for App Router API routes to invoke
  global.broadcastMatchUpdate = (matchData) => {
    const payload = JSON.stringify(matchData);
    let successCount = 0;
    clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(payload);
          successCount++;
        } catch (err) {
          console.error('[WS] Failed to send broadcast message to client:', err);
        }
      }
    });
    console.log(`[WS] Broadcasted match update to ${successCount}/${clients.size} clients.`);
  };

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
