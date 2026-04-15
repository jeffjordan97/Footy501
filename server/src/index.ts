import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import apiRouter from './routes/index.js';
import { registerGameHandlers, registerLobbyHandlers } from './websocket/index.js';
import { cleanupStaleRooms } from './services/room-service.js';
import { cleanupExpiredConnections } from './services/connection-service.js';
import { cleanupExchangeCodes } from './services/oauth-service.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL;
if (isProduction && !clientUrl) {
  throw new Error('CLIENT_URL environment variable is required in production');
}
const origin = clientUrl ?? 'http://localhost:3000';

const app: Express = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin,
    methods: ['GET', 'POST'],
  },
});

// Security headers (CSP disabled — this is a JSON API, not an HTML server;
// CSP should be set by the frontend's static hosting instead)
app.use(helmet({
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(cookieParser());

// Global rate limit: 100 requests per minute per IP
app.use(rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
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

// Clean up expired OAuth exchange codes every minute
setInterval(() => {
  cleanupExchangeCodes();
}, 60 * 1000);

const PORT = parseInt(process.env.PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io, httpServer };
