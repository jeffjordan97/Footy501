// ============================================================================
// Footy 501 Game Engine - State Machine (Pure Functions)
// ============================================================================
// All functions are pure: they return new state objects and never mutate inputs.

import {
  type MatchConfig,
  type MatchState,
  type LegState,
  type GamePlayer,
  type Turn,
  MatchPhase,
  LegPhase,
  TurnResult,
} from "./types.js";
import { legsToWin } from "./rules.js";
import { evaluateAnswer } from "./scoring.js";
import { updateTimeoutState, isMatchForfeit } from "./timer.js";

// --- Helpers ---

export const switchPlayer = (playerIndex: 0 | 1): 0 | 1 =>
  playerIndex === 0 ? 1 : 0;

export const isMatchComplete = (state: MatchState): boolean => {
  const required = legsToWin(state.config.matchFormat);
  return state.legWins[0] >= required || state.legWins[1] >= required;
};

// --- Factory Functions ---

export const createLeg = (
  legNumber: number,
  targetScore: number,
  timerDuration: number,
): LegState => ({
  legNumber,
  players: [
    {
      id: "player0",
      name: "Player 1",
      score: targetScore,
      consecutiveTimeouts: 0,
      timerDuration,
    },
    {
      id: "player1",
      name: "Player 2",
      score: targetScore,
      consecutiveTimeouts: 0,
      timerDuration,
    },
  ],
  currentPlayerIndex: 0,
  turns: [],
  usedPlayerIds: new Set<string>(),
  phase: LegPhase.PLAYING,
  closeFinishCheckoutScore: null,
});

export const createMatch = (config: MatchConfig): MatchState => {
  const firstLeg = createLeg(1, config.targetScore, config.timerDuration);
  return {
    config,
    legs: [firstLeg],
    currentLegIndex: 0,
    legWins: [0, 0],
    phase: MatchPhase.PLAYING,
    winner: null,
  };
};

// --- Internal Helpers ---

const updatePlayer = (
  player: GamePlayer,
  updates: Partial<GamePlayer>,
): GamePlayer => ({
  ...player,
  ...updates,
});

const updateLeg = (
  leg: LegState,
  updates: Partial<{
    players: readonly [GamePlayer, GamePlayer];
    currentPlayerIndex: 0 | 1;
    turns: readonly Turn[];
    usedPlayerIds: ReadonlySet<string>;
    phase: LegPhase;
    closeFinishCheckoutScore: number | null;
  }>,
): LegState => ({
  ...leg,
  ...updates,
});

const updateMatchLeg = (state: MatchState, leg: LegState): MatchState => ({
  ...state,
  legs: state.legs.map((l, i) => (i === state.currentLegIndex ? leg : l)),
});

const updatePlayers = (
  leg: LegState,
  playerIndex: 0 | 1,
  playerUpdates: Partial<GamePlayer>,
): readonly [GamePlayer, GamePlayer] => {
  const updated = updatePlayer(leg.players[playerIndex], playerUpdates);
  return playerIndex === 0
    ? [updated, leg.players[1]]
    : [leg.players[0], updated];
};

// --- Core Game Actions ---

export const submitAnswer = (
  state: MatchState,
  playerIndex: 0 | 1,
  footballerId: string,
  footballerName: string,
  statValue: number,
): MatchState => {
  const leg = state.legs[state.currentLegIndex];

  // Verify correct player's turn
  if (leg.currentPlayerIndex !== playerIndex) {
    return state;
  }

  // Check for duplicate player
  if (leg.usedPlayerIds.has(footballerId)) {
    const turn: Turn = {
      playerIndex,
      footballerName,
      statValue,
      scoreAfter: leg.players[playerIndex].score,
      result: TurnResult.DUPLICATE_PLAYER,
    };

    const updatedLeg = updateLeg(leg, {
      turns: [...leg.turns, turn],
    });

    return updateMatchLeg(state, updatedLeg);
  }

  // Evaluate the answer
  const { result, newScore } = evaluateAnswer(
    leg.players[playerIndex].score,
    statValue,
    { enableBogeyNumbers: state.config.enableBogeyNumbers },
  );

  const turn: Turn = {
    playerIndex,
    footballerName,
    statValue,
    scoreAfter: newScore,
    result,
  };

  // Handle CHECKOUT
  if (result === TurnResult.CHECKOUT) {
    const players = updatePlayers(leg, playerIndex, {
      score: newScore,
      consecutiveTimeouts: 0,
    });

    const updatedLeg = updateLeg(leg, {
      players,
      turns: [...leg.turns, turn],
      usedPlayerIds: new Set([...leg.usedPlayerIds, footballerId]),
    });

    const stateWithTurn = updateMatchLeg(state, updatedLeg);
    return determineLegWinner(stateWithTurn);
  }

  // Handle VALID
  if (result === TurnResult.VALID) {
    const players = updatePlayers(leg, playerIndex, {
      score: newScore,
      consecutiveTimeouts: 0,
    });

    const updatedLeg = updateLeg(leg, {
      players,
      currentPlayerIndex: switchPlayer(playerIndex),
      turns: [...leg.turns, turn],
      usedPlayerIds: new Set([...leg.usedPlayerIds, footballerId]),
    });

    return updateMatchLeg(state, updatedLeg);
  }

  // Handle BUST variants - score unchanged, switch turns, reset timeouts
  const players = updatePlayers(leg, playerIndex, {
    consecutiveTimeouts: 0,
  });

  const updatedLeg = updateLeg(leg, {
    players,
    currentPlayerIndex: switchPlayer(playerIndex),
    turns: [...leg.turns, turn],
  });

  return updateMatchLeg(state, updatedLeg);
};

