# Footy 501 - Server

Backend Express.js server for Footy 501 with game engine, database integration, and real-time communication via Socket.IO.

## Overview

The server is responsible for:
- Game state management and enforcement of rules
- Real-time game updates via WebSocket (Socket.IO)
- Player and stats data persistence
- Game history tracking
- Business logic and validation

## Tech Stack

- **Node.js** 18+ - JavaScript runtime
- **Express 5.x** - Web framework
- **Socket.IO 4.x** - Real-time communication
- **PostgreSQL** - Relational database
- **Drizzle ORM** - Type-safe SQL queries
- **TypeScript 5.x** - Type safety
- **Vitest** - Unit testing

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- pnpm 8+ ([install](https://pnpm.io/installation))
- PostgreSQL 14+ ([download](https://www.postgresql.org/))

## Project Structure

```
src/
├── index.ts                 # Server entrypoint
├── lib/
│   ├── game-engine/         # Game logic (pure state machine)
│   │   ├── types.ts         # Type definitions
│   │   ├── rules.ts         # Game constants
│   │   ├── scoring.ts       # Score evaluation
│   │   ├── timer.ts         # Timeout escalation
│   │   ├── engine.ts        # State machine
│   │   └── *.test.ts        # Unit tests
│   └── football-data/       # Football data utilities (planned)
├── db/
│   ├── schema/              # Drizzle table definitions
│   │   ├── players.ts       # Player table
│   │   ├── teams.ts         # Team/club table
│   │   ├── player-stats.ts  # Player statistics
│   │   └── games.ts         # Game records
│   ├── migrations/          # Database migrations
│   ├── seed/                # Data seeding scripts
│   │   └── import-players.ts
│   └── client.ts            # Database connection (planned)
├── routes/                  # REST API routes (planned)
│   ├── health.ts
│   ├── players.ts
│   ├── games.ts
│   └── stats.ts
├── services/                # Business logic (planned)
│   ├── PlayerService.ts
│   ├── GameService.ts
│   └── StatService.ts
├── websocket/               # Socket.IO handlers (planned)
│   └── handlers.ts
└── middleware/              # Express middleware (planned)
    ├── errorHandler.ts
    └── validation.ts

tests/
├── game-engine/             # Game engine unit tests
│   ├── scoring.test.ts
│   ├── timer.test.ts
│   ├── engine.test.ts
│   └── rules.test.ts
└── integration/             # Integration tests (planned)
    └── api.test.ts

drizzle.config.ts           # Drizzle ORM config
vitest.config.ts            # Test runner config
tsconfig.json               # TypeScript config
.env.example                # Environment variables
```

## Quick Start

### 1. Install Dependencies

```bash
cd server
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
PORT=3001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/footy501
```

### 3. Set Up Database

**Create the database:**
```bash
createdb footy501
```

**Run migrations:**
```bash
pnpm db:migrate
```

**Seed with player data (optional):**
```bash
pnpm db:seed
```

### 4. Start Development Server

```bash
pnpm dev
```

Server will start on `http://localhost:3001` with hot-reload enabled.

**Check health:**
```bash
curl http://localhost:3001/api/health
# Response: { "status": "ok" }
```

## NPM Scripts

```bash
pnpm dev              # Start dev server with hot reload
pnpm build            # Build TypeScript to dist/
pnpm start            # Run built server
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once (CI mode)
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:seed          # Seed database with player data
```

## Game Engine

The game engine is the heart of Footy 501. It's implemented as a pure state machine with immutable data patterns.

### Core Modules

**types.ts** - Type definitions
```typescript
// Game state
interface MatchState { config, legs, currentLegIndex, legWins, phase, winner }
interface LegState { legNumber, players, currentPlayerIndex, turns, usedPlayerIds, phase }
interface GamePlayer { id, name, score, consecutiveTimeouts, timerDuration }
interface Turn { playerIndex, footballerName, statValue, scoreAfter, result }

// Turn results
type TurnResult =
  | 'VALID'
  | 'CHECKOUT'
  | 'BUST_OVER_180'
  | 'BUST_IMPOSSIBLE_SCORE'
  | 'BUST_BELOW_CHECKOUT'
  | 'BUST_BOGEY_NUMBER'
  | 'DUPLICATE_PLAYER'
  | 'TIMEOUT'
```

**rules.ts** - Game constants
```typescript
MAX_STAT_VALUE = 180                      // Max points per turn
IMPOSSIBLE_SCORES = Set([163, 166, ...])  // Impossible darts scores
BOGEY_NUMBERS = Set([159, 162, ...])      // No valid checkout
CHECKOUT_MIN = -10                        // Overshoot limit
DEFAULT_TIMER_DURATION = 45               // Seconds per turn
TIMEOUT_ESCALATION = [45, 45, 30, 15]     // Timer penalties
MAX_CONSECUTIVE_TIMEOUTS = 4              // Match forfeit threshold
```

**scoring.ts** - Score evaluation (pure functions)
```typescript
evaluateAnswer(currentScore, statValue, options)
  → { result: TurnResult, newScore: number }

// Predicates
isOver180(statValue) → boolean
isImpossibleScore(remainingScore) → boolean
isBogeyNumber(remainingScore) → boolean
isInCheckoutRange(score) → boolean
```

**timer.ts** - Timeout escalation (pure functions)
```typescript
updateTimeoutState(consecutiveTimeouts, timedOut)
  → { consecutiveTimeouts, timerDuration }

isMatchForfeit(consecutiveTimeouts) → boolean
getTimeoutMessage(consecutiveTimeouts) → string
```

**engine.ts** - State machine (pure functions)
```typescript
// Factory
createMatch(config) → MatchState
createLeg(legNumber, targetScore, timerDuration) → LegState

// Actions
submitAnswer(state, playerIndex, footballerId, name, value) → MatchState
handleTimeout(state, playerIndex) → MatchState
determineLegWinner(state) → MatchState
startNewLeg(state) → MatchState
```

### Game Flow Example

```typescript
import { createMatch, submitAnswer, handleTimeout } from './lib/game-engine/engine'

// Create a new match
const config = {
  id: 'match-123',
  targetScore: 501,
  statCategory: { /* ... */ },
  matchFormat: 1,  // Best of 1
  timerDuration: 45,
  enableBogeyNumbers: false,
  tiebreakerTarget: 50,
}

let state = createMatch(config)
// state: { config, legs: [leg1], currentLegIndex: 0, legWins: [0,0], phase: 'PLAYING', winner: null }

// Player 0 submits answer
state = submitAnswer(state, 0, 'messi-id', 'Messi', 45)
// state.legs[0].players[0].score → 456
// state.legs[0].currentPlayerIndex → 1

// Player 1 timeouts
state = handleTimeout(state, 1)
// state.legs[0].players[1].consecutiveTimeouts → 1
// state.legs[0].currentPlayerIndex → 0

// Player 0 submits and checks out
state = submitAnswer(state, 0, 'ronaldo-id', 'Ronaldo', 456)
// state.legs[0].phase → 'CLOSE_FINISH'
// state.legs[0].currentPlayerIndex → 1
// Player 1 gets one final turn

// Player 1 checks out with -5
state = submitAnswer(state, 1, 'neymar-id', 'Neymar', 451)
// Winner: Player 1 (closer to 0)
// state.phase → 'FINISHED'
// state.winner → 1
```

## Database

PostgreSQL database for persistent player and game data.

### Schema Overview

**players** - Football players
```typescript
id (uuid): Primary key
name (text): Player name
normalizedName (text): Lowercased for search
nationality (text): Player nationality
position (text): Player position
createdAt (timestamp): Record creation time
```

**teams** - Football clubs/teams
```typescript
id (uuid): Primary key
name (text): Team name
league (text): League name
country (text): Country
season (text): Season (e.g., "2023-24")
createdAt (timestamp): Record creation time
```

**player_stats** - Player statistics by team and season
```typescript
id (uuid): Primary key
playerId (uuid): Foreign key to players
teamId (uuid): Foreign key to teams
season (text): Season
statType (text): Stat type (GOALS, APPEARANCES, etc.)
appearances (integer): Number of appearances
goals (integer): Goals scored
assists (integer): Assists
cleanSheets (integer): Clean sheets (defensive stats)
createdAt (timestamp): Record creation time
```

**games** - Game records and state
```typescript
id (uuid): Primary key
status (text): "waiting", "playing", "finished", "abandoned"
config (jsonb): Match configuration (immutable)
state (jsonb): Current game state (mutable)
createdAt (timestamp): Game creation time
updatedAt (timestamp): Last update time
```

### Migrations

Database migrations are versioned in `src/db/migrations/`. Run with:

```bash
pnpm db:generate   # Generate migrations from schema changes
pnpm db:migrate    # Run pending migrations
```

### Seeding

Import player data from external sources:

```bash
pnpm db:seed
```

The seeding script in `src/db/seed/import-players.ts` handles:
- Player data import from CSV or API
- Team/league mapping
- Stat normalization
- Duplicate handling

## API Endpoints (Planned)

### Health Check

```
GET /api/health
Response: { status: "ok" }
```

### Player Search

```
GET /api/players/search?q=messi
Response: {
  success: true
  data: [
    { id, name, nationality, position },
    ...
  ]
}
```

### Get Player Stats

```
GET /api/players/:id/stats
Query: season, team, category
Response: {
  success: true
  data: [
    { playerId, teamId, season, statType, appearances, goals, ... },
    ...
  ]
}
```

### Game Endpoints

```
POST /api/games                    # Create new game
GET /api/games/:id                # Get game by ID
GET /api/games                    # List games (pagination)
PUT /api/games/:id/state         # Update game state
```

## WebSocket Events (Planned)

### Client → Server

```typescript
socket.emit('submitAnswer', {
  footballerId: string
  footballerName: string
  statValue: number
})

socket.emit('handleTimeout', {})

socket.emit('joinGame', {
  gameId: string
  playerName: string
})

socket.emit('leaveGame', {})
```

### Server → Client

```typescript
socket.on('gameStateUpdated', (state: MatchState) => {})
socket.on('turnCompleted', (turn: Turn) => {})
socket.on('legFinished', (data: { winner: 0 | 1 }) => {})
socket.on('matchFinished', (data: { winner: 0 | 1 }) => {})
socket.on('error', (data: { code: string, message: string }) => {})
```

## Testing

Tests are written with Vitest. Run with:

```bash
# Watch mode
pnpm test

# Run once (CI)
pnpm test:run

# With coverage
pnpm test -- --coverage
```

### Test Files

Game engine tests in `src/lib/game-engine/`:

```typescript
// scoring.test.ts
describe('scoring', () => {
  test('accepts valid score deduction', () => {
    const result = evaluateAnswer(501, 45, { enableBogeyNumbers: false })
    expect(result.result).toBe('VALID')
    expect(result.newScore).toBe(456)
  })

  test('busts on over 180', () => {
    const result = evaluateAnswer(300, 190, { enableBogeyNumbers: false })
    expect(result.result).toBe('BUST_OVER_180')
  })
})

// engine.test.ts
describe('game engine', () => {
  test('creates match with correct initial state', () => {
    const match = createMatch(validConfig)
    expect(match.phase).toBe('PLAYING')
    expect(match.legWins).toEqual([0, 0])
    expect(match.legs).toHaveLength(1)
  })
})
```

### Test Coverage Target

Minimum **80% coverage** for:
- Game engine logic (types, rules, scoring, timer)
- State machine transitions
- Business logic

Integration tests cover:
- API endpoints
- Socket.IO events
- Database operations

## Development Guidelines

### Code Style

- TypeScript for all code
- Immutable data patterns (no mutations)
- Pure functions in game engine
- Files under 800 lines
- Comprehensive error handling

### Naming Conventions

```typescript
// Functions: camelCase
submitAnswer()
evaluateAnswer()
updateTimeoutState()

// Constants: UPPER_SNAKE_CASE
MAX_STAT_VALUE = 180
IMPOSSIBLE_SCORES = Set([...])
DEFAULT_TIMER_DURATION = 45

// Types: PascalCase
interface MatchState
interface GamePlayer
type TurnResult
```

### Adding New Game Rules

1. Update constants in `rules.ts` if needed
2. Add validation logic to `scoring.ts`
3. Update state machine in `engine.ts` if state shape changes
4. Add unit tests in `*.test.ts`
5. Update [GAME_RULES.md](../docs/GAME_RULES.md) documentation

### Adding Database Schema

1. Update table definitions in `src/db/schema/`
2. Generate migration: `pnpm db:generate`
3. Run migration: `pnpm db:migrate`
4. Create or update services for data access

## Environment Variables

**PORT** - Server port (default: 3001)
```
PORT=3001
```

**CLIENT_URL** - Client origin for CORS
```
CLIENT_URL=http://localhost:3000
```

**DATABASE_URL** - PostgreSQL connection string
```
DATABASE_URL=postgresql://user:password@localhost:5432/footy501
```

## Debugging

### Enable Console Logging

Add to `index.ts`:
```typescript
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`)

  socket.on('submitAnswer', (data) => {
    console.log('[Game] Answer submitted:', data)
  })
})
```

### Watch Database Queries

Enable Drizzle logging:
```typescript
// In db/client.ts
import { sql } from 'drizzle-orm'

db.on('query', ({ query, params }) => {
  console.log('[SQL]', query.string, params)
})
```

### Test Game Engine in Isolation

```bash
# Run a single test file
pnpm test src/lib/game-engine/engine.test.ts

# Run specific test
pnpm test -t "submitAnswer accepts valid turns"
```

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
1. Check PostgreSQL is running: `pg_isrunning`
2. Verify connection string in `.env`
3. Check database exists: `createdb footy501`

### Migration Error

```
Error: no such table: migrations
```

**Solution**:
```bash
# Drizzle will create migrations table automatically
pnpm db:migrate
```

### Test Failures

```bash
# Clear vitest cache and re-run
pnpm test -- --clearScreen
```

## Performance Considerations

### Indexing

Player search indexed on `normalizedName`:
```sql
CREATE INDEX players_normalized_name_idx ON players (normalized_name);
```

For fuzzy search, enable pg_trgm extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX players_normalized_name_trgm_idx ON players USING GIN (normalized_name gin_trgm_ops);
```

### Query Optimization

- Use parameterized queries (Drizzle handles this)
- Eager load related data
- Limit result sets (pagination)
- Cache frequently accessed data (future: Redis)

### Scaling

- Horizontal scaling: Multiple server instances
- Load balancer: Nginx/HAProxy
- Socket.IO adapter: Redis for cross-instance sync
- Database replication: Read replicas for scale

## Deployment

### Build for Production

```bash
pnpm build
```

Outputs to `dist/` directory.

### Start Production Server

```bash
NODE_ENV=production pnpm start
```

### Docker (Planned)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --prod
COPY dist ./dist
EXPOSE 3001
CMD ["pnpm", "start"]
```

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on:
- Code style
- Testing requirements
- Commit message format
- Pull request process

## Resources

- [GAME_RULES.md](../docs/GAME_RULES.md) - Detailed game rules
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System design
- [Express Documentation](https://expressjs.com/)
- [Socket.IO Documentation](https://socket.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Last Updated**: March 2025
**Current Phase**: Phase 1 (Core Engine & Database)
