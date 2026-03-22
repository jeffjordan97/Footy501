// ============================================================================
// Footy 501 Game Engine - Barrel Export
// ============================================================================

export * from "./types.js";
export {
  IMPOSSIBLE_SCORES,
  BOGEY_NUMBERS,
  MAX_STAT_VALUE,
  CHECKOUT_MIN,
  CHECKOUT_MAX,
  DEFAULT_TARGET,
  TIEBREAKER_TARGET,
  VALID_TARGETS,
  type ValidTarget,
  DEFAULT_TIMER_DURATION,
  SPEED_TIMER_DURATION,
  TIMEOUT_ESCALATION,
  MAX_CONSECUTIVE_TIMEOUTS,
  VALID_MATCH_FORMATS,
  legsToWin,
  // MatchFormat intentionally omitted -- re-exported from types.js
} from "./rules.js";
export * from "./scoring.js";
export * from "./timer.js";
export * from "./engine.js";
