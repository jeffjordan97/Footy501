import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  createGuestUser,
  verifyToken,
  getUserById,
  findOrCreateOAuthUser,
  linkOAuthToGuest,
  updateUserDisplayName,
  softDeleteUser,
  cancelUserDeletion,
  exportUserData,
} from '../services/auth-service.js';
import {
  isGoogleConfigured,
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleUser,
} from '../services/oauth-service.js';

const router: RouterType = Router();

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

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

/** Helper: extract and verify the Bearer token, returning the userId. */
function authenticateRequest(req: import('express').Request, res: import('express').Response): string | null {
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

const DisplayNameSchema = z.object({
  displayName: z.string().trim().min(1).max(30),
});

/** PATCH /api/auth/me - Update display name. */
router.patch('/me', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const parsed = DisplayNameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Display name must be 1-30 characters' });
    return;
  }

  try {
    const result = await updateUserDisplayName(userId, parsed.data.displayName);
    res.json(result);
  } catch (error) {
    console.error('Update display name failed:', error);
    res.status(500).json({ error: 'Failed to update display name' });
  }
});

/** GET /api/auth/me/data - Export all user data as JSON. */
router.get('/me/data', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  try {
    const data = await exportUserData(userId);
    res.setHeader('Content-Disposition', 'attachment; filename="footy501-data.json"');
    res.json(data);
  } catch (error) {
    console.error('Export data failed:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/** POST /api/auth/me/delete - Initiate account soft-delete (14-day grace period). */
router.post('/me/delete', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  try {
    await softDeleteUser(userId);
    res.json({ message: 'Account scheduled for deletion in 14 days. Sign in again to cancel.' });
  } catch (error) {
    console.error('Delete account failed:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/** POST /api/auth/me/cancel-delete - Cancel pending account deletion. */
router.post('/me/cancel-delete', async (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  try {
    const user = await cancelUserDeletion(userId);
    res.json({ user });
  } catch (error) {
    console.error('Cancel deletion failed:', error);
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});

/** GET /api/auth/providers - List available auth providers. */
router.get('/providers', (_req, res) => {
  res.json({
    providers: {
      guest: true,
      google: isGoogleConfigured(),
    },
  });
});

// --- Google OAuth ---

/** GET /api/auth/google - Redirect to Google OAuth. */
router.get('/google', (req, res) => {
  if (!isGoogleConfigured()) {
    res.status(404).json({ error: 'Google OAuth is not configured' });
    return;
  }

  const linkTo = typeof req.query.linkTo === 'string' ? req.query.linkTo : undefined;
  const state = linkTo ? JSON.stringify({ linkTo }) : undefined;

  res.redirect(getGoogleAuthUrl(state));
});

/** GET /api/auth/google/callback - Google OAuth callback. */
router.get('/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : undefined;

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code);
    const googleUser = await getGoogleUser(accessToken);

    let linkTo: string | undefined;
    if (stateRaw) {
      try {
        const parsed: unknown = JSON.parse(stateRaw);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'linkTo' in parsed &&
          typeof (parsed as { linkTo: unknown }).linkTo === 'string'
        ) {
          linkTo = (parsed as { linkTo: string }).linkTo;
        }
      } catch {
        // Ignore invalid state JSON
      }
    }

    let token: string;
    let isNew = false;

    if (linkTo) {
      const result = await linkOAuthToGuest(linkTo, 'google', googleUser.id, googleUser.name);
      token = result.token;
    } else {
      const result = await findOrCreateOAuthUser('google', googleUser.id, googleUser.name);
      token = result.token;
      isNew = result.isNew;
    }

    const redirectUrl = new URL('/auth/callback', CLIENT_URL);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('provider', 'google');
    redirectUrl.searchParams.set('isNew', String(isNew));

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    const errorUrl = new URL('/auth/callback', CLIENT_URL);
    errorUrl.searchParams.set('error', 'oauth_failed');
    errorUrl.searchParams.set('provider', 'google');
    res.redirect(errorUrl.toString());
  }
});

export default router;
