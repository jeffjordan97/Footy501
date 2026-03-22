# Footy 501 - Client

Vue 3 frontend application for Footy 501. Single-page application with real-time game updates, player search, and responsive game interface.

## Overview

The client is responsible for:
- Game user interface and interactions
- Real-time game state rendering
- Player selection and answer submission
- Timer display and countdown
- Game history and stats display
- WebSocket communication with server

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **Vite** - Lightning-fast build tool and dev server
- **Vue Router 4.x** - Client-side routing
- **Pinia** - State management (planned)
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **Socket.IO Client** - Real-time WebSocket communication
- **Fuse.js** - Fuzzy string search for player lookup
- **TypeScript 5.x** - Type safety

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- pnpm 8+ ([install](https://pnpm.io/installation))
- Backend server running on port 3001

## Project Structure

```
src/
├── main.ts                        # App entrypoint
├── App.vue                        # Root component
├── style.css                      # Global styles (Tailwind)
│
├── router/
│   └── index.ts                   # Vue Router configuration
│
├── views/                         # Page-level components
│   ├── HomeView.vue               # Home/menu screen
│   ├── PlayLocalView.vue          # Local game setup (planned)
│   ├── PlayOnlineView.vue         # Online game setup (planned)
│   ├── PlayDailyView.vue          # Daily challenge (planned)
│   └── GameView.vue               # Active game screen
│
├── components/
│   ├── game/                      # Game-specific components
│   │   ├── GameHeader.vue         # Score, timer, player info
│   │   ├── GameBoard.vue          # Question display
│   │   ├── PlayerSearch.vue       # Fuzzy player search
│   │   ├── StatCategorySelect.vue # Stat category picker
│   │   ├── SubmitButton.vue       # Answer submission
│   │   └── TurnHistory.vue        # Turn log
│   │
│   ├── layout/                    # Layout components
│   │   ├── Header.vue             # Page header
│   │   ├── Footer.vue             # Page footer
│   │   └── Navigation.vue         # Nav menu
│   │
│   └── lobby/                     # Lobby components
│       ├── GameLobby.vue          # Game waiting room
│       ├── PlayerSetup.vue        # Player name entry
│       └── GameConfig.vue         # Match configuration
│
├── stores/                        # Pinia state management (planned)
│   ├── gameStore.ts               # Game state
│   ├── playerStore.ts             # Player data
│   └── uiStore.ts                 # UI state
│
├── composables/                   # Reusable Vue logic
│   ├── useSocket.ts               # Socket.IO integration
│   ├── useGameState.ts            # Game state composable
│   ├── usePlayerSearch.ts         # Player search logic
│   └── useTimer.ts                # Timer countdown logic
│
├── lib/                           # Utility libraries
│   └── game-engine/               # Game engine (sync with server)
│       ├── types.ts
│       ├── rules.ts
│       ├── scoring.ts
│       └── engine.ts
│
└── assets/                        # Images, fonts, etc.
    ├── images/
    └── fonts/

public/
├── index.html                     # HTML entry point
├── favicon.ico
└── ...

vite.config.ts                     # Vite configuration
tsconfig.json                      # TypeScript configuration
tailwind.config.js                 # Tailwind CSS configuration
```

## Quick Start

### 1. Install Dependencies

```bash
cd client
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

App will open at `http://localhost:3000` with hot reload enabled.

### 3. Build for Production

```bash
pnpm build
```

Outputs to `dist/` directory.

### 4. Preview Production Build

```bash
pnpm preview
```

## NPM Scripts

```bash
pnpm dev          # Start dev server with hot reload
pnpm build        # Build for production
pnpm preview      # Preview production build locally
pnpm test         # Run tests (when configured)
```

## Routes

Vue Router configuration in `src/router/index.ts`:

| Route | Name | Component | Purpose |
|-------|------|-----------|---------|
| `/` | home | HomeView.vue | Main menu, game mode selection |
| `/play/local` | play-local | PlayLocalView.vue | Local multiplayer setup |
| `/play/online` | play-online | PlayOnlineView.vue | Online game setup |
| `/play/daily` | play-daily | PlayDailyView.vue | Daily challenge |
| `/game/:id` | game | GameView.vue | Active game interface |

## Key Components

### GameView.vue (Active Game Screen)

Main game interface with score display, timer, player search, and answer submission.

### PlayerSearch.vue (Fuzzy Search)

Fuzzy string matching using Fuse.js for finding footballers by name.

### GameHeader.vue (Score & Timer)

Displays both players' scores, current player indicator, leg number, and countdown timer.

## State Management (Planned)

Pinia stores for:
- Game state (scores, turns, legs)
- Player data (search results, stats)
- UI state (modals, notifications)

## API Integration

### REST Endpoints

- `GET /api/health` - Health check
- `GET /api/players/search?q=query` - Search players
- `GET /api/players/:id/stats` - Get player stats
- `GET /api/games` - Game history

### WebSocket Events

**Client → Server**:
- `submitAnswer` - Submit answer with footballer and stat value
- `handleTimeout` - Timeout occurred
- `joinGame` - Join a game
- `leaveGame` - Leave the game

**Server → Client**:
- `gameStateUpdated` - Game state changed
- `turnCompleted` - Turn finished
- `legFinished` - Leg finished
- `matchFinished` - Match completed
- `error` - Error occurred

## Styling

Tailwind CSS for responsive utility-first styling. Global styles in `src/style.css`.

## Development Guidelines

- TypeScript for all code
- Composition API with `<script setup>`
- Type-safe props and emits
- Comprehensive error handling
- Reusable composables for logic

## Environment Variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Footy 501
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari 12+, Chrome Android latest

## Deployment

### Build for Production

```bash
pnpm build
```

### Static Hosting

Deploy `dist/` directory to:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

Set `VITE_API_URL` environment variable to backend URL.

## Contributing

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)

---

**Last Updated**: March 2025
**Current Phase**: Phase 1 (Core Engine & Database)
