// ============================================================================
// Footy 501 Game Engine - Type System
// ============================================================================

// --- Enum-like Constants ---

export const StatType = {
  APPEARANCES: "APPEARANCES",
  GOALS: "GOALS",
  APPEARANCES_AND_GOALS: "APPEARANCES_AND_GOALS",
  APPEARANCES_AND_CLEAN_SHEETS: "APPEARANCES_AND_CLEAN_SHEETS",
  INTERNATIONAL_APPEARANCES: "INTERNATIONAL_APPEARANCES",
} as const;

export type StatType = (typeof StatType)[keyof typeof StatType];

export const TurnResult = {
  VALID: "VALID",
  BUST_OVER_180: "BUST_OVER_180",
  BUST_IMPOSSIBLE_SCORE: "BUST_IMPOSSIBLE_SCORE",
  BUST_BELOW_CHECKOUT: "BUST_BELOW_CHECKOUT",
  BUST_BOGEY_NUMBER: "BUST_BOGEY_NUMBER",
  TIMEOUT: "TIMEOUT",
  DUPLICATE_PLAYER: "DUPLICATE_PLAYER",
  CHECKOUT: "CHECKOUT",
} as const;

export type TurnResult = (typeof TurnResult)[keyof typeof TurnResult];

export const LegPhase = {
  PLAYING: "PLAYING",
  CLOSE_FINISH: "CLOSE_FINISH",
  FINISHED: "FINISHED",
} as const;

export type LegPhase = (typeof LegPhase)[keyof typeof LegPhase];

export const MatchPhase = {
  WAITING: "WAITING",
  PLAYING: "PLAYING",
  TIEBREAKER: "TIEBREAKER",
  FINISHED: "FINISHED",
} as const;

export type MatchPhase = (typeof MatchPhase)[keyof typeof MatchPhase];

export const MatchFormat = {
  BEST_OF_1: 1,
  BEST_OF_3: 3,
  BEST_OF_5: 5,
} as const;

export type MatchFormat = (typeof MatchFormat)[keyof typeof MatchFormat];

export const TargetScore = {
  THREE_OH_ONE: 301,
  FIVE_OH_ONE: 501,
  SEVEN_OH_ONE: 701,
  ONE_THOUSAND_AND_ONE: 1001,
} as const;

export type TargetScore = (typeof TargetScore)[keyof typeof TargetScore];

// --- Domain Interfaces ---

export interface StatCategory {
  readonly id: string;
  readonly name: string;
  readonly league: string;
  readonly team: string | null;
  readonly statType: StatType;
}

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly normalizedName: string;
  readonly nationality: string;
  readonly position: string;
}

export interface PlayerStat {
  readonly playerId: string;
  readonly categoryId: string;
  readonly value: number;
}

export interface GamePlayer {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly consecutiveTimeouts: number;
  readonly timerDuration: number;
}

export interface Turn {
  readonly playerIndex: 0 | 1;
  readonly footballerName: string | null;
  readonly statValue: number | null;
  readonly scoreAfter: number;
  readonly result: TurnResult;
}

// --- Game Configuration ---

export interface MatchConfig {
  readonly id: string;
  readonly targetScore: TargetScore;
  readonly statCategory: StatCategory;
  readonly matchFormat: MatchFormat;
  readonly timerDuration: number;
  readonly enableBogeyNumbers: boolean;
  readonly tiebreakerTarget: number;
}

// --- Game State ---

export interface LegState {
  readonly legNumber: number;
  readonly players: readonly [GamePlayer, GamePlayer];
  readonly currentPlayerIndex: 0 | 1;
  readonly turns: readonly Turn[];
  readonly usedPlayerIds: ReadonlySet<string>;
  readonly phase: LegPhase;
  readonly closeFinishCheckoutScore: number | null;
}

export interface MatchState {
  readonly config: MatchConfig;
  readonly legs: readonly LegState[];
  readonly currentLegIndex: number;
  readonly legWins: readonly [number, number];
  readonly phase: MatchPhase;
  readonly winner: 0 | 1 | null;
}

// --- Action Results ---

export interface AnswerResult {
  readonly success: boolean;
  readonly turnResult: TurnResult;
  readonly bustReason: string | null;
  readonly scoreDeducted: number;
  readonly newScore: number;
  readonly isCheckout: boolean;
  readonly updatedState: MatchState;
}
