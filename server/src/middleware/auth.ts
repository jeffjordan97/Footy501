import type { Request, Response } from 'express';
import { verifyToken } from '../services/auth-service.js';

/** Extract and verify Bearer token. Returns userId or sends 401 and returns null. */
export function authenticateRequest(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return null;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }
  return payload.userId;
}
