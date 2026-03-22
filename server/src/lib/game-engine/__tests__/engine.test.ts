// ============================================================================
// Footy 501 Game Engine - State Machine Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  createMatch,
  createLeg,
  submitAnswer,
  handleTimeout,
  determineLegWinner,
  startNewLeg,
  switchPlayer,
  isMatchComplete,
} from "../engine.js";
import {
  type MatchConfig,
  type MatchState,
  type LegState,
  MatchPhase,
  LegPhase,
  TurnResult,
  MatchFormat,
  TargetScore,
} from "../types.js";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const makeConfig = (
  overrides: Partial<MatchConfig> = {},
): MatchConfig => ({
  id: "test-match-1",
  targetScore: TargetScore.FIVE_OH_ONE,
  statCategory: {
    id: "cat-1",
    name: "Premier League Goals",
    league: "Premier League",
    team: null,
    statType: "GOALS",
  },
  matchFormat: MatchFormat.BEST_OF_1,
  timerDuration: 45,
  enableBogeyNumbers: false,
  tiebreakerTarget: 50,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Helpers to build answers
// ---------------------------------------------------------------------------

let footballerCounter = 0;
const nextId = () => `footballer-${++footballerCounter}`;

const answer = (
  state: MatchState,
  playerIndex: 0 | 1,
  statValue: number,
  footballerId?: string,
  footballerName?: string,
) =>
  submitAnswer(
    state,
    playerIndex,
    footballerId ?? nextId(),
    footballerName ?? "Test Player",
    statValue,
  );

// ---------------------------------------------------------------------------
// switchPlayer
// ---------------------------------------------------------------------------

describe("switchPlayer", () => {
  it("switches 0 to 1", () => {
    expect(switchPlayer(0)).toBe(1);
  });

  it("switches 1 to 0", () => {
    expect(switchPlayer(1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isMatchComplete
// ---------------------------------------------------------------------------

describe("isMatchComplete", () => {
  it("returns false when neither player has won enough legs", () => {
    const state = createMatch(makeConfig({ matchFormat: MatchFormat.BEST_OF_3 }));
    expect(isMatchComplete(state)).toBe(false);
  });

  it("returns true when player 0 has won required legs in best-of-1", () => {
    const state = createMatch(makeConfig({ matchFormat: MatchFormat.BEST_OF_1 }));
    const withWin: MatchState = { ...state, legWins: [1, 0] };
    expect(isMatchComplete(withWin)).toBe(true);
  });

  it("returns true when player 1 has won required legs in best-of-3", () => {
    const state = createMatch(makeConfig({ matchFormat: MatchFormat.BEST_OF_3 }));
    const withWin: MatchState = { ...state, legWins: [0, 2] };
    expect(isMatchComplete(withWin)).toBe(true);
  });

  it("returns false when one player short of required legs in best-of-5", () => {
    const state = createMatch(makeConfig({ matchFormat: MatchFormat.BEST_OF_5 }));
    const notYet: MatchState = { ...state, legWins: [2, 0] };
    expect(isMatchComplete(notYet)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createLeg
// ---------------------------------------------------------------------------

describe("createLeg", () => {
  it("sets legNumber correctly", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.legNumber).toBe(1);
  });

  it("sets both players to targetScore", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.players[0].score).toBe(501);
    expect(leg.players[1].score).toBe(501);
  });

  it("sets timerDuration from parameter", () => {
    const leg = createLeg(1, 501, 30);
    expect(leg.players[0].timerDuration).toBe(30);
    expect(leg.players[1].timerDuration).toBe(30);
  });

  it("starts with empty turns array", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.turns).toHaveLength(0);
  });

  it("starts with empty usedPlayerIds set", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.usedPlayerIds.size).toBe(0);
  });

  it("starts with phase PLAYING", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.phase).toBe(LegPhase.PLAYING);
  });

  it("starts with player 0 as currentPlayerIndex", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.currentPlayerIndex).toBe(0);
  });

  it("starts with closeFinishCheckoutScore as null", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.closeFinishCheckoutScore).toBeNull();
  });

  it("both players start with consecutiveTimeouts of 0", () => {
    const leg = createLeg(1, 501, 45);
    expect(leg.players[0].consecutiveTimeouts).toBe(0);
    expect(leg.players[1].consecutiveTimeouts).toBe(0);
  });

  it("works with non-standard target scores", () => {
    const leg = createLeg(2, 301, 45);
    expect(leg.players[0].score).toBe(301);
    expect(leg.players[1].score).toBe(301);
    expect(leg.legNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// createMatch
// ---------------------------------------------------------------------------

describe("createMatch", () => {
  it("creates match with phase PLAYING", () => {
    const state = createMatch(makeConfig());
    expect(state.phase).toBe(MatchPhase.PLAYING);
  });

  it("both players start at targetScore (501)", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.FIVE_OH_ONE }));
    const leg = state.legs[0];
    expect(leg.players[0].score).toBe(501);
    expect(leg.players[1].score).toBe(501);
  });

  it("first leg initialized with legNumber 1", () => {
    const state = createMatch(makeConfig());
    expect(state.legs[0].legNumber).toBe(1);
  });

  it("legWins starts at [0, 0]", () => {
    const state = createMatch(makeConfig());
    expect(state.legWins[0]).toBe(0);
    expect(state.legWins[1]).toBe(0);
  });

  it("player 0 goes first", () => {
    const state = createMatch(makeConfig());
    expect(state.legs[0].currentPlayerIndex).toBe(0);
  });

  it("currentLegIndex starts at 0", () => {
    const state = createMatch(makeConfig());
    expect(state.currentLegIndex).toBe(0);
  });

  it("winner starts as null", () => {
    const state = createMatch(makeConfig());
    expect(state.winner).toBeNull();
  });

  it("starts with exactly one leg", () => {
    const state = createMatch(makeConfig());
    expect(state.legs).toHaveLength(1);
  });

  it("preserves config reference", () => {
    const config = makeConfig();
    const state = createMatch(config);
    expect(state.config).toBe(config);
  });

  it("uses 301 target score when configured", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    expect(state.legs[0].players[0].score).toBe(301);
    expect(state.legs[0].players[1].score).toBe(301);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer - wrong player guard
// ---------------------------------------------------------------------------

describe("submitAnswer - wrong player guard", () => {
  it("returns state unchanged when wrong player submits", () => {
    const state = createMatch(makeConfig());
    // Player 0 goes first; player 1 tries to submit
    const newState = submitAnswer(state, 1, nextId(), "Player", 50);
    expect(newState).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer - Normal Flow (VALID)
// ---------------------------------------------------------------------------

describe("submitAnswer - normal valid flow", () => {
  it("deducts stat value from the current player's score", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    const leg = newState.legs[0];
    expect(leg.players[0].score).toBe(401);
  });

  it("does not change opponent's score on valid answer", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    const leg = newState.legs[0];
    expect(leg.players[1].score).toBe(501);
  });

  it("switches to other player after valid answer", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    expect(newState.legs[0].currentPlayerIndex).toBe(1);
  });

  it("adds footballer to usedPlayerIds", () => {
    const state = createMatch(makeConfig());
    const id = nextId();
    const newState = submitAnswer(state, 0, id, "Footballer", 100);
    expect(newState.legs[0].usedPlayerIds.has(id)).toBe(true);
  });

  it("records turn in turns array", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    expect(newState.legs[0].turns).toHaveLength(1);
  });

  it("turn records correct result as VALID", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    expect(newState.legs[0].turns[0].result).toBe(TurnResult.VALID);
  });

  it("turn records correct statValue", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 75);
    expect(newState.legs[0].turns[0].statValue).toBe(75);
  });

  it("turn records correct scoreAfter", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 75);
    expect(newState.legs[0].turns[0].scoreAfter).toBe(426);
  });

  it("turn records correct playerIndex", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 100);
    expect(newState.legs[0].turns[0].playerIndex).toBe(0);
  });

  it("resets consecutive timeouts on valid answer", () => {
    // Give player 0 a timeout first to set consecutiveTimeouts > 0
    const state = createMatch(makeConfig());
    const afterTimeout = handleTimeout(state, 0);
    expect(afterTimeout.legs[0].players[0].consecutiveTimeouts).toBe(1);

    // Now player 1 took the turn (after timeout switched), so let player 0 go again
    const afterTimeout2 = handleTimeout(afterTimeout, 1); // skip player 1
    // Back to player 0
    const afterAnswer = answer(afterTimeout2, 0, 50);
    expect(afterAnswer.legs[0].players[0].consecutiveTimeouts).toBe(0);
  });

  it("multiple valid turns accumulate in turns array", () => {
    const state = createMatch(makeConfig());
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 50);
    expect(s3.legs[0].turns).toHaveLength(3);
  });

  it("scores decrement correctly across multiple turns", () => {
    const state = createMatch(makeConfig());
    const s1 = answer(state, 0, 100);  // p0: 401
    const s2 = answer(s1, 1, 80);      // p1: 421
    const s3 = answer(s2, 0, 50);      // p0: 351
    expect(s3.legs[0].players[0].score).toBe(351);
    expect(s3.legs[0].players[1].score).toBe(421);
  });

  it("does not mutate original state", () => {
    const state = createMatch(makeConfig());
    const originalScore = state.legs[0].players[0].score;
    answer(state, 0, 100);
    expect(state.legs[0].players[0].score).toBe(originalScore);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer - Bust Scenarios
// ---------------------------------------------------------------------------

describe("submitAnswer - bust: stat over 180", () => {
  it("score unchanged when stat is 181", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 181);
    expect(newState.legs[0].players[0].score).toBe(501);
  });

  it("records BUST_OVER_180 result", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 181);
    expect(newState.legs[0].turns[0].result).toBe(TurnResult.BUST_OVER_180);
  });

  it("switches player after bust over 180", () => {
    const state = createMatch(makeConfig());
    const newState = answer(state, 0, 181);
    expect(newState.legs[0].currentPlayerIndex).toBe(1);
  });

  it("does NOT add footballer to usedPlayerIds on bust over 180", () => {
    const state = createMatch(makeConfig());
    const id = nextId();
    const newState = submitAnswer(state, 0, id, "Player", 181);
    expect(newState.legs[0].usedPlayerIds.has(id)).toBe(false);
  });
});

