# Footy 501 - System Architecture

**Last Updated**: March 2025

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Game Engine Design](#game-engine-design)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Data Flow](#data-flow)
8. [Deployment Architecture](#deployment-architecture)

---

## System Overview

Footy 501 is a client-server application split into three tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Vue 3 + Vite)                     │
│  Browser-based UI, real-time game rendering, player input   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ WebSocket (Socket.IO)
                   │ + REST (HTTP/JSON)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                 SERVER (Express + Node.js)                   │
│  Game state management, business logic, real-time sync      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ SQL Queries (Drizzle ORM)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              DATABASE (PostgreSQL + Drizzle)                │
│              Player data, game history, stats                │
└─────────────────────────────────────────────────────────────┘
```

### Communication Patterns

- **WebSocket (Socket.IO)**: Real-time game events (answer submission, timeout, state updates)
- **REST (HTTP)**: Static data retrieval (player search, game history, leaderboards)
- **SQL**: Persistent storage via Drizzle ORM query builder

---

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Vue 3 | Component-based UI, reactivity |
| Build Tool | Vite | Fast development server, optimized build |
| Routing | Vue Router | Single-page navigation |
| State Management | Pinia | Global state, stores |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Real-time | Socket.IO Client | WebSocket communication |
| Search | Fuse.js | Fuzzy string matching |

### Project Structure

```
client/src/
├── main.ts                 # App entrypoint
├── App.vue                 # Root component
├── style.css               # Global styles (Tailwind)
├── router/
│   └── index.ts           # Vue Router configuration
├── views/                  # Page-level components
│   ├── HomeView.vue       # Home/menu screen
│   ├── PlayLocalView.vue  # Local game setup (planned)
│   ├── PlayOnlineView.vue # Online game setup (planned)
│   ├── PlayDailyView.vue  # Daily challenge (planned)
│   └── GameView.vue       # Active game screen
├── components/
│   ├── game/              # Game-specific components
│   ├── layout/            # Layout components (header, footer)
│   └── lobby/             # Lobby components
├── stores/                # Pinia stores (state management)
│   ├── gameStore.ts       # Game state
│   ├── playerStore.ts     # Player data
│   └── uiStore.ts         # UI state
├── composables/           # Reusable Vue logic
│   └── useSocket.ts       # Socket.IO integration
├── lib/                   # Utility libraries
│   └── game-engine/       # Game engine (same as server)
└── assets/                # Images, fonts
```

### Router Configuration

Routes are defined in `client/src/router/index.ts`:

| Path | Name | Component | Purpose |
|------|------|-----------|---------|
| `/` | home | HomeView.vue | Main menu, game mode selection |
| `/play/local` | play-local | PlayLocalView.vue | Local multiplayer setup |
| `/play/online` | play-online | PlayOnlineView.vue | Online game setup |
| `/play/daily` | play-daily | PlayDailyView.vue | Daily challenge |
| `/game/:id` | game | GameView.vue | Active game interface |

### State Management (Pinia)

Planned stores for managing application state:

**gameStore**
- Current match state (score, turns, phase)
- Match configuration
- Game events history

**playerStore**
- Current player info
- Player search results
- Player statistics and history

**uiStore**
- UI state (modals, tooltips, animations)
- Theme and preferences
- Loading states

### Key Components

**GameView.vue** (Active Game Screen)
```vue
<template>
  <div class="game-container">
    <GameHeader />          <!-- Score, timer, player info -->
    <GameBoard />           <!-- Question display -->
    <PlayerSearch />        <!-- Fuzzy search for footballer -->
    <StatCategorySelect />  <!-- Stat selection -->
    <SubmitButton />        <!-- Answer submission -->
    <TurnHistory />         <!-- Turn log on the side -->
  </div>
</template>
```

### Real-time Communication

Socket.IO client integration in `composables/useSocket.ts`:

```typescript
// Emit game actions
emit('submitAnswer', { footballerId, statValue })
emit('handleTimeout', {})

// Listen for state updates
on('gameStateUpdated', (newState) => {
  gameStore.updateState(newState)
})
on('turnCompleted', (turn) => {
  gameStore.recordTurn(turn)
})
```

---

## Backend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | JavaScript runtime |
| Framework | Express | HTTP server and routing |
| Real-time | Socket.IO | WebSocket server |
| ORM | Drizzle | Type-safe SQL query builder |
| Database | PostgreSQL | Relational database |
| Validation | Zod | Runtime type validation |

### Project Structure

```
server/src/
├── index.ts               # Server entrypoint, Express setup
├── lib/
│   ├── game-engine/       # Pure game logic (state machine)
│   │   ├── types.ts      # Type definitions
│   │   ├── rules.ts      # Game constants
│   │   ├── scoring.ts    # Score evaluation logic
│   │   ├── timer.ts      # Timeout escalation
│   │   └── engine.ts     # State machine functions
│   └── football-data/     # Football data utilities (planned)
├── db/
│   ├── schema/           # Drizzle table definitions
│   │   ├── players.ts
│   │   ├── games.ts
│   │   ├── player-stats.ts
│   │   └── teams.ts
│   ├── migrations/       # Database migration files
│   ├── seed/             # Data seeding scripts
│   └── client.ts         # Database connection
├── routes/               # Express route handlers (planned)
│   ├── health.ts
│   ├── players.ts
│   ├── games.ts
│   └── stats.ts
├── services/             # Business logic layer (planned)
│   ├── PlayerService.ts
│   ├── GameService.ts
│   └── StatService.ts
├── websocket/            # Socket.IO event handlers (planned)
│   └── handlers.ts
└── middleware/           # Express middleware (planned)
    ├── errorHandler.ts
    └── validation.ts
```

### Server Initialization

`index.ts` sets up:
1. Express app with JSON middleware
2. CORS configuration for client URL
3. Socket.IO server with CORS
4. Health check endpoint
5. Socket.IO connection handler
6. Server listening on configured PORT

```typescript
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL }
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  // Game event handlers (planned)
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Environment Configuration

