# Footy 501 - Complete Game Rules

**Last Updated**: March 2025

## Overview

Footy 501 is a head-to-head competitive game that combines the mathematical elegance of darts scoring with football trivia knowledge. Players answer questions about football statistics to score points, which count down toward zero. The first player to reach zero wins the leg. The name "501" refers to the standard starting score, mirroring traditional darts terminology.

### Core Concept

- **Target**: Both players start with a set score (e.g., 501 points)
- **Turns**: Players alternate answering football trivia questions
- **Scoring**: Correct answers deduct stat values (goals, appearances, clean sheets, etc.) from the score
- **Win Condition**: First to reach exactly 0 (or within -10) wins the leg
- **Matches**: Multiple legs can be played in "best of" format (best of 1, 3, or 5)

---

## Game Structure

### Match vs. Leg

A **match** consists of one or more **legs**, each of which is a complete game from starting score to checkout:

```
MATCH (Best of 3)
├── LEG 1 → Player A wins
├── LEG 2 → Player B wins
└── LEG 3 → Player A wins
    → MATCH WINNER: Player A (2-1)
```

### Match Formats

| Format | Name | First To | Example |
|--------|------|----------|---------|
| 1 | Best of 1 | 1 leg | Single-leg match |
| 3 | Best of 3 | 2 legs | Casual games |
| 5 | Best of 5 | 3 legs | Competitive games |

---

## Turn Structure

A turn consists of the following steps:

### 1. Question Presentation (45 seconds default)

The game displays a football question with multiple stat categories:
- Footballer name must be identified
- Specific statistic category (Appearances, Goals, Clean Sheets, etc.)
- Question example: "How many goals did Cristiano Ronaldo score?"

### 2. Player Response (Before timer expires)

The player must:
1. Search for the footballer using fuzzy search
2. Select the correct footballer
3. Select the correct stat category
4. The game looks up the stat value
5. Turn is evaluated based on scoring rules

### 3. Timer (45 seconds default)

If the player does not submit an answer before the timer expires:
- Turn is forfeited
- Score unchanged
- Consecutive timeout counter increments
- Turn passes to opponent

### 4. Score Evaluation & Update

The game engine evaluates the answer:
- **VALID**: Score correctly decremented, next player's turn
- **CHECKOUT**: Score reaches 0 (or -1 to -10), potential leg winner
- **BUST**: Score violation, turn forfeits, same player tries next turn
- **TIMEOUT**: Timer expired, turn forfeits, next player's turn

---

## Scoring System

### Valid Scores (45 seconds default)

When a player answers correctly:
1. The stat value is deducted from their remaining score
2. If the new score is valid, the turn is accepted as VALID
3. Turn passes to the next player
4. Consecutive timeout counter resets to 0

**Example:**
- Current score: 501
- Footballer selected: Messi
- Stat value: 45 (goals)
- New score: 501 - 45 = 456 ✓ VALID

### Maximum Stat Value

**Limit**: 180 points per turn

This mirrors the darts maximum (triple 20 × 3). Any stat value exceeding 180 triggers an immediate bust.

**Example:**
- Current score: 250
- Footballer selected: Kane
- Stat value: 190 (career appearances at club)
- Result: BUST_OVER_180 ✗

---

## Bust Rules

A bust voids the current turn. The player's score reverts to what it was before the turn, and play passes to the opponent.

### Bust Rule #1: Over 180

If a stat value exceeds 180, the turn is immediately busted.

| Condition | Result |
|-----------|--------|
| Stat value > 180 | BUST_OVER_180 |

### Bust Rule #2: Impossible Scores

Certain scores cannot be achieved with standard darts rules. Landing on one of these scores triggers a bust.

**Impossible Darts Scores** (readonly list):
```
163, 166, 169, 172, 173, 175, 176, 178, 179
```

These values represent scores that cannot be made with any combination of three darts (single, double, or treble). In Footy 501, if a turn would result in one of these scores, it is a bust.

| Condition | Result |
|-----------|--------|
| New score in IMPOSSIBLE_SCORES | BUST_IMPOSSIBLE_SCORE |

