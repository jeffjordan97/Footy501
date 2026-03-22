import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Use vi.hoisted so that the mock variables are initialised before the
// vi.mock factory runs (vi.mock is hoisted to the top of the file by Vitest
// and therefore executes before regular variable declarations).
// ---------------------------------------------------------------------------

const { mockReturning, mockValues, mockInsert } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return { mockReturning, mockValues, mockInsert };
});

vi.mock('../../db/index.js', () => ({
  db: {
    insert: mockInsert,
  },
}));

import { createGuestUser, verifyToken } from '../auth-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? 'footy501-dev-secret-change-in-production';

function makeInsertedUser(overrides: Partial<{ id: string; displayName: string; authProvider: string }> = {}) {
  return {
    id: 'uuid-1234',
    displayName: 'TestPlayer',
    authProvider: 'guest',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-establish default chain after clearAllMocks resets return values.
  mockValues.mockImplementation(() => ({ returning: mockReturning }));
  mockInsert.mockImplementation(() => ({ values: mockValues }));
});

// ---------------------------------------------------------------------------
// createGuestUser
// ---------------------------------------------------------------------------

describe('createGuestUser', () => {
  it('returns a token and user object on success', async () => {
    const inserted = makeInsertedUser();
    mockReturning.mockResolvedValue([inserted]);

    const result = await createGuestUser('TestPlayer');

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.user).toEqual({
      id: inserted.id,
      displayName: inserted.displayName,
      authProvider: inserted.authProvider,
    });
  });

  it('token encodes userId and displayName as payload', async () => {
    const inserted = makeInsertedUser({ id: 'user-abc', displayName: 'Encoded' });
    mockReturning.mockResolvedValue([inserted]);

    const { token } = await createGuestUser('Encoded');

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; displayName: string };
    expect(decoded.userId).toBe('user-abc');
    expect(decoded.displayName).toBe('Encoded');
  });

  it('falls back to a generated display name when empty string is provided', async () => {
    const inserted = makeInsertedUser({ displayName: 'Player_abc123' });
    mockReturning.mockResolvedValue([inserted]);

    const result = await createGuestUser('');

    expect(result.user.displayName).toMatch(/^Player_/);
  });

  it('generates a display name matching "Player_<6chars>" pattern when input is empty', async () => {
    let capturedDisplayName = '';
    (mockValues as Mock).mockImplementation((vals: { displayName?: string }) => {
      capturedDisplayName = vals.displayName ?? '';
      return { returning: mockReturning };
    });
    const generated = 'Player_abcdef';
    mockReturning.mockResolvedValue([makeInsertedUser({ displayName: generated })]);

    await createGuestUser('');

    expect(capturedDisplayName).toMatch(/^Player_[0-9a-f-]{6,}$/i);
  });

  it('uses the provided display name when non-empty', async () => {
    let capturedDisplayName = '';
    (mockValues as Mock).mockImplementation((vals: { displayName?: string }) => {
      capturedDisplayName = vals.displayName ?? '';
      return { returning: mockReturning };
    });
    mockReturning.mockResolvedValue([makeInsertedUser({ displayName: 'MyName' })]);

    await createGuestUser('MyName');

    expect(capturedDisplayName).toBe('MyName');
  });

  it('sets authProvider to "guest" in the inserted record', async () => {
    let capturedAuthProvider = '';
    (mockValues as Mock).mockImplementation((vals: { authProvider?: string }) => {
      capturedAuthProvider = vals.authProvider ?? '';
      return { returning: mockReturning };
    });
    mockReturning.mockResolvedValue([makeInsertedUser()]);

    await createGuestUser('Anyone');

    expect(capturedAuthProvider).toBe('guest');
  });

  it('defaults authProvider to "guest" when DB returns null', async () => {
    const inserted = { id: 'id-x', displayName: 'X', authProvider: null };
    mockReturning.mockResolvedValue([inserted]);

    const result = await createGuestUser('X');

    expect(result.user.authProvider).toBe('guest');
  });

  it('throws when the database returns an empty array', async () => {
    mockReturning.mockResolvedValue([]);

    await expect(createGuestUser('Nobody')).rejects.toThrow('Failed to create guest user');
  });
});

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------

describe('verifyToken', () => {
  it('returns the decoded payload for a valid token', () => {
    const payload = { userId: 'u-1', displayName: 'Alice' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    const result = verifyToken(token);

    expect(result).not.toBeNull();
    expect(result!.userId).toBe('u-1');
    expect(result!.displayName).toBe('Alice');
  });

  it('returns null for a completely invalid token string', () => {
    expect(verifyToken('not.a.valid.jwt')).toBeNull();
  });

  it('returns null for a token signed with a different secret', () => {
    const token = jwt.sign({ userId: 'u-2', displayName: 'Bob' }, 'wrong-secret', { expiresIn: '1h' });
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign(
      { userId: 'u-3', displayName: 'Carol' },
      JWT_SECRET,
      { expiresIn: -1 },
    );
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(verifyToken('')).toBeNull();
  });

  it('returns null for a malformed token (single segment)', () => {
    expect(verifyToken('abc')).toBeNull();
  });
});