`server/.env` (via `.env.example`):
```
PORT=3001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/footy501
```

---

## Game Engine Design

### Philosophy

The game engine is implemented as a **pure state machine** using immutable data patterns:

- **Pure Functions**: No side effects, deterministic output
- **Immutability**: State never mutated, new state returned
- **Type Safety**: TypeScript ensures valid state transitions
- **Testability**: Pure functions are easy to unit test

### Core Modules

#### 1. Types (`game-engine/types.ts`)

Defines all game entities and state shapes:

**Enums (Constant Sets)**
```typescript
StatType = { APPEARANCES, GOALS, ... }
TurnResult = { VALID, BUST_OVER_180, CHECKOUT, ... }
LegPhase = { PLAYING, CLOSE_FINISH, FINISHED }
MatchPhase = { WAITING, PLAYING, TIEBREAKER, FINISHED }
```

**Domain Interfaces**
```typescript
interface Player {
  id: string
  name: string
  nationality: string
  position: string
}

interface GamePlayer {
  id: string
  name: string
  score: number
  consecutiveTimeouts: number
  timerDuration: number
}
```

**State Interfaces**
```typescript
interface LegState {
  legNumber: number
  players: readonly [GamePlayer, GamePlayer]
  currentPlayerIndex: 0 | 1
  turns: readonly Turn[]
  phase: LegPhase
  closeFinishCheckoutScore: number | null
}

interface MatchState {
  config: MatchConfig
  legs: readonly LegState[]
  currentLegIndex: number
  legWins: readonly [number, number]
  phase: MatchPhase
  winner: 0 | 1 | null
}
```

#### 2. Rules (`game-engine/rules.ts`)

Game constants and helper functions:

```typescript
// Impossible scores (can't be achieved with darts)
IMPOSSIBLE_SCORES = Set([163, 166, 169, ...])

// Bogey numbers (no valid checkout)
BOGEY_NUMBERS = Set([159, 162, 165, ...])

// Scoring limits
MAX_STAT_VALUE = 180
CHECKOUT_MIN = -10
CHECKOUT_MAX = 0

// Timer defaults
DEFAULT_TIMER_DURATION = 45
TIMEOUT_ESCALATION = [45, 45, 30, 15]
MAX_CONSECUTIVE_TIMEOUTS = 4

// Helper function
legsToWin(bestOf) → number of legs needed to win
```

#### 3. Scoring (`game-engine/scoring.ts`)

Pure functions for evaluating answers:

```typescript
evaluateAnswer(currentScore, statValue, options)
  → { result: TurnResult, newScore: number }

// Predicate functions
isOver180(statValue) → boolean
isImpossibleScore(remainingScore) → boolean
isBogeyNumber(remainingScore) → boolean
isInCheckoutRange(score) → boolean

// Messages
getBustMessage(result, statValue, currentScore) → string
```

#### 4. Timer (`game-engine/timer.ts`)

Timeout escalation logic:

```typescript
updateTimeoutState(consecutiveTimeouts, timedOut)
  → { consecutiveTimeouts, timerDuration }

getNextTimerDuration(consecutiveTimeouts) → number | null

isMatchForfeit(consecutiveTimeouts) → boolean

getTimeoutMessage(consecutiveTimeouts) → string
```

