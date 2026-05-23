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

  // Attach standard WebSocket server
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

  // Intercept HTTP upgrade request to bind WebSocket protocol
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);

    if (pathname === '/ws/live-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
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