**Example:**
- Current score: 200
- Stat value: 27
- New score: 200 - 27 = 173 (impossible score)
- Result: BUST_IMPOSSIBLE_SCORE ✗

### Bust Rule #3: Below Checkout Threshold

A player cannot overshoot below -10. Attempting to do so triggers a bust.

**Checkout Range**: -10 to 0

| Condition | Result |
|-----------|--------|
| New score < -10 | BUST_BELOW_CHECKOUT |

**Example:**
- Current score: 15
- Stat value: 50
- New score: 15 - 50 = -35 (below -10)
- Result: BUST_BELOW_CHECKOUT ✗

### Bust Rule #4: Bogey Numbers (Optional)

When enabled, bogey numbers trigger a bust. Bogey numbers are scores from which a standard darts checkout is impossible. This rule makes the game more challenging and mirrors traditional darts rules.

**Bogey Numbers** (readonly set):
```
159, 162, 163, 165, 166, 168, 169,
171, 172, 173, 174, 175, 176, 177, 178, 179, 180
```

These are "finishes" where no valid three-dart checkout path exists (checkout must end on a double).

| Condition | Result |
|-----------|--------|
| enableBogeyNumbers && new score in BOGEY_NUMBERS | BUST_BOGEY_NUMBER |

**Example** (with bogey numbers enabled):
- Current score: 200
- Stat value: 38
- New score: 200 - 38 = 162 (bogey number)
- Result: BUST_BOGEY_NUMBER ✗

---

## Checkout Rules

When a player's score reaches 0 (or between -10 and 0), they have "checked out" and achieved a leg win, **with one caveat**: the close finish rule.

### Standard Checkout

A player checks out when their remaining score falls within the checkout range:

**Checkout Range**: -10 to 0 (inclusive)

| Condition | Result |
|-----------|--------|
| New score >= -10 AND new score <= 0 | CHECKOUT |

**Example:**
- Current score: 25
- Stat value: 25
- New score: 25 - 25 = 0
- Result: CHECKOUT ✓

**Example (Overshoot):**
- Current score: 15
- Stat value: 10
- New score: 15 - 10 = 5... wait, that's not overshoot. Let me redo:
- Current score: 5
- Stat value: 12
- New score: 5 - 12 = -7 (within -10 to 0)
- Result: CHECKOUT ✓

### Close Finish Rule

When **Player 1** (first player to act in a leg) checks out:
1. The leg enters **CLOSE_FINISH** phase
2. **Player 2** gets **one final turn** to try to match or beat the score
3. If Player 2 also checks out:
   - The winner is whoever is **closer to 0**
   - Ties go to Player 1 (who finished first)
4. If Player 2 does not check out:
   - Player 1 wins the leg

**Phase Flow:**
```
PLAYING phase
  ↓ Player 1 checks out
CLOSE_FINISH phase (Player 2's final turn)
  ↓ Player 2 answers
FINISHED phase (Leg winner determined)
```

**Scoring Example (Close Finish):**
- Player 1 checks out with score: -2
- Player 2's turn: achieves score -5
- Winner: Player 2 (|-5| < |-2|, closer to 0)

**Scoring Example (Tie):**
- Player 1 checks out with score: -3
- Player 2's turn: achieves score -3
- Winner: Player 1 (tied, but finished first)

---

## Timeout Escalation

When a player allows the timer to expire without submitting an answer, they receive a consecutive timeout. Consecutive timeouts trigger escalating penalties.

### Timeout Counter

Resets to 0 when a player successfully completes a turn (regardless of outcome). Increments when they timeout.

### Escalation Levels

| Timeout # | Timer Duration | Consequence |
|-----------|-----------------|-------------|
| 1st | 45s → 45s | Turn forfeited, timer unchanged |
| 2nd | 45s → 45s | Turn forfeited, timer unchanged |
| 3rd | 45s → 30s | Turn forfeited, timer reduced to 30s |
| 4th | 30s → 15s | Turn forfeited, timer reduced to 15s |
| 5th+ | — | **Match forfeited**, opponent wins immediately |

