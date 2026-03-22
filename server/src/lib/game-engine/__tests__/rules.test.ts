// ============================================================================
// Footy 501 Game Engine - Rules Constants Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  IMPOSSIBLE_SCORES,
  BOGEY_NUMBERS,
  MAX_STAT_VALUE,
  CHECKOUT_MIN,
  CHECKOUT_MAX,
  DEFAULT_TARGET,
  TIEBREAKER_TARGET,
  VALID_TARGETS,
  DEFAULT_TIMER_DURATION,
  SPEED_TIMER_DURATION,
  TIMEOUT_ESCALATION,
  MAX_CONSECUTIVE_TIMEOUTS,
  VALID_MATCH_FORMATS,
  legsToWin,
} from "../rules.js";

// ---------------------------------------------------------------------------
// IMPOSSIBLE_SCORES
// ---------------------------------------------------------------------------

describe("IMPOSSIBLE_SCORES", () => {
  it("contains exactly 9 values", () => {
    expect(IMPOSSIBLE_SCORES.size).toBe(9);
  });

  it("contains every known impossible darts score", () => {
    const expected = [163, 166, 169, 172, 173, 175, 176, 178, 179];
    for (const score of expected) {
      expect(IMPOSSIBLE_SCORES.has(score)).toBe(true);
    }
  });

  it("does not contain borderline non-impossible scores", () => {
    const notImpossible = [162, 164, 167, 170, 171, 174, 177, 180];
    for (const score of notImpossible) {
      expect(IMPOSSIBLE_SCORES.has(score)).toBe(false);
    }
  });

  it("does not contain zero or negative values", () => {
    expect(IMPOSSIBLE_SCORES.has(0)).toBe(false);
    expect(IMPOSSIBLE_SCORES.has(-1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BOGEY_NUMBERS
// ---------------------------------------------------------------------------

describe("BOGEY_NUMBERS", () => {
  it("contains all impossible scores", () => {
    for (const score of IMPOSSIBLE_SCORES) {
      expect(BOGEY_NUMBERS.has(score)).toBe(true);
    }
  });

  it("contains additional bogey entries beyond impossible scores", () => {
    // Bogey numbers extend impossible scores with extra values
    expect(BOGEY_NUMBERS.size).toBeGreaterThan(IMPOSSIBLE_SCORES.size);
  });

  it("contains the documented bogey extras: 159, 162, 165, 168", () => {
    for (const extra of [159, 162, 165, 168]) {
      expect(BOGEY_NUMBERS.has(extra)).toBe(true);
    }
  });

  it("contains 171 through 180 inclusive", () => {
    for (let i = 171; i <= 180; i++) {
      expect(BOGEY_NUMBERS.has(i)).toBe(true);
    }
  });

  it("does not contain 158 or other non-bogey scores", () => {
    expect(BOGEY_NUMBERS.has(158)).toBe(false);
    expect(BOGEY_NUMBERS.has(160)).toBe(false);
    expect(BOGEY_NUMBERS.has(100)).toBe(false);
    expect(BOGEY_NUMBERS.has(0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scoring Limit Constants
// ---------------------------------------------------------------------------

describe("MAX_STAT_VALUE", () => {
  it("equals 180", () => {
    expect(MAX_STAT_VALUE).toBe(180);
  });
});

describe("CHECKOUT_MIN", () => {
  it("equals -10", () => {
    expect(CHECKOUT_MIN).toBe(-10);
  });
});

describe("CHECKOUT_MAX", () => {
  it("equals 0", () => {
    expect(CHECKOUT_MAX).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Starting Score Constants
// ---------------------------------------------------------------------------

describe("DEFAULT_TARGET", () => {
  it("equals 501", () => {
    expect(DEFAULT_TARGET).toBe(501);
  });
});

describe("TIEBREAKER_TARGET", () => {
  it("equals 50", () => {
    expect(TIEBREAKER_TARGET).toBe(50);
  });
});

describe("VALID_TARGETS", () => {
  it("contains 301, 501, 701, 1001", () => {
    expect(VALID_TARGETS).toEqual([301, 501, 701, 1001]);
  });

  it("has 4 elements", () => {
    expect(VALID_TARGETS.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Timer Constants
// ---------------------------------------------------------------------------

describe("DEFAULT_TIMER_DURATION", () => {
  it("equals 45", () => {
    expect(DEFAULT_TIMER_DURATION).toBe(45);
  });
});

describe("SPEED_TIMER_DURATION", () => {
  it("equals 15", () => {
    expect(SPEED_TIMER_DURATION).toBe(15);
  });
});

describe("TIMEOUT_ESCALATION", () => {
  it("has 4 entries", () => {
    expect(TIMEOUT_ESCALATION.length).toBe(4);
  });

  it("index 0 is 45 (1st timeout keeps full timer)", () => {
    expect(TIMEOUT_ESCALATION[0]).toBe(45);
  });

  it("index 1 is 45 (2nd timeout keeps full timer)", () => {
    expect(TIMEOUT_ESCALATION[1]).toBe(45);
  });

  it("index 2 is 30 (3rd timeout reduces timer)", () => {
    expect(TIMEOUT_ESCALATION[2]).toBe(30);
  });

  it("index 3 is 15 (4th timeout reduces to speed timer)", () => {
    expect(TIMEOUT_ESCALATION[3]).toBe(15);
  });
});

describe("MAX_CONSECUTIVE_TIMEOUTS", () => {
  it("equals 4", () => {
    expect(MAX_CONSECUTIVE_TIMEOUTS).toBe(4);
  });

  it("equals the length of TIMEOUT_ESCALATION", () => {
    expect(MAX_CONSECUTIVE_TIMEOUTS).toBe(TIMEOUT_ESCALATION.length);
  });
});

// ---------------------------------------------------------------------------
// Match Formats
// ---------------------------------------------------------------------------

describe("VALID_MATCH_FORMATS", () => {
  it("contains 1, 3, 5", () => {
    expect(VALID_MATCH_FORMATS).toEqual([1, 3, 5]);
  });
});

// ---------------------------------------------------------------------------
// legsToWin
// ---------------------------------------------------------------------------

describe("legsToWin", () => {
  it("returns 1 for best-of-1", () => {
    expect(legsToWin(1)).toBe(1);
  });

  it("returns 2 for best-of-3", () => {
    expect(legsToWin(3)).toBe(2);
  });

  it("returns 3 for best-of-5", () => {
    expect(legsToWin(5)).toBe(3);
  });
});
