// ============================================================================
// Footy 501 Game Engine - Timer Escalation Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  getNextTimerDuration,
  updateTimeoutState,
  isMatchForfeit,
  getTimeoutMessage,
} from "../timer.js";

// ---------------------------------------------------------------------------
// getNextTimerDuration
// ---------------------------------------------------------------------------

describe("getNextTimerDuration", () => {
  it("returns 45 for 0 consecutive timeouts (1st timeout)", () => {
    expect(getNextTimerDuration(0)).toBe(45);
  });

  it("returns 45 for 1 consecutive timeout (2nd timeout)", () => {
    expect(getNextTimerDuration(1)).toBe(45);
  });

  it("returns 30 for 2 consecutive timeouts (3rd timeout)", () => {
    expect(getNextTimerDuration(2)).toBe(30);
  });

  it("returns 15 for 3 consecutive timeouts (4th timeout)", () => {
    expect(getNextTimerDuration(3)).toBe(15);
  });

  it("returns null for 4 consecutive timeouts (triggers forfeit)", () => {
    expect(getNextTimerDuration(4)).toBeNull();
  });

  it("returns null for 5 consecutive timeouts", () => {
    expect(getNextTimerDuration(5)).toBeNull();
  });

  it("returns null for any value >= 4", () => {
    expect(getNextTimerDuration(10)).toBeNull();
    expect(getNextTimerDuration(100)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateTimeoutState — when the player times out
// ---------------------------------------------------------------------------

describe("updateTimeoutState – timedOut = true", () => {
  it("increments consecutiveTimeouts from 0 to 1", () => {
    const state = updateTimeoutState(0, true);
    expect(state.consecutiveTimeouts).toBe(1);
  });

  it("returns timer duration of 45 after 1st timeout", () => {
    const state = updateTimeoutState(0, true);
    expect(state.timerDuration).toBe(45);
  });

  it("increments consecutiveTimeouts from 1 to 2", () => {
    const state = updateTimeoutState(1, true);
    expect(state.consecutiveTimeouts).toBe(2);
  });

  it("returns timer duration of 30 after 2nd consecutive timeout", () => {
    const state = updateTimeoutState(1, true);
    expect(state.timerDuration).toBe(30);
  });

  it("increments consecutiveTimeouts from 2 to 3", () => {
    const state = updateTimeoutState(2, true);
    expect(state.consecutiveTimeouts).toBe(3);
  });

  it("returns timer duration of 15 after 3rd consecutive timeout", () => {
    const state = updateTimeoutState(2, true);
    expect(state.timerDuration).toBe(15);
  });

  it("increments consecutiveTimeouts from 3 to 4", () => {
    const state = updateTimeoutState(3, true);
    expect(state.consecutiveTimeouts).toBe(4);
  });

  it("returns null timer after 4th consecutive timeout (forfeit)", () => {
    const state = updateTimeoutState(3, true);
    expect(state.timerDuration).toBeNull();
  });

  it("returns null timer when already at forfeit threshold", () => {
    const state = updateTimeoutState(4, true);
    expect(state.timerDuration).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateTimeoutState — when the player answers in time
// ---------------------------------------------------------------------------

describe("updateTimeoutState – timedOut = false", () => {
  it("resets consecutiveTimeouts to 0", () => {
    const state = updateTimeoutState(3, false);
    expect(state.consecutiveTimeouts).toBe(0);
  });

  it("restores timerDuration to 45 (default)", () => {
    const state = updateTimeoutState(3, false);
    expect(state.timerDuration).toBe(45);
  });

  it("resets to 0 even if already at 0", () => {
    const state = updateTimeoutState(0, false);
    expect(state.consecutiveTimeouts).toBe(0);
    expect(state.timerDuration).toBe(45);
  });

  it("returns an immutable-style new object (does not mutate)", () => {
    const initial = 2;
    const state = updateTimeoutState(initial, false);
    // The input value should not change (pure function)
    expect(initial).toBe(2);
    expect(state.consecutiveTimeouts).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Non-consecutive timeout reset behaviour
// ---------------------------------------------------------------------------

describe("non-consecutive timeout reset", () => {
  it("resets count to 1 after timeout → answer → timeout sequence", () => {
    // First timeout
    const afterFirst = updateTimeoutState(0, true);
    expect(afterFirst.consecutiveTimeouts).toBe(1);

    // Player answers correctly
    const afterAnswer = updateTimeoutState(afterFirst.consecutiveTimeouts, false);
    expect(afterAnswer.consecutiveTimeouts).toBe(0);

    // Another timeout — treated as first consecutive again
    const afterSecond = updateTimeoutState(afterAnswer.consecutiveTimeouts, true);
    expect(afterSecond.consecutiveTimeouts).toBe(1);
    expect(afterSecond.timerDuration).toBe(45);
  });

  it("after two timeouts then an answer, resets fully", () => {
    const after1 = updateTimeoutState(0, true);  // count=1
    const after2 = updateTimeoutState(after1.consecutiveTimeouts, true);  // count=2, timer=30
    const reset = updateTimeoutState(after2.consecutiveTimeouts, false);

    expect(reset.consecutiveTimeouts).toBe(0);
    expect(reset.timerDuration).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// isMatchForfeit
// ---------------------------------------------------------------------------

describe("isMatchForfeit", () => {
  it("returns false for 0 consecutive timeouts", () => {
    expect(isMatchForfeit(0)).toBe(false);
  });

  it("returns false for 1 consecutive timeout", () => {
    expect(isMatchForfeit(1)).toBe(false);
  });

  it("returns false for 2 consecutive timeouts", () => {
    expect(isMatchForfeit(2)).toBe(false);
  });

  it("returns false for 3 consecutive timeouts", () => {
    expect(isMatchForfeit(3)).toBe(false);
  });

  it("returns true for exactly 4 consecutive timeouts", () => {
    expect(isMatchForfeit(4)).toBe(true);
  });

  it("returns true for 5 consecutive timeouts", () => {
    expect(isMatchForfeit(5)).toBe(true);
  });

  it("returns true for any value >= 4", () => {
    expect(isMatchForfeit(10)).toBe(true);
    expect(isMatchForfeit(100)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getTimeoutMessage
// ---------------------------------------------------------------------------

describe("getTimeoutMessage", () => {
  it("returns a turn-forfeited message keeping 45s for count=1", () => {
    const msg = getTimeoutMessage(1);
    expect(msg).toContain("45");
    // Specifically it should mention timer remains at 45s
    expect(msg).toMatch(/45s/);
  });

  it("returns a turn-forfeited message keeping 45s for count=2", () => {
    const msg = getTimeoutMessage(2);
    // count=2 → next duration is 30s, so message should mention 30
    expect(msg).toContain("30");
    expect(msg).toMatch(/30s/);
  });

  it("returns a turn-forfeited message with timer reduced to 15s for count=3", () => {
    const msg = getTimeoutMessage(3);
    expect(msg).toContain("15");
    expect(msg).toMatch(/15s/);
  });

  it("returns a match forfeited message for count=4", () => {
    const msg = getTimeoutMessage(4);
    expect(msg).toContain("forfeited");
    expect(msg).toContain("4");
  });

  it("includes the max consecutive timeout count in the forfeit message", () => {
    const msg = getTimeoutMessage(4);
    expect(msg).toContain("4");
  });

  it("returns a forfeit message for count > 4", () => {
    const msg = getTimeoutMessage(10);
    expect(msg).toContain("forfeited");
  });

  it("count=1 message mentions turn forfeiture, not match forfeiture", () => {
    const msg = getTimeoutMessage(1);
    expect(msg.toLowerCase()).toContain("turn");
    expect(msg.toLowerCase()).not.toContain("match");
  });
});