### Timeout Sequence Example

```
Turn 1: Player A timeouts → Consecutive: 1, Timer: 45s
Turn 2: Player A timeouts → Consecutive: 2, Timer: 45s
Turn 3: Player A timeouts → Consecutive: 3, Timer: 30s
Turn 4: Player A timeouts → Consecutive: 4, Timer: 15s
Turn 5: Player A timeouts → Consecutive: 5, Timer: FORFEIT
        (Match ends, Player B wins)
```

### Resetting the Counter

Any non-timeout turn resets the counter:

```
Turn 1: Player A timeouts → Consecutive: 1
Turn 2: Player A completes turn (valid, bust, checkout) → Consecutive: 0
Turn 3: Player A timeouts → Consecutive: 1 (counter reset)
```

---

## Duplicate Player Protection

A player (footballer) can only be named **once per leg**. If a player attempts to name a footballer they've already named in the current leg:

**Result**: DUPLICATE_PLAYER (bust)

- Score unchanged
- Turn forfeited
- Turn passes to opponent
- Consecutive timeout counter resets

**Example:**
- Leg 1, Player A names "Messi" → valid turn
- Later in same leg, Player A names "Messi" again → DUPLICATE_PLAYER bust

---

## Stat Categories

The game supports multiple football stat categories. During leg setup, both players select a stat category, and all turns use that category. Categories include:

| Category | Type | Description |
|----------|------|-------------|
| APPEARANCES | League | Total appearances for a club in a season |
| GOALS | League | Total goals scored for a club in a season |
| APPEARANCES_AND_GOALS | Combined | Appearances + Goals combined value |
| APPEARANCES_AND_CLEAN_SHEETS | Defensive | Appearances + Clean Sheets (defenders/GK) |
| INTERNATIONAL_APPEARANCES | National Team | Appearances for national team |

Stats vary by:
- **Player**: Different stats for different footballers
- **Team**: Stats are per team (e.g., Messi at Barcelona vs. PSG)
- **Season**: Stats are per season (2022-23, 2023-24, etc.)

---

## Target Scores (Starting Points)

Players can configure the starting score for a leg. Common options:

| Target | Difficulty | Game Length |
|--------|-----------|-------------|
| 301 | Short | 10-15 min |
| 501 | Standard | 20-30 min |
| 701 | Long | 30-45 min |
| 1001 | Marathon | 45+ min |

All bust rules and checkout logic apply regardless of target score.

---

## Timer Configuration

### Default Timer Duration
**45 seconds** per turn (standard play)

### Speed Round Mode (Planned)
**15 seconds** per turn (faster-paced variant)

Players can select timer duration during match setup.

---

## Game State Constants Reference

### Scoring Constants

```typescript
// Maximum stat value per turn (mirrors darts 180)
MAX_STAT_VALUE = 180

// Checkout range (goal range)
CHECKOUT_MIN = -10
CHECKOUT_MAX = 0

// Starting scores
DEFAULT_TARGET = 501
VALID_TARGETS = [301, 501, 701, 1001]

// Timer defaults
DEFAULT_TIMER_DURATION = 45
SPEED_TIMER_DURATION = 15
```

### Timeout Constants

```typescript
// Escalation schedule (seconds for turns 1-4 after consecutive timeouts)
TIMEOUT_ESCALATION = [45, 45, 30, 15]

// Match forfeit trigger
MAX_CONSECUTIVE_TIMEOUTS = 4
```

### Impossible & Bogey Scores

See "Bust Rules" section above for complete lists.

---

## Edge Cases & Clarifications

### What if a player's score is exactly 0?

**Result**: CHECKOUT (leg win)

The checkout range includes exactly 0.

### What if a player's score goes negative between -10 and 0?

**Result**: CHECKOUT (leg win)

Overshooting is allowed within the -10 to 0 range. The player wins immediately.

### Can a player timeout during close finish?

**Yes.** The same timeout escalation rules apply. If they reach 5 consecutive timeouts during close finish, the match is forfeited.