#### 5. Engine (`game-engine/engine.ts`)

State machine with immutable transitions:

**Factory Functions**
```typescript
createLeg(legNumber, targetScore, timerDuration) → LegState
createMatch(config) → MatchState
```

**Game Actions** (pure state transitions)
```typescript
submitAnswer(state, playerIndex, footballerId, ...)
  → new MatchState

handleTimeout(state, playerIndex)
  → new MatchState

determineLegWinner(state)
  → new MatchState (with leg winner)

startNewLeg(state)
  → new MatchState (with new leg)
```

**Helper Functions**
```typescript
switchPlayer(playerIndex: 0 | 1) → 0 | 1
isMatchComplete(state) → boolean
```

### State Machine Flow

```
CREATE MATCH
  ↓
CREATE LEG 1
  ↓
PLAYING (Player 0's turn)
  ├─ submitAnswer()
  │  ├─ VALID → PLAYING (switch player)
  │  ├─ BUST → PLAYING (switch player)
  │  └─ CHECKOUT → CLOSE_FINISH
  └─ handleTimeout()
     └─ PLAYING (switch player, increment timeout)
  ↓
CLOSE_FINISH (Player 1's final turn, if Player 0 checked out)
  ├─ submitAnswer()
  │  ├─ VALID → FINISHED
  │  ├─ BUST → FINISHED
  │  └─ CHECKOUT → FINISHED
  └─ handleTimeout()
     └─ FINISHED (timeout in close finish)
  ↓
FINISHED (leg winner determined)
  ├─ isMatchComplete() → MATCH FINISHED
  └─ startNewLeg() → CREATE LEG 2 (back to PLAYING)
```

---

## Database Schema

### Overview

PostgreSQL database with Drizzle ORM for type-safe queries:

```
┌──────────────┐
│   players    │
│──────────────│
│ id (PK)      │
│ name         │
│ nationality  │
│ position     │
└──────────────┘
       │
       │ 1:M
       │
┌──────────────┐       ┌──────────────┐
│player_stats  │──────▶│    teams     │
│──────────────│       │──────────────│
│ id (PK)      │       │ id (PK)      │
│ playerId (FK)│       │ name         │
│ teamId (FK)  │       │ league       │
│ season       │       │ country      │
│ statType     │       └──────────────┘
│ appearances  │
│ goals        │
│ assists      │
│ cleanSheets  │
└──────────────┘

┌──────────────┐
│    games     │
│──────────────│
│ id (PK)      │
│ status       │
│ config (JSON)│
│ state (JSON) │
│ createdAt    │
│ updatedAt    │
└──────────────┘
```

### Table Definitions

#### Players Table

File: `server/src/db/schema/players.ts`

```typescript
pgTable("players", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  normalizedName: text().notNull(),  // For search
  nationality: text(),
  position: text(),  // e.g., "Defender", "Forward"
  createdAt: timestamp().notNull().defaultNow(),
})
```

**Indexes**:
- Primary key on `id`
- Index on `normalizedName` for search performance
- Optional GIN trigram index for fuzzy search (requires `pg_trgm` extension)

#### Teams Table

File: `server/src/db/schema/teams.ts`

Stores team/club information:

```typescript
pgTable("teams", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  league: text().notNull(),  // e.g., "Premier League"
  country: text(),
  season: text().notNull(),  // e.g., "2023-24"
  createdAt: timestamp().notNull().defaultNow(),
})
```

#### Player Stats Table

File: `server/src/db/schema/player-stats.ts`

Stores individual player statistics by team and season:

```typescript
pgTable("player_stats", {
  id: uuid().primaryKey().defaultRandom(),
  playerId: uuid().notNull().references(() => players.id),
  teamId: uuid().notNull().references(() => teams.id),
  season: text().notNull(),  // e.g., "2023-24"
  statType: text().notNull(),  // e.g., "GOALS"
  appearances: integer().notNull().default(0),
  goals: integer().notNull().default(0),
  assists: integer().notNull().default(0),
  cleanSheets: integer().notNull().default(0),
  createdAt: timestamp().notNull().defaultNow(),
})
```

**Constraints**:
- Foreign keys to `players` and `teams`
- Unique constraint: `(playerId, teamId, season, statType)`

#### Games Table

File: `server/src/db/schema/games.ts`

Stores game records and state snapshots:

```typescript
pgTable("games", {
  id: uuid().primaryKey().defaultRandom(),
  status: text().notNull(),  // "waiting", "playing", "finished", "abandoned"
  config: jsonb().$type<MatchConfig>(),  // Game configuration
  state: jsonb().$type<MatchState>(),   // Full game state snapshot
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow()
    .$onUpdate(() => new Date()),
})
```

**JSONB Columns**:
- `config`: Immutable match configuration (target, format, stat category)
- `state`: Mutable game state (legs, players, turns, phase)

### Database Queries (Planned)

With Drizzle ORM:

```typescript
// Player search
db.select()
  .from(players)
  .where(like(players.normalizedName, '%messi%'))

// Get player stats
db.select()
  .from(playerStats)
  .where(
    and(
      eq(playerStats.playerId, footballerId),
      eq(playerStats.season, '2023-24')
    )
  )

// Save game state
db.insert(games)
  .values({ status: 'playing', config, state })

// Update game state
db.update(games)
  .set({ state: newState, updatedAt: new Date() })
  .where(eq(games.id, gameId))
```

---

## API Design

### REST Endpoints (Planned)

**Health Check**
```
GET /api/health
Response: { status: "ok" }
```

**Player Search**
```
GET /api/players/search?q=messi
Response: {
  success: boolean
  data: Player[]
  error?: string
}
```

**Get Player Stats**
```
GET /api/players/:id/stats
Query: season, team, category
Response: {
  success: boolean
  data: PlayerStat[]
  error?: string
}
```

**Game History**
```
GET /api/games
Query: status, limit, offset
Response: {
  success: boolean
  data: GameRecord[]
  pagination: { total, page, limit }
  error?: string
}
```

**Get Game by ID**
```
GET /api/games/:id
Response: {
  success: boolean
  data: GameRecord
  error?: string
}
```

### WebSocket Events (Planned)

#### Client → Server

**submitAnswer**
```typescript
emit('submitAnswer', {
  footballerId: string
  footballerName: string
  statValue: number
})
```

**handleTimeout**
```typescript
emit('handleTimeout', {})
```

**joinGame**
```typescript
emit('joinGame', {
  gameId: string
  playerName: string
})
```

**leaveGame**
```typescript
emit('leaveGame', {})
```

#### Server → Client

**gameStateUpdated**
```typescript
on('gameStateUpdated', (data) => {
  // data: MatchState
})
```

**turnCompleted**
```typescript
on('turnCompleted', (turn) => {
  // turn: Turn
  // { playerIndex, footballerName, result, scoreAfter }
})
```

**legFinished**
```typescript
on('legFinished', (data) => {
  // data: { winner: 0 | 1, legWins: [n, n] }
})
```

**matchFinished**
```typescript
on('matchFinished', (data) => {
  // data: { winner: 0 | 1 }
})
```

**error**
```typescript
on('error', (data) => {
  // data: { code: string, message: string }
})
```

---

## Data Flow

### Complete Game Turn Flow (Sequence Diagram)

```
CLIENT                              SERVER                      DATABASE
  │                                   │                            │
  │ 1. User selects footballer         │                            │
  ├──────────────────────────────────>│                            │
  │                                   │ 2. Validate footballer      │
  │                                   │────────────────────────────>│
  │                                   │<────────────────────────────│
  │                                   │ 3. Get stat value           │
  │                                   │                            │
  │ 4. User submits answer            │                            │
  ├──────────────────────────────────>│                            │
  │                                   │ 5. evaluateAnswer()        │
  │                                   │    (pure game logic)       │
  │                                   │                            │
  │                                   │ 6. submitAnswer()          │
  │                                   │    (state machine)         │
  │                                   │                            │
  │                                   │ 7. Save game state        │
  │                                   │────────────────────────────>│
  │                                   │<────────────────────────────│
  │                                   │                            │
  │ 8. gameStateUpdated event        │                            │
  │<──────────────────────────────────│                            │
  │                                   │                            │
  │ 9. Render updated state           │                            │
  │                                   │                            │
```

### Turn Result Handling

```typescript
// Server receives answer submission
socket.on('submitAnswer', ({ footballerId, statValue }) => {
  const currentState = games[gameId].state;

  // Validate
  if (!isValidFootballer(footballerId)) {
    socket.emit('error', { code: 'INVALID_PLAYER' });
    return;
  }

  // Game logic (pure functions)
  const newState = submitAnswer(
    currentState,
    currentPlayerIndex,
    footballerId,
    footballerName,
    statValue
  );

  // Save to database
  await db.update(games)
    .set({ state: newState, updatedAt: new Date() })
    .where(eq(games.id, gameId));

  // Broadcast to both clients
  io.to(gameId).emit('gameStateUpdated', newState);
  io.to(gameId).emit('turnCompleted', {
    turn: newState.legs[currentLegIndex].turns[turnIndex],
    newScore: newState.legs[currentLegIndex].players[currentPlayerIndex].score
  });

  // Check for game-over conditions
  if (newState.phase === 'FINISHED') {
    io.to(gameId).emit('matchFinished', { winner: newState.winner });
  }
});
```