describe("submitAnswer - bust: score would go below -10", () => {
  // Reduce p0 to score 5 via three legal turns (max stat is 180)
  // 501 → 321 (stat=180) → 141 (stat=180) → 5 (stat=136)
  // p1 takes dummy stat=1 turns to pass their turn each time
  const buildStateWithP0At5 = (): MatchState => {
    const state = createMatch(makeConfig());
    let s = state;
    s = answer(s, 0, 180); // p0: 321
    s = answer(s, 1, 1);   // p1 dummy
    s = answer(s, 0, 180); // p0: 141
    s = answer(s, 1, 1);   // p1 dummy
    s = answer(s, 0, 136); // p0: 5
    s = answer(s, 1, 1);   // p1 dummy (now it's p0's turn)
    return s;
  };

  it("score unchanged when stat would put score below -10", () => {
    // Player 0 at score 5; stat=20 → 5-20=-15 < -10 → bust
    const s = buildStateWithP0At5();
    expect(s.legs[0].players[0].score).toBe(5);
    const s_bust = answer(s, 0, 20);
    expect(s_bust.legs[0].players[0].score).toBe(5);
  });

  it("records BUST_BELOW_CHECKOUT result", () => {
    const s = buildStateWithP0At5();
    const s_bust = answer(s, 0, 20); // 5-20=-15 < -10 → bust
    const lastTurn = s_bust.legs[0].turns[s_bust.legs[0].turns.length - 1];
    expect(lastTurn.result).toBe(TurnResult.BUST_BELOW_CHECKOUT);
  });

  it("switches player after below-checkout bust", () => {
    const s = buildStateWithP0At5();
    const s_bust = answer(s, 0, 20);
    expect(s_bust.legs[0].currentPlayerIndex).toBe(1);
  });
});

