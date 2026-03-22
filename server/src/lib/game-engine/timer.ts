// ============================================================================
// Footy 501 Game Engine - Timer Escalation Logic
// ============================================================================
// Pure functions for managing timeout penalties and timer duration escalation.

import {
  DEFAULT_TIMER_DURATION,
  MAX_CONSECUTIVE_TIMEOUTS,
  TIMEOUT_ESCALATION,
} from "./rules.js";

// --- Types ---

export interface TimeoutState {
  readonly consecutiveTimeouts: number;
  readonly timerDuration: number | null;
}

// --- Pure Functions ---

/**
 * Returns the timer duration for the next turn based on how many
 * consecutive timeouts have occurred, or null if the match should
 * be forfeited.
 *
 * Uses the TIMEOUT_ESCALATION array as a lookup table:
 *   0 → 45s, 1 → 45s, 2 → 30s, 3 → 15s, 4+ → null (forfeit)
 */
export const getNextTimerDuration = (
  consecutiveTimeouts: number,
): number | null => {
  if (consecutiveTimeouts >= TIMEOUT_ESCALATION.length) {
    return null;
  }
  return TIMEOUT_ESCALATION[consecutiveTimeouts];
};

/**
 * Produces the next timeout state after a turn completes.
 *
 * - If the player timed out: increments the consecutive count and
 *   returns the escalated timer duration (or null for forfeit).
 * - If the player answered in time: resets to 0 consecutive timeouts
 *   and restores the default timer duration.
 */
export const updateTimeoutState = (
  consecutiveTimeouts: number,
  timedOut: boolean,
): TimeoutState => {
  if (!timedOut) {
    return {
      consecutiveTimeouts: 0,
      timerDuration: DEFAULT_TIMER_DURATION,
    };
  }

  const newCount = consecutiveTimeouts + 1;
  return {
    consecutiveTimeouts: newCount,
    timerDuration: getNextTimerDuration(newCount),
  };
};

/**
 * Returns true when the player has reached or exceeded the maximum
 * number of consecutive timeouts, triggering a match forfeit.
 */
export const isMatchForfeit = (consecutiveTimeouts: number): boolean =>
  consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS;

/**
 * Returns a human-readable message describing the consequence of
 * the current number of consecutive timeouts.
 */
export const getTimeoutMessage = (consecutiveTimeouts: number): string => {
  if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
    return `Match forfeited due to ${MAX_CONSECUTIVE_TIMEOUTS} consecutive timeouts`;
  }

  const nextDuration = getNextTimerDuration(consecutiveTimeouts);

  if (nextDuration === DEFAULT_TIMER_DURATION) {
    return `Turn forfeited. Timer remains at ${DEFAULT_TIMER_DURATION}s`;
  }

  return `Turn forfeited. Timer reduced to ${nextDuration}s`;
};