---

## Deployment Architecture

### Development Setup

```
┌─────────────┐         ┌─────────────┐
│ npm/pnpm    │         │ npm/pnpm    │
│ dev server  │         │ build       │
├─────────────┤         ├─────────────┤
│ Client:3000 │◄────────┤ Server:3001 │
└─────────────┘         └─────────────┘
       ▲                       ▲
       │                       │
       └───────┬───────────────┘
               │
         ┌─────▼─────┐
         │ PostgreSQL│
         │ :5432     │
         └───────────┘
```

### Production Deployment (Planned)

```
┌──────────────┐
│ Nginx/Caddy  │
│ (Reverse     │
│  Proxy)      │
├──────────────┤
│ :80, :443    │
└────┬─────────┘
     │
┌────▼──────────────────────────┐
│ Node.js Application Server     │
│ (Express + Socket.IO)          │
├─────────────────────────────────┤
│ :3001 (internal)                │
│ Horizontal scaling ready        │
└────┬──────────────────────────┘
     │
┌────▼──────────────────────────┐
│ PostgreSQL Database             │
├─────────────────────────────────┤
│ Persistent game state           │
│ Player/stats data               │
└─────────────────────────────────┘
```

### Scaling Considerations (Future)

- **Horizontal Scaling**: Multiple server instances behind load balancer
- **Socket.IO Adapter**: Redis or similar for cross-instance communication
- **Database Replication**: Read replicas for query scaling
- **Caching Layer**: Redis for player data, stat lookups
- **CDN**: Static assets (JavaScript, CSS)

---

## Key Design Decisions & Rationale

### 1. Pure State Machine in Game Engine

**Decision**: Implement game rules as pure functions with immutable state.

**Rationale**:
- Testable without mocks or complex setup
- Deterministic replay possible
- Natural fit for real-time events
- No hidden side effects or race conditions
- Easy to debug and reason about

### 2. JSONB for Game State

**Decision**: Store entire game state in JSONB column, not relational tables.

**Rationale**:
- Game state is complex and nested
- Avoids complex multi-table queries
- Natural fit for TypeScript objects
- Version-safe (state shape changes over time)
- Quick snapshots for replay/audit

### 3. Socket.IO for Real-time

**Decision**: Use Socket.IO for game events instead of polling.

**Rationale**:
- Low latency for game updates
- Bidirectional communication
- Handles reconnection gracefully
- Cross-browser compatibility
- Wide ecosystem and stability

### 4. Drizzle ORM

**Decision**: Use Drizzle ORM instead of raw SQL or other ORMs.

**Rationale**:
- Type-safe SQL queries
- Minimal runtime overhead
- Excellent TypeScript support
- No heavy abstractions
- Lightweight for serverless-ready code

### 5. Vue 3 Frontend

**Decision**: Use Vue 3 with Composition API and Pinia.

**Rationale**:
- Gentle learning curve
- Excellent TypeScript support
- Reactive data binding simplifies UI updates
- Composables enable code reuse
- Pinia is modern, lightweight state management

---

## Future Enhancements

### Short Term
- [ ] Complete REST API endpoints
- [ ] Socket.IO event handlers
- [ ] Pinia stores implementation
- [ ] Game history view
- [ ] Player profile view

### Medium Term
- [ ] Player search optimization (full-text search)
- [ ] Leaderboards and rankings
- [ ] Game replay and analysis tools
- [ ] Mobile responsive design
- [ ] Analytics and tracking

### Long Term
- [ ] AI opponent
- [ ] Tournament support
- [ ] Mobile apps (iOS/Android)
- [ ] Game variations and modes
- [ ] Community features (chat, tournaments)

---

## Conclusion

Footy 501's architecture emphasizes:
- **Clarity**: Pure functions, immutable state, clear separation of concerns
- **Scalability**: State machine design ready for horizontal scaling
- **Testability**: Game logic isolated, easy to unit test
- **Type Safety**: TypeScript throughout for fewer runtime errors

The design supports both current MVP development and future scaling needs.

---

**For more details**, see:
- [GAME_RULES.md](./GAME_RULES.md) — Game rule specifications
- [server/README.md](../server/README.md) — Backend setup guide
- [client/README.md](../client/README.md) — Frontend setup guide
