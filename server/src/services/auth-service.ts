import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return secret;
}

const JWT_SECRET: string = getJwtSecret();
const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  readonly id: string;
  readonly displayName: string;
  readonly authProvider: string;
}

export interface TokenPayload {
  readonly userId: string;
  readonly displayName: string;
}

/** Create a new guest user and return a JWT token. */
export async function createGuestUser(displayName: string): Promise<{ token: string; user: AuthUser }> {
  const [inserted] = await db.insert(users).values({
    displayName: displayName || `Player_${randomUUID().slice(0, 6)}`,
    authProvider: 'guest',
    authId: null,
  }).returning({
    id: users.id,
    displayName: users.displayName,
    authProvider: users.authProvider,
  });

  if (!inserted) throw new Error('Failed to create guest user');

  const token = jwt.sign(
    { userId: inserted.id, displayName: inserted.displayName } satisfies TokenPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );

  return {
    token,
    user: {
      id: inserted.id,
      displayName: inserted.displayName,
      authProvider: inserted.authProvider ?? 'guest',
    },
  };
}

/** Verify a JWT token and return the decoded payload, or null if invalid. */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/** Look up a user by their primary key. */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  const results = await db.select({
    id: users.id,
    displayName: users.displayName,
    authProvider: users.authProvider,
  }).from(users).where(eq(users.id, userId)).limit(1);

  const row = results[0];
  if (!row) return null;
  return { id: row.id, displayName: row.displayName, authProvider: row.authProvider ?? 'guest' };
}
