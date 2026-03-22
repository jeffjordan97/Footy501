// ============================================================================
// Footy 501 Game Engine - Scoring Logic Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  isOver180,
  isImpossibleScore,
  isBogeyNumber,
  isInCheckoutRange,
  isBustBelowCheckout,
  calculateNewScore,
  evaluateAnswer,
  getBustMessage,
} from "../scoring.js";
import { TurnResult } from "../types.js";

// ---------------------------------------------------------------------------
// isOver180
// ---------------------------------------------------------------------------

describe("isOver180", () => {
  it("returns true for 181", () => {
    expect(isOver180(181)).toBe(true);
  });

  it("returns true for 200", () => {
    expect(isOver180(200)).toBe(true);
  });

  it("returns true for 999", () => {
    expect(isOver180(999)).toBe(true);
  });

  it("returns false for exactly 180 (boundary – valid max)", () => {
    expect(isOver180(180)).toBe(false);
  });

  it("returns false for 179", () => {
    expect(isOver180(179)).toBe(false);
  });

  it("returns false for 1", () => {
    expect(isOver180(1)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isOver180(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isImpossibleScore
// ---------------------------------------------------------------------------

describe("isImpossibleScore", () => {
  const impossibleScores = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  const possibleScores = [164, 170, 100, 0, 1, 180, 162, 167, 174, 177];

  it.each(impossibleScores)("returns true for %i", (score) => {
    expect(isImpossibleScore(score)).toBe(true);
  });

  it.each(possibleScores)("returns false for %i", (score) => {
    expect(isImpossibleScore(score)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBogeyNumber
// ---------------------------------------------------------------------------

describe("isBogeyNumber", () => {
  const bogeyNumbers = [159, 162, 165, 168, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180];

  it.each(bogeyNumbers)("returns true for %i", (score) => {
    expect(isBogeyNumber(score)).toBe(true);
  });

  it("returns false for 158", () => {
    expect(isBogeyNumber(158)).toBe(false);
  });

  it("returns false for 160", () => {
    expect(isBogeyNumber(160)).toBe(false);
  });

  it("returns false for 100", () => {
    expect(isBogeyNumber(100)).toBe(false);
  });

  it("returns false for 0", () => {
    expect(isBogeyNumber(0)).toBe(false);
  });

  it("returns false for 181 (above range)", () => {
    expect(isBogeyNumber(181)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isInCheckoutRange
// ---------------------------------------------------------------------------

describe("isInCheckoutRange", () => {
  it("returns true for 0 (exact checkout)", () => {
    expect(isInCheckoutRange(0)).toBe(true);
  });

  it("returns true for -1", () => {
    expect(isInCheckoutRange(-1)).toBe(true);
  });

  it("returns true for -5", () => {
    expect(isInCheckoutRange(-5)).toBe(true);
  });

  it("returns true for -10 (minimum boundary)", () => {
    expect(isInCheckoutRange(-10)).toBe(true);
  });

  it("returns false for 1 (not yet at checkout)", () => {
    expect(isInCheckoutRange(1)).toBe(false);
  });

  it("returns false for -11 (one below minimum)", () => {
    expect(isInCheckoutRange(-11)).toBe(false);
  });

  it("returns false for 100", () => {
    expect(isInCheckoutRange(100)).toBe(false);
  });

  it("returns false for large positive values", () => {
    expect(isInCheckoutRange(501)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isBustBelowCheckout
// ---------------------------------------------------------------------------

describe("isBustBelowCheckout", () => {
  it("returns true when result would go below -10", () => {
    // 20 - 31 = -11
    expect(isBustBelowCheckout(20, 31)).toBe(true);
  });

  it("returns true for significant overshoot", () => {
    // 50 - 100 = -50
    expect(isBustBelowCheckout(50, 100)).toBe(true);
  });

  it("returns false when result equals exactly -10 (boundary)", () => {
    // 10 - 20 = -10 (valid checkout)
    expect(isBustBelowCheckout(10, 20)).toBe(false);
  });

  it("returns false when result is within checkout range", () => {
    // 100 - 105 = -5
    expect(isBustBelowCheckout(100, 105)).toBe(false);
  });

  it("returns false when result is 0", () => {
    expect(isBustBelowCheckout(50, 50)).toBe(false);
  });

  it("returns false when result is positive", () => {
    expect(isBustBelowCheckout(200, 100)).toBe(false);
  });

  it("returns true when currentScore - statValue = -11", () => {
    // 1 - 12 = -11
    expect(isBustBelowCheckout(1, 12)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateNewScore
// ---------------------------------------------------------------------------

describe("calculateNewScore", () => {
  it("subtracts statValue from currentScore", () => {
    expect(calculateNewScore(501, 100)).toBe(401);
  });

  it("handles zero statValue (score unchanged)", () => {
    expect(calculateNewScore(300, 0)).toBe(300);
  });

  it("produces a negative result when statValue exceeds currentScore", () => {
    expect(calculateNewScore(10, 15)).toBe(-5);
  });

  it("handles exact checkout to 0", () => {
    expect(calculateNewScore(50, 50)).toBe(0);
  });

  it("handles overshoot to negative", () => {
    expect(calculateNewScore(5, 10)).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// evaluateAnswer
// ---------------------------------------------------------------------------

describe("evaluateAnswer", () => {
  const noBogey = { enableBogeyNumbers: false };
  const withBogey = { enableBogeyNumbers: true };

  // --- BUST: over 180 ---

  describe("stat value over 180", () => {
    it("returns BUST_OVER_180 for stat of 181", () => {
      const result = evaluateAnswer(501, 181, noBogey);
      expect(result.result).toBe(TurnResult.BUST_OVER_180);
    });

    it("keeps score unchanged on BUST_OVER_180", () => {
      const result = evaluateAnswer(501, 181, noBogey);
      expect(result.newScore).toBe(501);
    });

    it("returns BUST_OVER_180 for stat of 999", () => {
      const result = evaluateAnswer(300, 999, noBogey);
      expect(result.result).toBe(TurnResult.BUST_OVER_180);
      expect(result.newScore).toBe(300);
    });

    it("does NOT bust on a stat of exactly 180", () => {
      const result = evaluateAnswer(501, 180, noBogey);
      expect(result.result).not.toBe(TurnResult.BUST_OVER_180);
    });
  });

  // --- BUST: below checkout ---

  describe("score would go below -10", () => {
    it("returns BUST_BELOW_CHECKOUT", () => {
      // 15 - 30 = -15 (below -10)
      const result = evaluateAnswer(15, 30, noBogey);
      expect(result.result).toBe(TurnResult.BUST_BELOW_CHECKOUT);
    });

    it("keeps score unchanged on BUST_BELOW_CHECKOUT", () => {
      const result = evaluateAnswer(15, 30, noBogey);
      expect(result.newScore).toBe(15);
    });

    it("does NOT bust when result is exactly -10", () => {
      // 10 - 20 = -10 (valid checkout boundary)
      const result = evaluateAnswer(10, 20, noBogey);
      expect(result.result).toBe(TurnResult.CHECKOUT);
    });
  });

  // --- BUST: impossible score ---

  describe("remaining score is an impossible darts score", () => {
    it("returns BUST_IMPOSSIBLE_SCORE when new score is 163", () => {
      // 263 - 100 = 163
      const result = evaluateAnswer(263, 100, noBogey);
      expect(result.result).toBe(TurnResult.BUST_IMPOSSIBLE_SCORE);
    });

    it("keeps score unchanged on BUST_IMPOSSIBLE_SCORE", () => {
      const result = evaluateAnswer(263, 100, noBogey);
      expect(result.newScore).toBe(263);
    });

    it.each([166, 169, 172, 173, 175, 176, 178, 179])(
      "returns BUST_IMPOSSIBLE_SCORE when remaining is %i",
      (impossibleScore) => {
        const startScore = impossibleScore + 50;
        const result = evaluateAnswer(startScore, 50, noBogey);
        expect(result.result).toBe(TurnResult.BUST_IMPOSSIBLE_SCORE);
        expect(result.newScore).toBe(startScore);
      },
    );
  });

  // --- BUST: bogey number (optional rule) ---

  describe("remaining score is a bogey number", () => {
    it("returns BUST_BOGEY_NUMBER when bogey rule is enabled and new score is 159", () => {
      // 259 - 100 = 159
      const result = evaluateAnswer(259, 100, withBogey);
      expect(result.result).toBe(TurnResult.BUST_BOGEY_NUMBER);
    });

    it("keeps score unchanged on BUST_BOGEY_NUMBER", () => {
      const result = evaluateAnswer(259, 100, withBogey);
      expect(result.newScore).toBe(259);
    });

    it("does NOT bust on bogey number when rule is disabled", () => {
      // 259 - 100 = 159 (bogey), but rule disabled → should be VALID
      const result = evaluateAnswer(259, 100, noBogey);
      expect(result.result).toBe(TurnResult.VALID);
    });

    it("returns BUST_BOGEY_NUMBER for 180 when bogey rule is enabled", () => {
      // 280 - 100 = 180 (in bogey set)
      const result = evaluateAnswer(280, 100, withBogey);
      expect(result.result).toBe(TurnResult.BUST_BOGEY_NUMBER);
    });

    it("bogey rule does not override impossible score detection", () => {
      // 263 - 100 = 163 (impossible score, checked before bogey)
      const result = evaluateAnswer(263, 100, withBogey);
      expect(result.result).toBe(TurnResult.BUST_IMPOSSIBLE_SCORE);
    });
  });

  // --- CHECKOUT ---

  describe("score reaches checkout range", () => {
    it("returns CHECKOUT when score reaches exactly 0", () => {
      const result = evaluateAnswer(100, 100, noBogey);
      expect(result.result).toBe(TurnResult.CHECKOUT);
      expect(result.newScore).toBe(0);
    });

    it("returns CHECKOUT when score reaches -5", () => {
      const result = evaluateAnswer(100, 105, noBogey);
      expect(result.result).toBe(TurnResult.CHECKOUT);
      expect(result.newScore).toBe(-5);
    });

    it("returns CHECKOUT when score reaches -10 (minimum checkout)", () => {
      const result = evaluateAnswer(100, 110, noBogey);
      expect(result.result).toBe(TurnResult.CHECKOUT);
      expect(result.newScore).toBe(-10);
    });

    it("preserves the negative new score on checkout", () => {
      const result = evaluateAnswer(50, 55, noBogey);
      expect(result.newScore).toBe(-5);
    });
  });

  // --- VALID ---

  describe("valid deduction (score stays above checkout range)", () => {
    it("returns VALID and the new score", () => {
      const result = evaluateAnswer(501, 100, noBogey);
      expect(result.result).toBe(TurnResult.VALID);
      expect(result.newScore).toBe(401);
    });

    it("returns VALID for a score of 1 remaining after deduction", () => {
      const result = evaluateAnswer(101, 100, noBogey);
      expect(result.result).toBe(TurnResult.VALID);
      expect(result.newScore).toBe(1);
    });

    it("returns VALID and score is unchanged when stat is 0", () => {
      const result = evaluateAnswer(200, 0, noBogey);
      expect(result.result).toBe(TurnResult.VALID);
      expect(result.newScore).toBe(200);
    });
  });

  // --- Edge cases ---

  describe("edge cases", () => {
    it("stat of exactly 180 is valid (not a bust)", () => {
      // 501 - 180 = 321 → VALID
      const result = evaluateAnswer(501, 180, noBogey);
      expect(result.result).toBe(TurnResult.VALID);
      expect(result.newScore).toBe(321);
    });

    it("stat of 0 with impossible remaining score still busts", () => {
      // Start at 163 (impossible), subtract 0 → still 163
      const result = evaluateAnswer(163, 0, noBogey);
      expect(result.result).toBe(TurnResult.BUST_IMPOSSIBLE_SCORE);
      expect(result.newScore).toBe(163);
    });

    it("BUST_OVER_180 takes priority over BUST_BELOW_CHECKOUT", () => {
      // stat 200 is over 180, and 5 - 200 would also be below checkout
      const result = evaluateAnswer(5, 200, noBogey);
      expect(result.result).toBe(TurnResult.BUST_OVER_180);
    });

    it("BUST_BELOW_CHECKOUT takes priority over BUST_IMPOSSIBLE_SCORE", () => {
      // A score that would be impossible AND below checkout → below checkout wins
      // e.g. start=10, stat=174 → 10-174=-164 → below -10
      const result = evaluateAnswer(10, 174, noBogey);
      expect(result.result).toBe(TurnResult.BUST_BELOW_CHECKOUT);
    });
  });
});

// ---------------------------------------------------------------------------
// getBustMessage
// ---------------------------------------------------------------------------

describe("getBustMessage", () => {
  it("returns a message for BUST_OVER_180 containing the stat value", () => {
    const msg = getBustMessage(TurnResult.BUST_OVER_180, 181, 501);
    expect(msg).not.toBeNull();
    expect(msg).toContain("181");
  });

  it("returns a message for BUST_IMPOSSIBLE_SCORE containing the resulting score", () => {
    // 263 - 100 = 163
    const msg = getBustMessage(TurnResult.BUST_IMPOSSIBLE_SCORE, 100, 263);
    expect(msg).not.toBeNull();
    expect(msg).toContain("163");
  });

  it("returns a message for BUST_BELOW_CHECKOUT containing -10", () => {
    const msg = getBustMessage(TurnResult.BUST_BELOW_CHECKOUT, 30, 15);
    expect(msg).not.toBeNull();
    expect(msg).toContain("-10");
  });

  it("returns a message for BUST_BOGEY_NUMBER containing the resulting score", () => {
    // 259 - 100 = 159
    const msg = getBustMessage(TurnResult.BUST_BOGEY_NUMBER, 100, 259);
    expect(msg).not.toBeNull();
    expect(msg).toContain("159");
  });

  it("returns null for VALID", () => {
    expect(getBustMessage(TurnResult.VALID, 100, 501)).toBeNull();
  });

  it("returns null for CHECKOUT", () => {
    expect(getBustMessage(TurnResult.CHECKOUT, 50, 50)).toBeNull();
  });

  it("returns null for TIMEOUT", () => {
    expect(getBustMessage(TurnResult.TIMEOUT, 0, 300)).toBeNull();
  });
});
