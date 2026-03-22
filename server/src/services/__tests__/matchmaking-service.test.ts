import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueue,
  dequeue,
  tryMatch,
  getQueueLength,
  isInQueue,
} from '../matchmaking-service.js';
import type { QueueEntry } from '../matchmaking-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let seqId = 0;

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  seqId += 1;
  return {
    socketId: `sock-${seqId}`,
    userId: null,
    displayName: `Player${seqId}`,
    joinedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Drain the queue of any entries created in prior tests.
 * We track every socketId we enqueue via trackedIds.
 */
let trackedIds: string[] = [];

beforeEach(() => {
  // Remove all tracked entries from the previous test.
  for (const id of trackedIds) {
    dequeue(id);
  }
  trackedIds = [];
});

function enqueueTracked(entry: QueueEntry): void {
  trackedIds.push(entry.socketId);
  enqueue(entry);
}

// ---------------------------------------------------------------------------
// enqueue
// ---------------------------------------------------------------------------

describe('enqueue', () => {
  it('adds a player to the queue', () => {
    const before = getQueueLength();
    const entry = makeEntry();
    enqueueTracked(entry);
    expect(getQueueLength()).toBe(before + 1);
  });

  it('does not add the same socketId twice', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    enqueue(entry); // second call — must be a no-op
    expect(getQueueLength()).toBe(1);
  });

  it('marks the player as in-queue after enqueue', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    expect(isInQueue(entry.socketId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dequeue
// ---------------------------------------------------------------------------

describe('dequeue', () => {
  it('removes and returns the player entry', () => {
    const entry = makeEntry();
    enqueueTracked(entry);

    const result = dequeue(entry.socketId);

    expect(result).toEqual(entry);
    expect(isInQueue(entry.socketId)).toBe(false);
    // Remove from tracked because dequeue already cleaned it up.
    trackedIds = trackedIds.filter((id) => id !== entry.socketId);
  });

  it('returns null for an unknown socketId', () => {
    expect(dequeue('non-existent-sock')).toBeNull();
  });

  it('does not affect other queued players', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);

    dequeue(a.socketId);
    trackedIds = trackedIds.filter((id) => id !== a.socketId);

    expect(isInQueue(b.socketId)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// tryMatch
// ---------------------------------------------------------------------------

describe('tryMatch', () => {
  it('returns null when fewer than 2 players are in the queue', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    expect(tryMatch(entry.socketId)).toBeNull();
  });

  it('returns null when the requesting player is not in the queue', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);

    const result = tryMatch('not-in-queue-sock');
    expect(result).toBeNull();
  });

  it('returns a pair of [requester, opponent] when 2+ players are present', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);

    const result = tryMatch(a.socketId);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);

    const socketIds = result!.map((e) => e.socketId);
    expect(socketIds).toContain(a.socketId);
    expect(socketIds).toContain(b.socketId);

    // Mark as consumed so beforeEach does not try to dequeue again.
    trackedIds = trackedIds.filter((id) => id !== a.socketId && id !== b.socketId);
  });

  it('removes both matched players from the queue', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);

    tryMatch(a.socketId);

    expect(isInQueue(a.socketId)).toBe(false);
    expect(isInQueue(b.socketId)).toBe(false);

    trackedIds = trackedIds.filter((id) => id !== a.socketId && id !== b.socketId);
  });

  it('does not remove a third player who was not matched', () => {
    const a = makeEntry();
    const b = makeEntry();
    const c = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);
    enqueueTracked(c);

    tryMatch(a.socketId);
    trackedIds = trackedIds.filter((id) => id !== a.socketId && id !== b.socketId);

    expect(isInQueue(c.socketId)).toBe(true);
  });

  it('requester is the first element of the returned pair', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    enqueueTracked(b);

    const result = tryMatch(a.socketId);

    // The requester (a) must appear at index 0.
    expect(result![0].socketId).toBe(a.socketId);
    trackedIds = trackedIds.filter((id) => id !== a.socketId && id !== b.socketId);
  });
});

// ---------------------------------------------------------------------------
// getQueueLength
// ---------------------------------------------------------------------------

describe('getQueueLength', () => {
  it('returns 0 when queue is empty', () => {
    expect(getQueueLength()).toBe(0);
  });

  it('increments with each enqueued player', () => {
    const a = makeEntry();
    const b = makeEntry();
    enqueueTracked(a);
    expect(getQueueLength()).toBe(1);
    enqueueTracked(b);
    expect(getQueueLength()).toBe(2);
  });

  it('decrements after dequeue', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    dequeue(entry.socketId);
    trackedIds = trackedIds.filter((id) => id !== entry.socketId);
    expect(getQueueLength()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isInQueue
// ---------------------------------------------------------------------------

describe('isInQueue', () => {
  it('returns true for a queued player', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    expect(isInQueue(entry.socketId)).toBe(true);
  });

  it('returns false for an unknown socketId', () => {
    expect(isInQueue('totally-unknown')).toBe(false);
  });

  it('returns false after the player is dequeued', () => {
    const entry = makeEntry();
    enqueueTracked(entry);
    dequeue(entry.socketId);
    trackedIds = trackedIds.filter((id) => id !== entry.socketId);
    expect(isInQueue(entry.socketId)).toBe(false);
  });
});
