/**
 * Minimal Express app for route integration tests.
 *
 * Builds the same middleware + route tree as src/index.ts but never calls
 * httpServer.listen(), so no port is bound during test runs.
 */
import express, { type Express } from 'express';
import apiRouter from '../index.js';

export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  return app;
}
