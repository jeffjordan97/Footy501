# Footy 501

A modern web-based game that combines darts scoring mechanics with football trivia. Players answer football questions to score points that count down from a target score (typically 501), mirroring the structure of traditional darts. The first player to reach zero wins the leg.

## Overview

Footy 501 blends trivia knowledge with strategic decision-making. Each correct answer deducts stat values (appearances, goals, clean sheets, etc.) from a player's remaining score. Miss the checkout or bust, and it's your opponent's turn. With features like timeout escalation, bogey number rules, and close-finish mechanics, every game is competitive and engaging.

**Live Demo:** Coming soon
**Documentation:** See [docs/](./docs/) directory for detailed guides

## Tech Stack

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Lightning-fast build tool and dev server
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Tailwind CSS** - Utility-first styling
- **Socket.IO Client** - Real-time communication
- **Fuse.js** - Fuzzy search for player lookup

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Minimal and flexible web framework
- **Socket.IO** - Real-time bidirectional communication
- **PostgreSQL** - Relational database
- **Drizzle ORM** - SQL database toolkit
- **TypeScript** - Typed JavaScript

### Development & Testing
- **TypeScript** - Static type checking
- **Vitest** - Unit test framework
- **tsx** - TypeScript execution for Node.js

## Project Structure

```
Footy501/
├── client/                  # Vue 3 frontend application
│   ├── src/
│   │   ├── components/     # Vue components (game, layout, lobby)
│   │   ├── views/          # Page-level components
│   │   ├── router/         # Vue Router configuration
│   │   ├── stores/         # Pinia state management (planned)
│   │   ├── lib/            # Utility libraries
│   │   ├── assets/         # Images, fonts
│   │   └── main.ts         # App entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                  # Express backend application
│   ├── src/
│   │   ├── index.ts        # Server entrypoint
│   │   ├── lib/
│   │   │   ├── game-engine/   # Core game logic (state machine, rules, scoring)
│   │   │   └── football-data/ # Football data utilities (planned)
│   │   ├── db/
│   │   │   ├── schema/     # Drizzle ORM table definitions
│   │   │   ├── migrations/ # Database migrations
│   │   │   └── seed/       # Data seeding scripts
│   │   ├── routes/         # Express route handlers (planned)
│   │   ├── services/       # Business logic services (planned)
│   │   └── websocket/      # Socket.IO event handlers (planned)
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts   # ORM configuration
│   ├── vitest.config.ts    # Test configuration
│   └── .env.example        # Environment variables template
│
└── docs/                    # Project documentation
    ├── GAME_RULES.md       # Detailed game rules
    └── ARCHITECTURE.md     # System architecture guide
```

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **pnpm** 8+ ([install](https://pnpm.io/installation))
- **PostgreSQL** 14+ ([download](https://www.postgresql.org/download/))

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/footy501.git
cd footy501
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
pnpm install

# Install client dependencies
cd ../client
pnpm install
```

### 3. Set Up Environment Variables

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
PORT=3001
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/footy501
```

### 4. Set Up Database

```bash
cd server

# Create database
createdb footy501

# Run migrations
pnpm db:migrate

# Seed with player data (optional)
pnpm db:seed
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd server
pnpm dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
pnpm dev
# Runs on http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Running Tests

### Server Tests
```bash
cd server

# Run all tests
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run with coverage
pnpm test -- --coverage
```

### Client Tests
```bash
cd client

# Tests are configured but not yet implemented
pnpm test
```

## Game Rules Summary

Footy 501 combines darts rules with football trivia:

- **Start**: Both players begin with 501 points
- **Turns**: Players alternate turns answering football questions
- **Scoring**: Correct answers deduct stat values (goals, appearances, clean sheets, etc.) from the score
- **Bust Rules**:
  - Score over 180 → bust
  - Landing on impossible darts scores → bust
  - Overshooting below -10 → bust
  - (Optional) Landing on bogey numbers → bust
- **Checkout**: Reach 0 (or -1 to -10) to win the leg
- **Close Finish**: If Player 1 checks out, Player 2 gets a final turn to try to match or beat the score
- **Timeout Escalation**: Missing turns triggers timer penalties (45s → 45s → 30s → 15s → forfeit)
- **Match Formats**: Best of 1, 3, or 5 legs

For detailed rules, see [docs/GAME_RULES.md](./docs/GAME_RULES.md).

## Development Roadmap

### Phase 1: Core Game Engine (CURRENT)
- [x] Game state machine and scoring logic
- [x] Database schema for players and games
- [x] Basic Express server with Socket.IO
- [ ] WebSocket event handlers for game actions
- [ ] Database query services

### Phase 2: MVP Frontend
- [ ] Home and lobby views
- [ ] Local game (same device, turn-based)
- [ ] Game UI and player answer submission
- [ ] Real-time game state updates
- [ ] Game history and stats tracking

### Phase 3: Online Multiplayer
- [ ] Player authentication and accounts
- [ ] Online matchmaking
- [ ] Real-time multiplayer sync
- [ ] Player profiles and leaderboards
- [ ] Game invitations and social features

### Phase 4: Advanced Features
- [ ] Daily challenges
- [ ] Replay and analysis tools
- [ ] Mobile responsive design
- [ ] Advanced statistics and analytics
- [ ] Custom game modes and variants

### Phase 5: Polish & Scale
- [ ] Performance optimization
- [ ] Mobile app (React Native or Flutter)
- [ ] AI opponent
- [ ] Tournament support
- [ ] Cloud deployment

## Documentation

- **[GAME_RULES.md](./docs/GAME_RULES.md)** - Detailed game rules, constants, and edge cases
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and data flow
- **[server/README.md](./server/README.md)** - Backend setup and development
- **[client/README.md](./client/README.md)** - Frontend setup and development

## Development Guidelines

### Code Style
- TypeScript for all new code
- Immutable data patterns (no mutations)
- Pure functions in game engine
- Small, focused files (<800 lines)
- Comprehensive error handling

### Testing
- Minimum 80% code coverage
- Unit tests for business logic
- Integration tests for APIs
- Test-driven development for new features

### Commits
Follow conventional commit format:
```
<type>: <description>

<optional body>

Types: feat, fix, refactor, docs, test, chore, perf, ci
```

## Key Design Decisions

### Game Engine Architecture
The game engine is implemented as a **pure state machine** using immutable data structures:
- No side effects in game logic
- State transitions are deterministic
- Easy to test and reason about
- Natural fit for Socket.IO events

### Database Design
- PostgreSQL with Drizzle ORM
- Normalized schema for player data
- JSONB columns for game state snapshots
- Migration-based schema versioning

### Real-time Communication
- Socket.IO for bidirectional events
- CORS configured for cross-origin requests
- Events correspond to game actions (submitAnswer, handleTimeout, etc.)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Submit a pull request with a clear description

## License

MIT

## Questions & Support

For questions, issues, or feedback, please open an issue on GitHub or contact the development team.

---

**Last Updated**: March 2025
**Current Phase**: Phase 1 (Core Engine & Database)
