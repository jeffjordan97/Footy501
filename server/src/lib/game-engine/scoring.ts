// ============================================================================
// Footy 501 Game Engine - Scoring Logic (Pure Functions)
// ============================================================================

import {
  IMPOSSIBLE_SCORES,
  BOGEY_NUMBERS,
  MAX_STAT_VALUE,
  CHECKOUT_MIN,
  CHECKOUT_MAX,
} from "./rules.js";
import { TurnResult } from "./types.js";

// --- Predicate Functions ---

export const isOver180 = (statValue: number): boolean =>
  statValue > MAX_STAT_VALUE;

export const isImpossibleScore = (remainingScore: number): boolean =>
  IMPOSSIBLE_SCORES.has(remainingScore);

export const isBogeyNumber = (remainingScore: number): boolean =>
  BOGEY_NUMBERS.has(remainingScore);

export const isInCheckoutRange = (score: number): boolean =>
  score >= CHECKOUT_MIN && score <= CHECKOUT_MAX;

export const isBustBelowCheckout = (
  currentScore: number,
  statValue: number,
): boolean => currentScore - statValue < CHECKOUT_MIN;

// --- Score Calculation ---

export const calculateNewScore = (
  currentScore: number,
  statValue: number,
): number => currentScore - statValue;

// --- Main Scoring Function ---

interface EvaluateAnswerOptions {
  readonly enableBogeyNumbers: boolean;
}

interface EvaluateAnswerResult {
  readonly result: TurnResult;
  readonly newScore: number;
}

export const evaluateAnswer = (
  currentScore: number,
  statValue: number,
  options: EvaluateAnswerOptions,
): EvaluateAnswerResult => {
  if (isOver180(statValue)) {
    return { result: TurnResult.BUST_OVER_180, newScore: currentScore };
  }

  const newScore = calculateNewScore(currentScore, statValue);

  if (newScore < CHECKOUT_MIN) {
    return { result: TurnResult.BUST_BELOW_CHECKOUT, newScore: currentScore };
  }

  if (isImpossibleScore(newScore)) {
    return {
      result: TurnResult.BUST_IMPOSSIBLE_SCORE,
      newScore: currentScore,
    };
  }

  if (options.enableBogeyNumbers && isBogeyNumber(newScore)) {
    return { result: TurnResult.BUST_BOGEY_NUMBER, newScore: currentScore };
  }

  if (isInCheckoutRange(newScore)) {
    return { result: TurnResult.CHECKOUT, newScore };
  }

  return { result: TurnResult.VALID, newScore };
};

// --- Bust Messages ---

export const getBustMessage = (
  result: TurnResult,
  statValue: number,
  currentScore: number,
): string | null => {
  const newScore = currentScore - statValue;

  switch (result) {
    case TurnResult.BUST_OVER_180:
      return `Bust! Stat value ${statValue} exceeds ${MAX_STAT_VALUE}`;
    case TurnResult.BUST_IMPOSSIBLE_SCORE:
      return `Bust! ${newScore} is an impossible darts score`;
    case TurnResult.BUST_BELOW_CHECKOUT:
      return `Bust! Score would go below ${CHECKOUT_MIN}`;
    case TurnResult.BUST_BOGEY_NUMBER:
      return `Bust! ${newScore} is a bogey number`;
    default:
      return null;
  }
};
