
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fileRoutes = require('./routes/files');
const processRoutes = require('./routes/processes');
const systemRoutes = require('./routes/system');
const appRoutes = require('./routes/app');
const terminalSocket = require('./routes/terminal');
const FrpClient = require('./frp-client');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'default-token';
const frpClient = new FrpClient();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/server/shutdown', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Server shutting down...' });
  console.log('[Server] Shutdown requested via API');
  setTimeout(() => { frpClient.stop(); server.close(() => process.exit(0)); }, 500);
});

app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/processes', authMiddleware, processRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
const connectedClients = new Map();

app.use('/api/app', appRoutes);

app.get('/api/terminals/reminders/state', authMiddleware, (req, res) => {
  res.json(terminalSocket.getTerminalReminderState());
});

app.post('/api/terminals/reminders/pull', authMiddleware, (req, res) => {
  res.json(terminalSocket.pullPendingTerminalReminders());
});

app.post('/api/terminals/reminders/ack', authMiddleware, (req, res) => {
  const { reminderId, terminalId } = req.body || {};

  if (!reminderId && !terminalId) {
    return res.status(400).json({ error: 'reminderId or terminalId is required' });
  }

  res.json(terminalSocket.acknowledgePendingTerminalReminder({ reminderId, terminalId }));
});

io.use((socket, next) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const token = authToken || headerToken;

  if (token !== AUTH_TOKEN) {
    return next(new Error('Auth error'));
  }

  socket.data.isAuthenticated = true;
  next();
});

io.on('connection', (socket) => {
  console.log('[Socket] Connected:', socket.id);
  connectedClients.set(socket.id, { socket, connectedAt: Date.now() });

  terminalSocket(socket);

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    console.log('[Socket] Disconnected:', socket.id);
  });
});

app.post('/api/notifications', authMiddleware, (req, res) => {
  const { title, message, type = 'info' } = req.body;
  if (!title || !message) return res.status(400).json({ success: false, error: 'Missing fields' });
  const notification = { id: Date.now().toString(), title, message, type, timestamp: new Date().toISOString() };
  let sentCount = 0;
  connectedClients.forEach((client) => { try { client.socket.emit('notification', notification); sentCount++; } catch (e) {} });
  res.json({ success: true, sentCount });
});

server.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
  frpClient.start().then(r => r.success && console.log('🌐 Public: http://' + r.url));
});

process.on('SIGINT', () => { frpClient.stop(); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { frpClient.stop(); server.close(() => process.exit(0)); });

module.exports = { app, server, io, frpClient };
