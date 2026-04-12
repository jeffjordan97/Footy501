import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { logError } from '../lib/log-error.js';
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
  generateOAuthNonce,
  createExchangeCode,
  redeemExchangeCode,
} from '../services/oauth-service.js';
import { authenticateRequest } from '../middleware/auth.js';

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
    logError('Guest auth failed', error);
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
    logError('Get user failed', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

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
    logError('Update display name failed', error);
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
    logError('Export data failed', error);
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
    logError('Delete account failed', error);
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
    logError('Cancel deletion failed', error);
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

// --- Link Prepare (sets httpOnly cookie for account linking) ---

const LinkPrepareSchema = z.object({
  linkTo: z.string().uuid(),
});

/** POST /api/auth/link-prepare - Set an httpOnly cookie for account linking. */
router.post('/link-prepare', (req, res) => {
  const userId = authenticateRequest(req, res);
  if (!userId) return;

  const parsed = LinkPrepareSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.linkTo !== userId) {
    res.status(403).json({ error: 'Cannot link account: unauthorized' });
    return;
  }

  res.cookie('link_auth', userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 5 * 60 * 1000, // 5 minutes
    path: '/',
  });

  res.json({ ok: true });
});

// --- Google OAuth ---

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 5 * 60 * 1000, // 5 minutes
  path: '/',
};

/** GET /api/auth/google - Redirect to Google OAuth. */
router.get('/google', (req, res) => {
  if (!isGoogleConfigured()) {
    res.status(404).json({ error: 'Google OAuth is not configured' });
    return;
  }

  // C3 fix: validate linkTo against the httpOnly cookie set by /link-prepare
  const linkTo = typeof req.query.linkTo === 'string' ? req.query.linkTo : undefined;
  if (linkTo) {
    const cookies = (req as unknown as { cookies: Record<string, string> }).cookies;
    const cookieUserId = cookies?.link_auth;
    if (!cookieUserId || cookieUserId !== linkTo) {
      res.status(403).json({ error: 'Cannot link account: unauthorized' });
      return;
    }
    // Don't clear yet — needed on callback to verify linkTo in state
  }

  // C1 fix: generate CSRF nonce and store in signed cookie
  const nonce = generateOAuthNonce();
  res.cookie('oauth_nonce', nonce, OAUTH_COOKIE_OPTIONS);

  const statePayload = JSON.stringify({ nonce, linkTo: linkTo ?? null });
  res.redirect(getGoogleAuthUrl(statePayload));
});

/** GET /api/auth/google/callback - Google OAuth callback. */
router.get('/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const stateRaw = typeof req.query.state === 'string' ? req.query.state : undefined;
  const errorUrl = new URL('/auth/callback', CLIENT_URL);

  if (!code) {
    errorUrl.searchParams.set('error', 'missing_code');
    res.redirect(errorUrl.toString());
    return;
  }

  // C1 fix: validate CSRF nonce from cookie against state
  const cookieNonce = (req as unknown as { cookies: Record<string, string> }).cookies?.oauth_nonce;
  res.clearCookie('oauth_nonce', { path: '/' });

  let nonce: string | undefined;
  let linkTo: string | undefined;
  if (stateRaw) {
    try {
      const parsed: unknown = JSON.parse(stateRaw);
      if (typeof parsed === 'object' && parsed !== null) {
        const state = parsed as Record<string, unknown>;
        if (typeof state.nonce === 'string') nonce = state.nonce;
        if (typeof state.linkTo === 'string') linkTo = state.linkTo;
      }
    } catch {
      // Ignore invalid state JSON
    }
  }

  if (!cookieNonce || !nonce || cookieNonce !== nonce) {
    errorUrl.searchParams.set('error', 'state_mismatch');
    res.redirect(errorUrl.toString());
    return;
  }

  try {
    const { accessToken } = await exchangeGoogleCode(code);
    const googleUser = await getGoogleUser(accessToken);

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

    // C2 fix: use a short-lived exchange code instead of JWT in URL
    const exchangeCode = createExchangeCode(token, 'google', isNew);

    const redirectUrl = new URL('/auth/callback', CLIENT_URL);
    redirectUrl.searchParams.set('code', exchangeCode);
    redirectUrl.searchParams.set('provider', 'google');

    res.redirect(redirectUrl.toString());
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'OAuth failed';
    console.error('Google OAuth callback failed:', msg);
    errorUrl.searchParams.set('error', 'oauth_failed');
    errorUrl.searchParams.set('provider', 'google');
    res.redirect(errorUrl.toString());
  }
});

/** POST /api/auth/token-exchange - Exchange a short-lived code for a JWT. */
const ExchangeSchema = z.object({
  code: z.string().min(1).max(128),
});

router.post('/token-exchange', (req, res) => {
  const parsed = ExchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const entry = redeemExchangeCode(parsed.data.code);
  if (!entry) {
    res.status(400).json({ error: 'Invalid or expired exchange code' });
    return;
  }

  res.json({ token: entry.token, provider: entry.provider, isNew: entry.isNew });
});

export default router;