describe("submitAnswer - bust: remaining score is impossible", () => {
  it("score unchanged when remaining score would be an impossible darts score (166)", () => {
    // 501 → need to reach 166 remaining; stat = 501-166 = 335 but that's > 180
    // Use a 301 game: 301 → stat=135 → 166 remaining (impossible)
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const newState = answer(state, 0, 135); // 301-135=166 (impossible)
    expect(newState.legs[0].players[0].score).toBe(301);
  });

  it("records BUST_IMPOSSIBLE_SCORE result", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const newState = answer(state, 0, 135); // 301-135=166 (impossible)
    expect(newState.legs[0].turns[0].result).toBe(TurnResult.BUST_IMPOSSIBLE_SCORE);
  });

  it("switches player after impossible score bust", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const newState = answer(state, 0, 135);
    expect(newState.legs[0].currentPlayerIndex).toBe(1);
  });
});

describe("submitAnswer - bust: bogey number when enabled", () => {
  it("score unchanged when remaining score is bogey number and bogey rule is enabled", () => {
    // 301-142=159 (bogey number)
    const state = createMatch(
      makeConfig({ targetScore: TargetScore.THREE_OH_ONE, enableBogeyNumbers: true }),
    );
    const newState = answer(state, 0, 142); // 301-142=159 (bogey)
    expect(newState.legs[0].players[0].score).toBe(301);
  });

  it("records BUST_BOGEY_NUMBER result when bogey rule enabled", () => {
    const state = createMatch(
      makeConfig({ targetScore: TargetScore.THREE_OH_ONE, enableBogeyNumbers: true }),
    );
    const newState = answer(state, 0, 142);
    expect(newState.legs[0].turns[0].result).toBe(TurnResult.BUST_BOGEY_NUMBER);
  });

  it("does NOT bust bogey number when rule is disabled", () => {
    // 301-142=159 would be bogey, but rule disabled → VALID
    const state = createMatch(
      makeConfig({ targetScore: TargetScore.THREE_OH_ONE, enableBogeyNumbers: false }),
    );
    const newState = answer(state, 0, 142);
    expect(newState.legs[0].turns[0].result).toBe(TurnResult.VALID);
    expect(newState.legs[0].players[0].score).toBe(159);
  });

  it("switches player after bogey number bust", () => {
    const state = createMatch(
      makeConfig({ targetScore: TargetScore.THREE_OH_ONE, enableBogeyNumbers: true }),
    );
    const newState = answer(state, 0, 142);
    expect(newState.legs[0].currentPlayerIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer - Duplicate Player
// ---------------------------------------------------------------------------

describe("submitAnswer - duplicate player", () => {
  it("returns DUPLICATE_PLAYER when same footballerId used twice", () => {
    const state = createMatch(makeConfig());
    const id = "dup-footballer";
    const s1 = submitAnswer(state, 0, id, "Ronaldo", 50); // valid first use
    // Player 1's turn now; skip them
    const s2 = answer(s1, 1, 50);
    // Player 0 tries to use same footballer again
    const s3 = submitAnswer(s2, 0, id, "Ronaldo", 60);
    const lastTurn = s3.legs[0].turns[s3.legs[0].turns.length - 1];
    expect(lastTurn.result).toBe(TurnResult.DUPLICATE_PLAYER);
  });

  it("score unchanged on duplicate player submission", () => {
    const state = createMatch(makeConfig());
    const id = "dup-footballer-2";
    const s1 = submitAnswer(state, 0, id, "Messi", 50); // p0: 451
    const s2 = answer(s1, 1, 50);
    const scoreBeforeDup = s2.legs[0].players[0].score; // 451
    const s3 = submitAnswer(s2, 0, id, "Messi", 60); // duplicate
    expect(s3.legs[0].players[0].score).toBe(scoreBeforeDup);
  });

  it("does NOT switch player on duplicate - same player retries", () => {
    const state = createMatch(makeConfig());
    const id = "dup-footballer-3";
    const s1 = submitAnswer(state, 0, id, "Neymar", 50);
    const s2 = answer(s1, 1, 50);
    const s3 = submitAnswer(s2, 0, id, "Neymar", 60);
    // currentPlayerIndex should still be 0 (no switch)
    expect(s3.legs[0].currentPlayerIndex).toBe(0);
  });

  it("records duplicate turn in turns array", () => {
    const state = createMatch(makeConfig());
    const id = "dup-footballer-4";
    const s1 = submitAnswer(state, 0, id, "Kane", 50);
    const s2 = answer(s1, 1, 50);
    const turnsBeforeDup = s2.legs[0].turns.length;
    const s3 = submitAnswer(s2, 0, id, "Kane", 60);
    expect(s3.legs[0].turns).toHaveLength(turnsBeforeDup + 1);
  });

  it("footballerId not added to usedPlayerIds on duplicate check", () => {
    // The id was already in the set; the set size should not grow
    const state = createMatch(makeConfig());
    const id = "dup-footballer-5";
    const s1 = submitAnswer(state, 0, id, "Salah", 50);
    const s2 = answer(s1, 1, 50);
    const sizeBeforeDup = s2.legs[0].usedPlayerIds.size;
    const s3 = submitAnswer(s2, 0, id, "Salah", 60);
    expect(s3.legs[0].usedPlayerIds.size).toBe(sizeBeforeDup);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer - Checkout
// ---------------------------------------------------------------------------

describe("submitAnswer - checkout", () => {
  it("records CHECKOUT result when score reaches exactly 0", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Reduce p0 to 100 first
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);     // p0: 1? No: 301-100-100-100 = 1
    // p0 at 1 now; score=1, stat=1 → checkout at 0
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0: 0 → CHECKOUT
    const lastTurn = s7.legs[0].turns[s7.legs[0].turns.length - 1];
    expect(lastTurn.result).toBe(TurnResult.CHECKOUT);
  });

  it("records CHECKOUT when score reaches -5", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Get p0 to score=5: 301-5=296 → stat 296 → but > 180, so need multiple turns
    // 301 → -100 → 201 → -100 → 101 → -96 → 5
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 96);      // p0: 5
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 10);      // p0: 5-10=-5 → CHECKOUT
    const lastTurn = s7.legs[0].turns[s7.legs[0].turns.length - 1];
    expect(lastTurn.result).toBe(TurnResult.CHECKOUT);
    expect(s7.legs[0].players[0].score).toBe(-5);
  });

  it("records CHECKOUT when score reaches -10 (boundary)", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 91);      // p0: 10
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 20);      // p0: 10-20=-10 → CHECKOUT boundary
    const lastTurn = s7.legs[0].turns[s7.legs[0].turns.length - 1];
    expect(lastTurn.result).toBe(TurnResult.CHECKOUT);
    expect(s7.legs[0].players[0].score).toBe(-10);
  });
});

// ---------------------------------------------------------------------------
// Close Finish Flow
// ---------------------------------------------------------------------------

describe("close finish flow", () => {
  // Helper: reduce a player's score to a target via multiple turns
  const reduceScore = (
    state: MatchState,
    playerIndex: 0 | 1,
    targetScore: number,
  ): MatchState => {
    let s = state;
    const leg = s.legs[s.currentLegIndex];
    let remaining = leg.players[playerIndex].score - targetScore;
    while (remaining > 0) {
      const stat = Math.min(remaining, 180);
      if (s.legs[s.currentLegIndex].currentPlayerIndex !== playerIndex) {
        // Skip other player
        s = answer(s, switchPlayer(playerIndex), 1);
      }
      s = answer(s, playerIndex, stat);
      remaining -= stat;
    }
    return s;
  };

  it("player 0 checks out → leg phase becomes CLOSE_FINISH", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Get p0 to 50, then checkout
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);     // p0: 1
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0 checkout at 0
    expect(s7.legs[0].phase).toBe(LegPhase.CLOSE_FINISH);
  });

  it("player 0 checks out → player 1 gets the next turn", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const s1 = answer(state, 0, 100);
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0 checkout
    expect(s7.legs[0].currentPlayerIndex).toBe(1);
  });

  it("player 0 checks out → closeFinishCheckoutScore is set to player 0 score", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const s1 = answer(state, 0, 100);
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0 checks out at score=0
    expect(s7.legs[0].closeFinishCheckoutScore).toBe(0);
  });

  it("player 1 checks out closer to 0 than player 0 → player 1 wins", () => {
    // p0 checks out at -5, p1 checks out at 0 (closer)
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Get p0 to score 5
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 96);      // p0: 5
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 10);      // p0 checks out at -5; CLOSE_FINISH
    expect(s7.legs[0].phase).toBe(LegPhase.CLOSE_FINISH);
    // Now p1 at 301-50-50=201; get p1 to 100 and checkout at 0
    // p1 score currently: after s2=251, s4=201, s6=151 → 151
    // p1 needs to reach 0: stat=151 → checkout
    const s8 = answer(s7, 1, 151);     // p1 checks out at 0
    expect(s8.legs[0].phase).toBe(LegPhase.FINISHED);
    expect(s8.winner).toBe(1);         // p1 wins (|0| < |-5|)
  });

  it("player 1 checks out further from 0 than player 0 → player 0 wins", () => {
    // p0 checks out at 0, p1 checks out at -8 (further)
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Get p0 to score 1
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);     // p0: 1
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0 checks out at 0; CLOSE_FINISH
    // p1 at 301-50-50-50=151; p1 checkout to -8 via stat=159 but > 151+8=159
    // Actually p1 score = 151, stat = 159 → 151-159 = -8 → checkout
    const s8 = answer(s7, 1, 159);     // p1 checks out at -8
    expect(s8.legs[0].phase).toBe(LegPhase.FINISHED);
    expect(s8.winner).toBe(0);         // p0 wins (|0| < |-8|)
  });

  it("tied checkout scores → player 0 wins (first checkout wins ties)", () => {
    // p0 checks out at -5, p1 also checks out at -5 → p0 wins (tie goes to first)
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Get p0 to score 5
    const s1 = answer(state, 0, 100);  // p0: 201
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);     // p0: 101
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 96);      // p0: 5
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 10);      // p0 checks out at -5; CLOSE_FINISH
    // p1 score = 301-50-50-50 = 151; stat = 156 → -5
    const s8 = answer(s7, 1, 156);     // p1 checks out at -5 (tied)
    expect(s8.legs[0].phase).toBe(LegPhase.FINISHED);
    expect(s8.winner).toBe(0);         // p0 wins ties
  });

  it("player 1 busts in close finish → leg stays CLOSE_FINISH, player 0 gets next turn", () => {
    // After p0 checks out, p1 busts → control switches back to player 0
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    const s1 = answer(state, 0, 100);
    const s2 = answer(s1, 1, 50);
    const s3 = answer(s2, 0, 100);
    const s4 = answer(s3, 1, 50);
    const s5 = answer(s4, 0, 100);
    const s6 = answer(s5, 1, 50);
    const s7 = answer(s6, 0, 1);       // p0 checks out → CLOSE_FINISH
    expect(s7.legs[0].phase).toBe(LegPhase.CLOSE_FINISH);
    // p1 busts with stat > 180
    const s8 = answer(s7, 1, 181);
    // Bust → switch back to player 0, leg stays CLOSE_FINISH
    expect(s8.legs[0].phase).toBe(LegPhase.CLOSE_FINISH);
    expect(s8.legs[0].currentPlayerIndex).toBe(0);
  });

  it("player 1 checks out in PLAYING (not close finish) → player 1 wins immediately", () => {
    // Player 1 happens to check out before player 0 does
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Let p0 take a modest turn, then p1 checks out
    const s1 = answer(state, 0, 50);   // p0: 251; now p1's turn
    // Get p1 to near 0: 301-100-100-101=0
    const s2 = answer(s1, 1, 100);     // p1: 201
    const s3 = answer(s2, 0, 50);      // p0: 201
    const s4 = answer(s3, 1, 100);     // p1: 101
    const s5 = answer(s4, 0, 50);      // p0: 151
    const s6 = answer(s5, 1, 101);     // p1: 0 → CHECKOUT in PLAYING
    expect(s6.legs[0].phase).toBe(LegPhase.FINISHED);
    expect(s6.winner).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// handleTimeout
// ---------------------------------------------------------------------------

describe("handleTimeout", () => {
  it("records a TIMEOUT turn", () => {
    const state = createMatch(makeConfig());
    const newState = handleTimeout(state, 0);
    const leg = newState.legs[0];
    expect(leg.turns).toHaveLength(1);
    expect(leg.turns[0].result).toBe(TurnResult.TIMEOUT);
  });

  it("forfeit turn: switches to other player", () => {
    const state = createMatch(makeConfig());
    const newState = handleTimeout(state, 0);
    expect(newState.legs[0].currentPlayerIndex).toBe(1);
  });

  it("turn scoreAfter reflects unchanged player score", () => {
    const state = createMatch(makeConfig());
    const newState = handleTimeout(state, 0);
    expect(newState.legs[0].turns[0].scoreAfter).toBe(501);
  });

  it("turn footballerName is null on timeout", () => {
    const state = createMatch(makeConfig());
    const newState = handleTimeout(state, 0);
    expect(newState.legs[0].turns[0].footballerName).toBeNull();
  });

  it("turn statValue is null on timeout", () => {
    const state = createMatch(makeConfig());
    const newState = handleTimeout(state, 0);
    expect(newState.legs[0].turns[0].statValue).toBeNull();
  });

  it("first timeout: consecutiveTimeouts increments to 1, timer stays 45s", () => {
    const state = createMatch(makeConfig({ timerDuration: 45 }));
    const s1 = handleTimeout(state, 0);
    expect(s1.legs[0].players[0].consecutiveTimeouts).toBe(1);
    expect(s1.legs[0].players[0].timerDuration).toBe(45);
  });

  it("second consecutive timeout: consecutiveTimeouts = 2, timer reduces to 30s", () => {
    const state = createMatch(makeConfig({ timerDuration: 45 }));
    const s1 = handleTimeout(state, 0);           // p0: count=1, timer=45
    const s2 = handleTimeout(s1, 1);              // p1 timeout (skip)
    const s3 = handleTimeout(s2, 0);              // p0: count=2, timer=30
    expect(s3.legs[0].players[0].consecutiveTimeouts).toBe(2);
    expect(s3.legs[0].players[0].timerDuration).toBe(30);
  });

  it("third consecutive timeout: consecutiveTimeouts = 3, timer reduces to 15s", () => {
    const state = createMatch(makeConfig({ timerDuration: 45 }));
    const s1 = handleTimeout(state, 0);  // p0: count=1
    const s2 = handleTimeout(s1, 1);     // skip p1
    const s3 = handleTimeout(s2, 0);     // p0: count=2, timer=30
    const s4 = handleTimeout(s3, 1);     // skip p1
    const s5 = handleTimeout(s4, 0);     // p0: count=3, timer=15
    expect(s5.legs[0].players[0].consecutiveTimeouts).toBe(3);
    expect(s5.legs[0].players[0].timerDuration).toBe(15);
  });

  it("fourth consecutive timeout: match is forfeited, other player wins", () => {
    const state = createMatch(makeConfig({ timerDuration: 45 }));
    const s1 = handleTimeout(state, 0);   // p0: count=1
    const s2 = handleTimeout(s1, 1);      // skip p1
    const s3 = handleTimeout(s2, 0);      // p0: count=2
    const s4 = handleTimeout(s3, 1);      // skip p1
    const s5 = handleTimeout(s4, 0);      // p0: count=3
    const s6 = handleTimeout(s5, 1);      // skip p1
    const s7 = handleTimeout(s6, 0);      // p0: count=4 → FORFEIT
    expect(s7.phase).toBe(MatchPhase.FINISHED);
    expect(s7.winner).toBe(1);
  });

  it("fourth consecutive timeout: leg phase becomes FINISHED", () => {
    const state = createMatch(makeConfig());
    const s1 = handleTimeout(state, 0);
    const s2 = handleTimeout(s1, 1);
    const s3 = handleTimeout(s2, 0);
    const s4 = handleTimeout(s3, 1);
    const s5 = handleTimeout(s4, 0);
    const s6 = handleTimeout(s5, 1);
    const s7 = handleTimeout(s6, 0);
    expect(s7.legs[0].phase).toBe(LegPhase.FINISHED);
  });

  it("non-consecutive timeout: answering resets consecutive counter", () => {
    const state = createMatch(makeConfig());
    const s1 = handleTimeout(state, 0);   // p0: count=1
    expect(s1.legs[0].players[0].consecutiveTimeouts).toBe(1);
    // p1 skips; now p0 answers correctly
    const s2 = handleTimeout(s1, 1);
    const s3 = answer(s2, 0, 50);         // valid answer resets p0's count
    expect(s3.legs[0].players[0].consecutiveTimeouts).toBe(0);
    // p0 times out again → should be count=1 (not 2)
    const s4 = handleTimeout(s3, 1);
    const s5 = handleTimeout(s4, 0);      // p0: fresh timeout → count=1
    expect(s5.legs[0].players[0].consecutiveTimeouts).toBe(1);
    expect(s5.legs[0].players[0].timerDuration).toBe(45);
  });

  it("does not mutate original state", () => {
    const state = createMatch(makeConfig());
    const originalCount = state.legs[0].players[0].consecutiveTimeouts;
    handleTimeout(state, 0);
    expect(state.legs[0].players[0].consecutiveTimeouts).toBe(originalCount);
  });
});

// ---------------------------------------------------------------------------
// Match Progression
// ---------------------------------------------------------------------------

describe("match progression", () => {
  it("winning a leg increments legWins for that player", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // p1 wins immediately by checking out in PLAYING
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 100);
    const s3 = answer(s2, 0, 50);
    const s4 = answer(s3, 1, 100);
    const s5 = answer(s4, 0, 50);
    const s6 = answer(s5, 1, 101);   // p1 checks out at 0
    expect(s6.legWins[1]).toBe(1);
    expect(s6.legWins[0]).toBe(0);
  });

  it("best-of-1: winning 1 leg wins the match", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_1,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 100);
    const s3 = answer(s2, 0, 50);
    const s4 = answer(s3, 1, 100);
    const s5 = answer(s4, 0, 50);
    const s6 = answer(s5, 1, 101);   // p1 wins
    expect(s6.phase).toBe(MatchPhase.FINISHED);
    expect(s6.winner).toBe(1);
  });

  it("best-of-3: requires 2 legs to win match", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_3,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    // p1 wins leg 1
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 100);
    const s3 = answer(s2, 0, 50);
    const s4 = answer(s3, 1, 100);
    const s5 = answer(s4, 0, 50);
    const afterLeg1 = answer(s5, 1, 101); // p1 wins leg 1
    expect(afterLeg1.legWins[1]).toBe(1);
    expect(afterLeg1.phase).toBe(MatchPhase.PLAYING); // still playing

    // Now in leg 2
    const leg2 = afterLeg1.legs[afterLeg1.currentLegIndex];
    expect(leg2.legNumber).toBe(2);

    // p1 wins leg 2 too
    const currentIdx = afterLeg1.currentLegIndex;
    const getP = (s: MatchState) => s.legs[s.currentLegIndex].currentPlayerIndex;
    let s = afterLeg1;
    // In leg 2 player 1 starts (even leg)
    // Get to a position where p1 can win
    s = answer(s, getP(s) === 0 ? 0 : 1, 50);  // whoever goes first takes 50
    // Alternate turns to get p1 to checkout
    const l2State = s.legs[s.currentLegIndex];
    const p1Score = l2State.players[1].score;
    // We'll just use handleTimeout to skip turns and force p1 to checkout
    // Easier: forfeit p0's turns, get p1 down quickly
    // Reset: use a helper approach
    // Let's just play through legitimately
    const s_a = answer(afterLeg1, 1, 100); // p1 (starts in leg 2): 201
    const s_b = answer(s_a, 0, 50);        // p0: 251
    const s_c = answer(s_b, 1, 100);       // p1: 101
    const s_d = answer(s_c, 0, 50);        // p0: 201
    const s_e = answer(s_d, 1, 101);       // p1 checks out → wins leg 2
    expect(s_e.legWins[1]).toBe(2);
    expect(s_e.phase).toBe(MatchPhase.FINISHED);
    expect(s_e.winner).toBe(1);
  });

  it("best-of-5: requires 3 legs to win match", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_5,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    // Win 3 legs for player 1
    let s = state;
    for (let leg = 0; leg < 3; leg++) {
      // Simple checkout sequence for p1 winning each leg
      if (s.legs[s.currentLegIndex].currentPlayerIndex === 0) {
        s = answer(s, 0, 50); // p0 takes a turn
      }
      s = answer(s, 1, 100); // p1
      if (s.legs[s.currentLegIndex].currentPlayerIndex === 0) {
        s = answer(s, 0, 50);
      }
      s = answer(s, 1, 100); // p1
      if (s.legs[s.currentLegIndex].currentPlayerIndex === 0) {
        s = answer(s, 0, 50);
      }
      s = answer(s, 1, 101); // p1 checks out 301
      if (leg < 2) {
        expect(s.phase).toBe(MatchPhase.PLAYING);
      }
    }
    expect(s.legWins[1]).toBe(3);
    expect(s.phase).toBe(MatchPhase.FINISHED);
    expect(s.winner).toBe(1);
  });

  it("new leg starts after a leg win when match is not over", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_3,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 100);
    const s3 = answer(s2, 0, 50);
    const s4 = answer(s3, 1, 100);
    const s5 = answer(s4, 0, 50);
    const afterLeg1 = answer(s5, 1, 101); // p1 wins leg 1
    expect(afterLeg1.legs).toHaveLength(2);
    expect(afterLeg1.currentLegIndex).toBe(1);
  });

  it("starting player alternates between legs: leg 1 starts with p0, leg 2 with p1", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_3,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    expect(state.legs[0].currentPlayerIndex).toBe(0); // leg 1: p0 starts
    const s1 = answer(state, 0, 50);
    const s2 = answer(s1, 1, 100);
    const s3 = answer(s2, 0, 50);
    const s4 = answer(s3, 1, 100);
    const s5 = answer(s4, 0, 50);
    const afterLeg1 = answer(s5, 1, 101); // p1 wins leg 1
    const leg2 = afterLeg1.legs[afterLeg1.currentLegIndex];
    expect(leg2.currentPlayerIndex).toBe(1); // leg 2: p1 starts
  });

  it("leg 3 starts with player 0 (odd leg)", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_5,
      targetScore: TargetScore.THREE_OH_ONE,
    }));
    let s = state;
    // Leg 1 (p0 starts): p1 wins directly by checking out in PLAYING
    // p0 takes a small turn, then p1 wins
    s = answer(s, 0, 50);  // p0: 251
    s = answer(s, 1, 100); // p1: 201
    s = answer(s, 0, 50);  // p0: 201
    s = answer(s, 1, 100); // p1: 101
    s = answer(s, 0, 50);  // p0: 151
    s = answer(s, 1, 101); // p1 checks out at 0 → wins leg 1 in PLAYING
    expect(s.legWins[1]).toBe(1);
    expect(s.phase).toBe(MatchPhase.PLAYING);

    // Leg 2 (p1 starts): p0 wins directly by having p1 go first then p0 wins
    // But p0 can't win directly since p1 goes first in leg 2
    // p1 takes small turns, p0 must wait; let p1 win again
    // Actually to get to leg 3 we need split wins
    // Let p0 win leg 2: p1 goes first (leg 2), p0 must wait
    // p1 starts, p0 needs to checkout AFTER p1 → but that's CLOSE_FINISH again
    // Simplest: have p1 win leg 2 too, but that ends the match in best-of-5 only after 3
    // So let's have p0 win leg 2: p1 starts → p0 can win in PLAYING by going out first
    // Wait, in leg 2 p1 goes first. For p0 to win in PLAYING, p0 must checkout before p1.
    // p1 goes first in leg 2, and both alternate. For p0 to win, p0 must checkout while
    // phase is PLAYING, but p0 always goes second in leg 2. When p0 checks out in PLAYING,
    // that's possible since both start at 301.
    // Leg 2: p1 starts; let p0 win
    expect(s.legs[s.currentLegIndex].currentPlayerIndex).toBe(1);
    s = answer(s, 1, 50);  // p1: 251
    s = answer(s, 0, 100); // p0: 201
    s = answer(s, 1, 50);  // p1: 201
    s = answer(s, 0, 100); // p0: 101
    s = answer(s, 1, 50);  // p1: 151
    s = answer(s, 0, 101); // p0 checks out at 0 → CLOSE_FINISH (since p0 checked out, p1 gets chance)
    // p1 must respond in CLOSE_FINISH; p1 busts to let p0 win
    // But engine: bust in CLOSE_FINISH just switches back to p0; p0 wins only when p1 checkouts worse
    // Let p1 checkout worse than p0 (p0 at 0, p1 at some negative worse):
    s = answer(s, 1, 160); // p1: 151-160=-9 (checkout); |-9| > |0| → p0 wins leg 2
    expect(s.legWins[0]).toBe(1);
    expect(s.legWins[1]).toBe(1);
    expect(s.phase).toBe(MatchPhase.PLAYING);

    // Leg 3 starts
    const leg3 = s.legs[s.currentLegIndex];
    expect(leg3.legNumber).toBe(3);
    expect(leg3.currentPlayerIndex).toBe(0); // odd leg → p0 starts
  });
});