// --- Timeout Handling ---

export const handleTimeout = (
  state: MatchState,
  playerIndex: 0 | 1,
): MatchState => {
  const leg = state.legs[state.currentLegIndex];

  const currentPlayer = leg.players[playerIndex];
  const timeoutState = updateTimeoutState(
    currentPlayer.consecutiveTimeouts,
    true,
  );

  // Check for match forfeit
  if (isMatchForfeit(timeoutState.consecutiveTimeouts)) {
    const turn: Turn = {
      playerIndex,
      footballerName: null,
      statValue: null,
      scoreAfter: currentPlayer.score,
      result: TurnResult.TIMEOUT,
    };

    const players = updatePlayers(leg, playerIndex, {
      consecutiveTimeouts: timeoutState.consecutiveTimeouts,
    });

    const updatedLeg = updateLeg(leg, {
      players,
      turns: [...leg.turns, turn],
      phase: LegPhase.FINISHED,
    });

    const otherPlayer = switchPlayer(playerIndex);
    return {
      ...updateMatchLeg(state, updatedLeg),
      phase: MatchPhase.FINISHED,
      winner: otherPlayer,
    };
  }

  const turn: Turn = {
    playerIndex,
    footballerName: null,
    statValue: null,
    scoreAfter: currentPlayer.score,
    result: TurnResult.TIMEOUT,
  };

  const players = updatePlayers(leg, playerIndex, {
    consecutiveTimeouts: timeoutState.consecutiveTimeouts,
    timerDuration: timeoutState.timerDuration ?? currentPlayer.timerDuration,
  });

  const updatedLeg = updateLeg(leg, {
    players,
    currentPlayerIndex: switchPlayer(playerIndex),
    turns: [...leg.turns, turn],
  });

  return updateMatchLeg(state, updatedLeg);
};

/**
 * Skip the current player's turn without tracking a timeout.
 *
 * Used for auto-advancing phantom players in solo/practice mode. Unlike
 * `handleTimeout`, this does NOT increment `consecutiveTimeouts` and cannot
 * trigger a match forfeit, so repeated auto-skips against a phantom player
 * never end the match.
 */
export const skipTurn = (
  state: MatchState,
  playerIndex: 0 | 1,
): MatchState => {
  const leg = state.legs[state.currentLegIndex];

  // Only skip if it's actually this player's turn
  if (leg.currentPlayerIndex !== playerIndex) {
    return state;
  }

  const updatedLeg = updateLeg(leg, {
    currentPlayerIndex: switchPlayer(playerIndex),
  });

  return updateMatchLeg(state, updatedLeg);
};

// --- Leg Winner Determination ---

export const determineLegWinner = (state: MatchState): MatchState => {
  const leg = state.legs[state.currentLegIndex];
  const lastTurn = leg.turns[leg.turns.length - 1];

  if (lastTurn === undefined) {
    return state;
  }

  // Whoever checks out wins the leg immediately
  return finalizeLegWin(state, lastTurn.playerIndex);
};

const finalizeLegWin = (state: MatchState, legWinner: 0 | 1): MatchState => {
  const leg = state.legs[state.currentLegIndex];

  const finishedLeg = updateLeg(leg, {
    phase: LegPhase.FINISHED,
  });

  const newLegWins: readonly [number, number] = [
    state.legWins[0] + (legWinner === 0 ? 1 : 0),
    state.legWins[1] + (legWinner === 1 ? 1 : 0),
  ];

  const stateWithFinishedLeg: MatchState = {
    ...updateMatchLeg(state, finishedLeg),
    legWins: newLegWins,
  };

  const required = legsToWin(state.config.matchFormat);
  if (newLegWins[0] >= required || newLegWins[1] >= required) {
    return {
      ...stateWithFinishedLeg,
      phase: MatchPhase.FINISHED,
      winner: legWinner,
    };
  }

  return startNewLeg(stateWithFinishedLeg);
};

// --- New Leg ---

export const startNewLeg = (state: MatchState): MatchState => {
  const nextLegNumber = state.legs.length + 1;

  // Alternate who goes first: odd legs start with player 0, even with player 1
  const newLeg = createLeg(
    nextLegNumber,
    state.config.targetScore,
    state.config.timerDuration,
  );

  const startingPlayer: 0 | 1 = nextLegNumber % 2 === 1 ? 0 : 1;

  const legWithStarter = updateLeg(newLeg, {
    currentPlayerIndex: startingPlayer,
  });

  return {
    ...state,
    legs: [...state.legs, legWithStarter],
    currentLegIndex: state.currentLegIndex + 1,
  };
};
