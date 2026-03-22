export interface QueueEntry {
  readonly socketId: string;
  readonly userId: string | null;
  readonly displayName: string;
  readonly joinedAt: number;
}

// FIFO queue for quick match
const queue: QueueEntry[] = [];

/**
 * Add a player to the matchmaking queue.
 * Silently ignores duplicates.
 */
export function enqueue(entry: QueueEntry): void {
  if (queue.some((e) => e.socketId === entry.socketId)) return;
  queue.push(entry);
}

/**
 * Remove a player from the matchmaking queue by socket ID.
 * Returns the removed entry, or null if not found.
 */
export function dequeue(socketId: string): QueueEntry | null {
  const index = queue.findIndex((e) => e.socketId === socketId);
  if (index === -1) return null;
  const [entry] = queue.splice(index, 1);
  return entry ?? null;
}

/**
 * Try to match the requesting player with another player in the queue.
 * Returns a pair [requester, opponent] if a match is found, null otherwise.
 * Both players are removed from the queue on match.
 */
export function tryMatch(socketId: string): readonly [QueueEntry, QueueEntry] | null {
  if (queue.length < 2) return null;

  const myIndex = queue.findIndex((e) => e.socketId === socketId);
  if (myIndex === -1) return null;

  const otherIndex = queue.findIndex((_, i) => i !== myIndex);
  if (otherIndex === -1) return null;

  // Remove both from queue (higher index first to preserve positions)
  const indices = [myIndex, otherIndex].sort((a, b) => b - a);
  const removed: QueueEntry[] = [];
  for (const idx of indices) {
    const [entry] = queue.splice(idx, 1);
    if (entry) removed.push(entry);
  }

  // Return in original index order (lower index first)
  removed.reverse();
  return [removed[0]!, removed[1]!] as const;
}

/**
 * Get the current queue length.
 */
export function getQueueLength(): number {
  return queue.length;
}

/**
 * Check if a player is currently in the queue.
 */
export function isInQueue(socketId: string): boolean {
  return queue.some((e) => e.socketId === socketId);
}