// ---------------------------------------------------------------------------
// startNewLeg
// ---------------------------------------------------------------------------

describe("startNewLeg", () => {
  it("increments currentLegIndex", () => {
    const state = createMatch(makeConfig());
    const newState = startNewLeg(state);
    expect(newState.currentLegIndex).toBe(1);
  });

  it("adds new leg to legs array", () => {
    const state = createMatch(makeConfig());
    const newState = startNewLeg(state);
    expect(newState.legs).toHaveLength(2);
  });

  it("new leg has legNumber incremented from previous", () => {
    const state = createMatch(makeConfig());
    const newState = startNewLeg(state);
    expect(newState.legs[1].legNumber).toBe(2);
  });

  it("new leg resets player scores to targetScore", () => {
    const state = createMatch(makeConfig({ targetScore: TargetScore.THREE_OH_ONE }));
    // Modify the first leg's player score (simulated)
    const newState = startNewLeg(state);
    expect(newState.legs[1].players[0].score).toBe(301);
    expect(newState.legs[1].players[1].score).toBe(301);
  });

  it("even-numbered leg (leg 2) starts with player 1", () => {
    const state = createMatch(makeConfig());
    const newState = startNewLeg(state); // leg 2
    expect(newState.legs[1].currentPlayerIndex).toBe(1);
  });

  it("odd-numbered leg (leg 3) starts with player 0", () => {
    const state = createMatch(makeConfig());
    const s2 = startNewLeg(state);       // leg 2
    const s3 = startNewLeg(s2);          // leg 3
    expect(s3.legs[2].currentPlayerIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Full Game Simulation
// ---------------------------------------------------------------------------

describe("full game simulation - best-of-1", () => {
  it("completes a full match with correct final state", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_1,
      targetScore: TargetScore.THREE_OH_ONE,
    }));

    // Simulate a simple game where player 0 checks out
    // p0 and p1 alternate; p0 wins by checking out in PLAYING (p1 never closes out)
    let s = state;

    // Turns: p0 and p1 alternate reducing scores
    // p0: 301 → 201 → 101 → 1 then checkout
    // p1 just takes modest turns
    s = answer(s, 0, 100); // p0: 201
    s = answer(s, 1, 50);  // p1: 251
    s = answer(s, 0, 100); // p0: 101
    s = answer(s, 1, 50);  // p1: 201
    s = answer(s, 0, 100); // p0: 1
    s = answer(s, 1, 50);  // p1: 151

    // p0 checks out at 0
    s = answer(s, 0, 1);   // p0 at 0 → CHECKOUT → CLOSE_FINISH

    expect(s.legs[0].phase).toBe(LegPhase.CLOSE_FINISH);
    expect(s.legs[0].players[0].score).toBe(0);

    // p1 tries to checkout but can't beat 0 (would need negative score ≤ 0 but further)
    // p1 at 151; overshoot to -8 which is worse than 0
    s = answer(s, 1, 159); // p1: 151-159=-8 → CHECKOUT with score -8

    // p1 score -8, p0 score 0 → p0 closer to 0 → p0 wins
    expect(s.phase).toBe(MatchPhase.FINISHED);
    expect(s.winner).toBe(0);
    expect(s.legWins[0]).toBe(1);
    expect(s.legWins[1]).toBe(0);
    expect(s.legs[0].phase).toBe(LegPhase.FINISHED);
  });

  it("player 1 wins a complete best-of-1 match", () => {
    const state = createMatch(makeConfig({
      matchFormat: MatchFormat.BEST_OF_1,
      targetScore: TargetScore.THREE_OH_ONE,
    }));

    let s = state;
    // p0 takes a modest turn; p1 wins outright in PLAYING phase
    s = answer(s, 0, 50);  // p0: 251
    s = answer(s, 1, 100); // p1: 201
    s = answer(s, 0, 50);  // p0: 201
    s = answer(s, 1, 100); // p1: 101
    s = answer(s, 0, 50);  // p0: 151
    s = answer(s, 1, 101); // p1 checks out at 0 → wins in PLAYING

    expect(s.phase).toBe(MatchPhase.FINISHED);
    expect(s.winner).toBe(1);
    expect(s.legWins[1]).toBe(1);
    expect(s.legs[0].phase).toBe(LegPhase.FINISHED);
  });
});
