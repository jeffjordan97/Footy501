import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { createGuestUser, verifyToken, getUserById } from '../services/auth-service.js';

const router: RouterType = Router();

const GuestSchema = z.object({
  displayName: z.string().min(1).max(30).optional(),
});

/** POST /api/auth/guest - Create a guest account and get a JWT token. */
router.post('/guest', async (req, res) => {
  const parsed = GuestSchema.safeParse(req.body);
  const displayName = parsed.success ? parsed.data.displayName ?? '' : '';

  try {
    const result = await createGuestUser(displayName);
    res.status(201).json(result);
  } catch (error) {
    console.error('Guest auth failed:', error);
    res.status(500).json({ error: 'Failed to create guest account' });
  }
});

/** GET /api/auth/me - Get current user from Bearer token. */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user failed:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
