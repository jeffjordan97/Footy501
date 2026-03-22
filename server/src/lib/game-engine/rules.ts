/**
 * Footy 501 Game Rules Constants
 *
 * Defines all rule constants for Footy 501 -- a game that blends darts 501
 * scoring mechanics with football trivia. Players answer questions to score
 * points that count down from a starting target (typically 501), mirroring
 * the structure and edge-case rules of traditional darts.
 */

// ---------------------------------------------------------------------------
// Impossible Scores
// ---------------------------------------------------------------------------

/**
 * Impossible darts scores that cannot be achieved with three darts.
 *
 * In standard darts, the maximum three-dart score is 180 (triple-20 x 3).
 * Certain totals below 180 are mathematically unreachable because no
 * combination of three single, double, or treble throws can produce them.
 *
 * In Footy 501, if a player's remaining score lands on one of these
 * values after a turn, they are immediately bust -- the turn is void and
 * their score reverts to what it was before the turn.
 */
export const IMPOSSIBLE_SCORES: ReadonlySet<number> = new Set([
  163, 166, 169, 172, 173, 175, 176, 178, 179,
]);

// ---------------------------------------------------------------------------
// Bogey Numbers
// ---------------------------------------------------------------------------

/**
 * Bogey numbers -- scores from which a standard darts finish is impossible.
 *
 * A "bogey number" is a remaining score that cannot be checked out (finished)
 * with three darts ending on a double. This is an optional rule: when
 * enabled, landing on a bogey number triggers an automatic bust.
 *
 * The set includes all impossible scores plus additional totals (e.g. 159,
 * 162, 165) where no valid three-dart checkout path exists.
 */
export const BOGEY_NUMBERS: ReadonlySet<number> = new Set([
  159, 162, 163, 165, 166, 168, 169,
  171, 172, 173, 174, 175, 176, 177, 178, 179, 180,
]);

// ---------------------------------------------------------------------------
// Scoring Limits
// ---------------------------------------------------------------------------

/**
 * Maximum points a player can score in a single turn.
 *
 * Mirrors the darts maximum of 180 (three treble-20s). In Footy 501
 * this is the upper bound for the stat value awarded by a correct answer.
 */
export const MAX_STAT_VALUE = 180 as const;

// ---------------------------------------------------------------------------
// Checkout Range
// ---------------------------------------------------------------------------

/**
 * Minimum remaining score that still counts as a valid checkout.
 *
 * In Footy 501 a player may "overshoot" zero by up to 10 points and
 * still finish the leg. This adds a forgiving margin that keeps the game
 * exciting without letting players blow past the target arbitrarily.
 */
export const CHECKOUT_MIN = -10 as const;

/**
 * Target remaining score for a successful checkout.
 *
 * A player must reach 0 (or below, down to CHECKOUT_MIN) to win a leg.
 */
export const CHECKOUT_MAX = 0 as const;

// ---------------------------------------------------------------------------
// Starting Scores
// ---------------------------------------------------------------------------

/**
 * Default starting score for a standard leg.
 *
 * 501 is the traditional starting score in professional darts and the
 * namesake of this game.
 */
export const DEFAULT_TARGET = 501 as const;

/**
 * Starting score used in tiebreaker legs.
 *
 * A shorter target keeps tiebreakers fast-paced and decisive.
 */
export const TIEBREAKER_TARGET = 50 as const;

/**
 * All valid starting targets that can be selected for a match.
 *
 * Mirrors common darts game variants (301, 501, 701) plus an extended
 * 1001 format for longer sessions.
 */
export const VALID_TARGETS = [301, 501, 701, 1001] as const;

/** Union type of permitted starting targets. */
export type ValidTarget = (typeof VALID_TARGETS)[number];

// ---------------------------------------------------------------------------
// Timer Defaults
// ---------------------------------------------------------------------------

/**
 * Default time (in seconds) a player has to answer a question.
 */
export const DEFAULT_TIMER_DURATION = 45 as const;

/**
 * Reduced timer duration (in seconds) used in speed-round modes.
 */
export const SPEED_TIMER_DURATION = 15 as const;

// ---------------------------------------------------------------------------
// Timeout Escalation
// ---------------------------------------------------------------------------

/**
 * Escalating timer penalties for consecutive timeouts.
 *
 * Each entry represents the timer duration (in seconds) assigned after
 * the Nth consecutive timeout:
 *
 * | Timeout # | Effect                                   |
 * |-----------|------------------------------------------|
 * | 1st       | Forfeit turn, keep 45 s timer            |
 * | 2nd       | Forfeit turn, keep 45 s timer            |
 * | 3rd       | Forfeit turn, reduce timer to 30 s       |
 * | 4th       | Forfeit turn, reduce timer to 15 s       |
 * | 5th+      | Forfeit entire match (see MAX_CONSECUTIVE_TIMEOUTS) |
 *
 * The array is zero-indexed: `TIMEOUT_ESCALATION[0]` is the timer after
 * the first timeout.
 */
export const TIMEOUT_ESCALATION = [45, 45, 30, 15] as const;

/**
 * Number of consecutive timeouts that triggers an automatic match forfeit.
 *
 * When a player times out this many turns in a row, they lose the match.
 * The value matches the length of TIMEOUT_ESCALATION -- the 4th timeout
 * is the last before forfeit.
 */
export const MAX_CONSECUTIVE_TIMEOUTS = 4 as const;

// ---------------------------------------------------------------------------
// Match Formats
// ---------------------------------------------------------------------------

/**
 * Valid "best-of" match formats.
 *
 * - Best of 1: single-leg match
 * - Best of 3: first to 2 legs
 * - Best of 5: first to 3 legs
 */
export const VALID_MATCH_FORMATS = [1, 3, 5] as const;

/** Union type of permitted best-of formats. */
export type MatchFormat = (typeof VALID_MATCH_FORMATS)[number];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Calculate the number of legs a player must win to clinch the match.
 *
 * @param bestOf - The best-of format (1, 3, or 5).
 * @returns The number of legs required to win (e.g. 1, 2, or 3).
 *
 * @example
 * ```ts
 * legsToWin(5); // 3
 * legsToWin(3); // 2
 * legsToWin(1); // 1
 * ```
 */
export function legsToWin(bestOf: MatchFormat): number {
  return Math.ceil(bestOf / 2);
}
