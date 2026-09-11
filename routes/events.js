const express = require('express');
const router = express.Router();

// List of connected SSE clients
let clients = [];

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const newClient = { id: clientId, res };
  clients.push(newClient);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // Heartbeat every 25 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients = clients.filter(c => c.id !== clientId);
  });
});

function broadcastEvent(type, data) {
  const message = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  clients.forEach(c => {
    try {
      c.res.write(message);
    } catch (e) {
      // client disconnected
    }
  });
}

module.exports = {
  router,
  broadcastEvent
};
