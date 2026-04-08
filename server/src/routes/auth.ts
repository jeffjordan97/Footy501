import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import {
  createGuestUser,
  verifyToken,
  getUserById,
  findOrCreateOAuthUser,
  linkOAuthToGuest,
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
      const result = await findOrCreateOAuthUser('google', googleUser.id, googleUser.name, googleUser.email);
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
