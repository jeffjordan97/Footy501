import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, dailyChallengeAttempts } from '../db/schema/index.js';
import { and, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  if (secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return secret;
}

const JWT_SECRET: string = getJwtSecret();
const TOKEN_EXPIRY = '7d';

function signToken(userId: string, displayName: string): string {
  return jwt.sign(
    { userId, displayName } satisfies TokenPayload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY },
  );
}

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

  const token = signToken(inserted.id, inserted.displayName);

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

/** Look up a user by their primary key. Returns null if soft-deleted. */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  const results = await db.select({
    id: users.id,
    displayName: users.displayName,
    authProvider: users.authProvider,
    deletedAt: users.deletedAt,
  }).from(users).where(eq(users.id, userId)).limit(1);

  const row = results[0];
  if (!row || row.deletedAt) return null;
  return { id: row.id, displayName: row.displayName, authProvider: row.authProvider ?? 'guest' };
}

/** Find or create a user by OAuth provider + provider ID. */
export async function findOrCreateOAuthUser(
  provider: 'google',
  providerId: string,
  displayName: string,
): Promise<{ token: string; user: AuthUser; isNew: boolean }> {
  // Check if a user already exists with this provider + auth_id
  const existing = await db.select({
    id: users.id,
    displayName: users.displayName,
    authProvider: users.authProvider,
  })
    .from(users)
    .where(and(eq(users.authProvider, provider), eq(users.authId, providerId)))
    .limit(1);

  if (existing[0]) {
    const row = existing[0];

    // Update display name if it changed
    if (row.displayName !== displayName) {
      await db.update(users)
        .set({ displayName })
        .where(eq(users.id, row.id));
    }

    const user: AuthUser = {
      id: row.id,
      displayName,
      authProvider: row.authProvider ?? provider,
    };

    const token = signToken(user.id, user.displayName);
    return { token, user, isNew: false };
  }

  // Create new user
  const [inserted] = await db.insert(users).values({
    displayName,
    authProvider: provider,
    authId: providerId,
  }).returning({
    id: users.id,
    displayName: users.displayName,
    authProvider: users.authProvider,
  });

  if (!inserted) throw new Error('Failed to create OAuth user');

  const user: AuthUser = {
    id: inserted.id,
    displayName: inserted.displayName,
    authProvider: inserted.authProvider ?? provider,
  };

  const token = signToken(user.id, user.displayName);
  return { token, user, isNew: true };
}

/** Link an existing guest account to an OAuth provider. */
export async function linkOAuthToGuest(
  guestUserId: string,
  provider: 'google',
  providerId: string,
  displayName: string,
): Promise<{ token: string; user: AuthUser }> {
  const [updated] = await db.update(users)
    .set({
      authProvider: provider,
      authId: providerId,
      displayName,
    })
    .where(and(eq(users.id, guestUserId), eq(users.authProvider, 'guest')))
    .returning({
      id: users.id,
      displayName: users.displayName,
      authProvider: users.authProvider,
    });

  if (!updated) throw new Error('Guest user not found or already linked');

  const user: AuthUser = {
    id: updated.id,
    displayName: updated.displayName,
    authProvider: updated.authProvider ?? provider,
  };

  const token = signToken(user.id, user.displayName);
  return { token, user };
}

/** Update a user's display name and return a fresh token. */
export async function updateUserDisplayName(
  userId: string,
  displayName: string,
): Promise<{ token: string; user: AuthUser }> {
  const [updated] = await db.update(users)
    .set({ displayName })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning({ id: users.id, displayName: users.displayName, authProvider: users.authProvider });

  if (!updated) throw new Error('User not found');

  const user: AuthUser = {
    id: updated.id,
    displayName: updated.displayName,
    authProvider: updated.authProvider ?? 'guest',
  };
  const token = signToken(user.id, user.displayName);
  return { token, user };
}

/** Soft-delete a user account (14-day grace period). */
export async function softDeleteUser(userId: string): Promise<void> {
  const [updated] = await db.update(users)
    .set({ deletedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning({ id: users.id });

  if (!updated) throw new Error('User not found or already deleted');
}

/** Cancel a pending soft-delete. */
export async function cancelUserDeletion(userId: string): Promise<AuthUser> {
  const [updated] = await db.update(users)
    .set({ deletedAt: null })
    .where(eq(users.id, userId))
    .returning({ id: users.id, displayName: users.displayName, authProvider: users.authProvider });

  if (!updated) throw new Error('User not found');
  return { id: updated.id, displayName: updated.displayName, authProvider: updated.authProvider ?? 'guest' };
}

/** Export all user data as a JSON-serialisable object. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const userRow = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRow[0]) throw new Error('User not found');

  const attempts = await db.select().from(dailyChallengeAttempts).where(eq(dailyChallengeAttempts.userId, userId));

  return {
    user: {
      id: userRow[0].id,
      displayName: userRow[0].displayName,
      authProvider: userRow[0].authProvider,
      createdAt: userRow[0].createdAt,
    },
    dailyChallengeAttempts: attempts.map((a) => ({
      challengeId: a.challengeId,
      displayName: a.displayName,
      finalScore: a.finalScore,
      turnsTaken: a.turnsTaken,
      completed: a.completed,
      createdAt: a.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };
}
