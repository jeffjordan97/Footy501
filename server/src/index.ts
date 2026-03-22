import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import apiRouter from './routes/index.js';
import { registerGameHandlers, registerLobbyHandlers } from './websocket/index.js';
import { cleanupStaleRooms } from './services/room-service.js';
import { cleanupExpiredConnections } from './services/connection-service.js';
import { db } from './db/index.js';

const app: Express = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:3000' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

app.use('/api', apiRouter);

registerGameHandlers(io);
registerLobbyHandlers(io);

// Clean up stale rooms every 30 minutes
setInterval(() => {
  const cleaned = cleanupStaleRooms();
  if (cleaned > 0) console.log(`Cleaned up ${cleaned} stale rooms`);
}, 30 * 60 * 1000);

// Clean up expired reconnection entries every 5 minutes
setInterval(() => {
  const cleaned = cleanupExpiredConnections();
  if (cleaned > 0) console.log(`Cleaned up ${cleaned} expired connections`);
}, 5 * 60 * 1000);

const PORT = parseInt(process.env.PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io, httpServer };