### What happens if both players bust in the same turn?

Only one player acts per turn. A bust simply ends their turn and passes to the opponent.

### Can a player check out with a score above 0?

**No.** A checkout must land in the -10 to 0 range (inclusive).

**Example:**
- Current score: 50
- Stat value: 40
- New score: 50 - 40 = 10 (above 0)
- Result: VALID (not a checkout)

### What if the database doesn't have a stat for a footballer?

This is handled during question generation (planned). Only questions with valid stat data are posed to players. If a player names a footballer not in the database, the turn is treated as incorrect (stat value = 0, score unchanged, turn forfeited).

---

## Turn Result Summary Table

| Result | Score Change | Turn Outcome | Next Player | Timeout Counter |
|--------|---------------|--------------|-------------|-----------------|
| VALID | Decremented | Ends | Switch | Reset to 0 |
| CHECKOUT | Decremented | Leg win (or close finish) | — | Reset to 0 |
| BUST_OVER_180 | Unchanged | Ends | Switch | Reset to 0 |
| BUST_IMPOSSIBLE_SCORE | Unchanged | Ends | Switch | Reset to 0 |
| BUST_BELOW_CHECKOUT | Unchanged | Ends | Switch | Reset to 0 |
| BUST_BOGEY_NUMBER | Unchanged | Ends | Switch | Reset to 0 |
| DUPLICATE_PLAYER | Unchanged | Ends | Switch | Reset to 0 |
| TIMEOUT | Unchanged | Ends | Switch | Increment |

---

## Game Phases

### Leg Phases

```
PLAYING
├─ Normal gameplay, both players scoring points
├─ Ends when a player checks out
└─ Transitions to CLOSE_FINISH (if Player 1) or FINISHED

CLOSE_FINISH
├─ Initiated when Player 1 checks out
├─ Player 2 gets exactly one final turn
└─ Winner determined after Player 2's action

FINISHED
└─ Leg winner determined, ready for next leg or match end
```

### Match Phases

```
WAITING
├─ Before match starts
└─ Match setup (players, stat category, target score)

PLAYING
├─ One or more legs in progress
└─ Transitions when legs are completed

TIEBREAKER (Planned)
├─ If match is tied after normal legs
├─ Short-form leg (50-point target) to break the tie
└─ Winner determined

FINISHED
└─ Match winner determined, results recorded
```

---

## Planned Variations

### Speed Mode
- Timer: 15 seconds instead of 45
- Reduced thinking time, higher tension

### Blind Mode
- Stat value not revealed until after answer submission
- Adds uncertainty to risk assessment

### Daily Challenge
- Pre-set question pool and opponent
- Same challenge for all players (leaderboard comparison)

---

## Technical Notes for Developers

### Pure Function Implementation

Game rules are implemented as pure functions in:
- `server/src/lib/game-engine/scoring.ts` — Score evaluation
- `server/src/lib/game-engine/rules.ts` — Game constants
- `server/src/lib/game-engine/timer.ts` — Timeout escalation
- `server/src/lib/game-engine/engine.ts` — State machine

### Immutable State Model

All game state transitions return new state objects; inputs are never mutated. This enables:
- Deterministic replay and testing
- Safe concurrency with WebSockets
- Clear audit trail of game events

### Type Safety

TypeScript types ensure:
- Valid turn results (enum-like constants)
- Correct state shape
- Type-safe stat categories

See `server/src/lib/game-engine/types.ts` for complete type definitions.

---

## Summary

Footy 501 is a complex game with many rules, but they follow a consistent logic:

1. **Score Validity**: Ensure deductions don't break darts rules (impossible scores, impossible checkouts)
2. **Fair Play**: Duplicate protection and timeout escalation prevent exploitation
3. **Exciting Finishes**: Close finish and overshoot forgiveness create drama
4. **Strategic Depth**: Player selection, stat category, and timeout management add strategy

The game engine rigorously enforces these rules, making every game fair and competitive.

---

**Questions?** Refer to [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details or contact the development team.
