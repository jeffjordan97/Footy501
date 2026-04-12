import { randomBytes } from 'node:crypto';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid profile',
    state: state ?? '',
    access_type: 'offline',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string): Promise<{ accessToken: string }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(data.error_description ?? data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token received from Google');
  }

  return { accessToken: data.access_token };
}

export async function getGoogleUser(
  accessToken: string,
): Promise<{ id: string; name: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await response.json()) as { id?: string; name?: string };

  if (!data.id || !data.name) {
    throw new Error('Invalid response from Google userinfo endpoint');
  }

  return { id: data.id, name: data.name };
}

// --- OAuth CSRF nonce ---

export function generateOAuthNonce(): string {
  return randomBytes(16).toString('hex');
}

// --- Short-lived exchange codes (C2 fix) ---

interface ExchangeEntry {
  readonly token: string;
  readonly provider: string;
  readonly isNew: boolean;
  readonly expiresAt: number;
}

const exchangeCodes = new Map<string, ExchangeEntry>();

const EXCHANGE_CODE_TTL_MS = 60_000; // 60 seconds

/** Generate a single-use exchange code that maps to a JWT. */
export function createExchangeCode(token: string, provider: string, isNew: boolean): string {
  const code = randomBytes(24).toString('hex');
  exchangeCodes.set(code, {
    token,
    provider,
    isNew,
    expiresAt: Date.now() + EXCHANGE_CODE_TTL_MS,
  });
  return code;
}

/** Redeem an exchange code for the JWT. Returns null if expired or invalid. */
export function redeemExchangeCode(code: string): ExchangeEntry | null {
  const entry = exchangeCodes.get(code);
  if (!entry) return null;

  // Single-use: delete immediately
  exchangeCodes.delete(code);

  if (Date.now() > entry.expiresAt) return null;

  return entry;
}

/** Periodic cleanup of expired exchange codes. */
export function cleanupExchangeCodes(): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [code, entry] of exchangeCodes) {
    if (now > entry.expiresAt) {
      exchangeCodes.delete(code);
      cleaned += 1;
    }
  }
  return cleaned;
}
