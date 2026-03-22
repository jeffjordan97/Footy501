# Footy 501 - Documentation Index

**Last Updated**: March 2025

This document provides an overview of all Footy 501 documentation and guides you to the right resource for your needs.

## Quick Links

| Need | Document |
|------|----------|
| **Getting Started** | [../README.md](../README.md) |
| **How to Play** | [GAME_RULES.md](./GAME_RULES.md) |
| **System Design** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **AI Agents** | [AGENTS.md](./AGENTS.md) |
| **Deployment** | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| **Backend Setup** | [../server/README.md](../server/README.md) |
| **Frontend Setup** | [../client/README.md](../client/README.md) |

---

## Documentation Structure

### Root Level

#### [README.md](../README.md) - Main Project README
**Purpose**: Project overview and getting started guide

**Contains**:
- High-level overview of Footy 501
- Tech stack summary
- Project structure
- Prerequisites and quick start
- Running tests
- Game rules summary (links to detailed rules)
- Development roadmap (Phase 1-5)

**When to Read**: First time setting up the project, understanding project scope

---

### docs/ Directory

#### [GAME_RULES.md](./GAME_RULES.md) - Complete Game Rules
**Purpose**: Detailed specification of all game rules and mechanics

**Contains**:
- Game concept and overview
- Match vs. leg structure
- Match formats (Best of 1, 3, 5)
- Turn structure and timer
- Scoring system (valid scores, maximum values)
- Bust rules (4 types: over 180, impossible scores, below checkout, bogey numbers)
- Checkout rules and close finish mechanics
- Timeout escalation (4 levels + forfeit)
- Duplicate player protection
- Stat categories
- Target scores
- Turn result reference table
- Game phases (leg and match)
- Technical implementation notes for developers
- Planned variations and edge cases

**When to Read**: Understanding game mechanics, implementing features, debugging rule violations

**Key Sections**:
- [Turn Structure](./GAME_RULES.md#turn-structure)
- [Scoring System](./GAME_RULES.md#scoring-system)
- [Bust Rules](./GAME_RULES.md#bust-rules)
- [Timeout Escalation](./GAME_RULES.md#timeout-escalation)
- [Close Finish Rule](./GAME_RULES.md#close-finish-rule)

---

#### [AGENTS.md](./AGENTS.md) - AI Agent Reference
**Purpose**: Complete guide to all AI agents available in the project

**Contains**:
- Quick reference table of all 12 agents
- When to use each agent with Football501-specific examples
- Agent workflow patterns for common tasks (feature dev, performance, accessibility)
- Model selection guide (opus/sonnet/haiku)
- Source attribution

**When to Read**: Understanding which AI agent to use for a task, setting up agent workflows

---

#### [ARCHITECTURE.md](./ARCHITECTURE.md) - System Architecture
**Purpose**: Comprehensive system design and implementation guide

**Contains**:
- System overview (client-server architecture)
- Frontend architecture (Vue 3, Vite, routing, state management)
- Backend architecture (Express, Socket.IO, database)
- Game engine design (pure state machine, immutable patterns)
- Database schema (ER diagram, table descriptions)
- API design (REST endpoints, WebSocket events)
- Data flow (turn sequence diagram)
- Deployment architecture
- Key design decisions and rationale

**When to Read**: Understanding system design, adding new features, scaling considerations

**Key Sections**:
- [Game Engine Design](./ARCHITECTURE.md#game-engine-design)
- [Database Schema](./ARCHITECTURE.md#database-schema)
- [API Design](./ARCHITECTURE.md#api-design)
- [Data Flow](./ARCHITECTURE.md#data-flow)
- [Key Design Decisions](./ARCHITECTURE.md#key-design-decisions--rationale)

---

### Server Directory

#### [server/README.md](../server/README.md) - Server Setup & Development
**Purpose**: Backend-specific setup, API, and development guide

**Contains**:
- Server overview and responsibilities
- Tech stack details
- Project structure
- Quick start (setup, database, running)
- NPM scripts
- Game engine module documentation
- Database details and schema
- API endpoints (planned)
- WebSocket events (planned)
- Testing guide
- Development guidelines
- Debugging tips
- Troubleshooting
- Performance considerations
- Deployment instructions

**When to Read**: Setting up backend, implementing API endpoints, game engine development

**Key Sections**:
- [Quick Start](../server/README.md#quick-start)
- [Game Engine](../server/README.md#game-engine)
- [Database](../server/README.md#database)
- [Testing](../server/README.md#testing)
- [API Endpoints (Planned)](../server/README.md#api-endpoints-planned)

---

### Client Directory

#### [client/README.md](../client/README.md) - Client Setup & Development
**Purpose**: Frontend-specific setup, components, and development guide

**Contains**:
- Client overview and responsibilities
- Tech stack details
- Project structure
- Quick start (setup, running, building)
- NPM scripts
- Routes and views
- Component deep dives
- State management (Pinia)
- Composables for reusable logic
- Styling with Tailwind CSS
- API integration
- Environment configuration
- Development guidelines
- Type safety patterns
- Testing (planned)
- Debugging tips
- Troubleshooting
- Deployment instructions

**When to Read**: Setting up frontend, implementing views/components, styling

**Key Sections**:
- [Quick Start](../client/README.md#quick-start)
- [Routes & Views](../client/README.md#routes)
- [State Management](../client/README.md#state-management-pinia---planned)
- [Composables](../client/README.md#composables)
- [API Integration](../client/README.md#api-integration)

---

## By Role/Task

### I'm New to the Project

1. Read [../README.md](../README.md) - Project overview
2. Read [GAME_RULES.md](./GAME_RULES.md) - How the game works
3. Choose your focus area:
   - **Backend**: [../server/README.md](../server/README.md)
   - **Frontend**: [../client/README.md](../client/README.md)

### I'm Implementing Game Rules

1. Reference [GAME_RULES.md](./GAME_RULES.md) - Rule specifications
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md#game-engine-design) - How rules are implemented
3. Review [../server/README.md](../server/README.md#game-engine) - Game engine modules

### I'm Building a Feature

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
2. Read [GAME_RULES.md](./GAME_RULES.md) - Relevant game mechanics
3. Role-specific guide:
   - **Backend**: [../server/README.md](../server/README.md)
   - **Frontend**: [../client/README.md](../client/README.md)

### I'm Debugging a Bug

1. Identify the area:
   - **Game logic**: [GAME_RULES.md](./GAME_RULES.md) for rule verification
   - **Backend**: [../server/README.md](../server/README.md#debugging)
   - **Frontend**: [../client/README.md](../client/README.md#debugging)

### I'm Adding a New Endpoint

1. Review [ARCHITECTURE.md](./ARCHITECTURE.md#api-design) - API design
2. Follow [../server/README.md](../server/README.md#adding-new-game-rules) - Development patterns
3. Update [ARCHITECTURE.md](./ARCHITECTURE.md#api-design) with new endpoint

### I'm Setting Up the Environment

1. Start with [../README.md](../README.md#getting-started) - Project-level setup
2. Follow role-specific setup:
   - **Backend**: [../server/README.md](../server/README.md#quick-start)
   - **Frontend**: [../client/README.md](../client/README.md#quick-start)

### I'm Deploying the Application

1. **Backend**: [../server/README.md](../server/README.md#deployment)
2. **Frontend**: [../client/README.md](../client/README.md#deployment)
3. **Infrastructure**: [ARCHITECTURE.md](./ARCHITECTURE.md#deployment-architecture)

---

## Documentation Map

```
Footy501/
├── README.md                           ← START HERE
│
├── docs/
│   ├── DOCUMENTATION_INDEX.md          ← YOU ARE HERE
│   ├── GAME_RULES.md                   ← Game mechanics
│   ├── AGENTS.md                       ← AI agent reference
│   ├── DEPLOYMENT.md                   ← Deployment guide
│   └── ARCHITECTURE.md                 ← System design
│
├── server/
│   ├── README.md                       ← Backend guide
│   ├── src/
│   │   ├── index.ts                    ← Server entry
│   │   └── lib/game-engine/
│   │       ├── types.ts                ← Type definitions
│   │       ├── rules.ts                ← Game constants
│   │       ├── scoring.ts              ← Score logic
│   │       ├── timer.ts                ← Timeout logic
│   │       └── engine.ts               ← State machine
│   └── ...
│
└── client/
    ├── README.md                       ← Frontend guide
    ├── src/
    │   ├── main.ts                     ← App entry
    │   ├── router/index.ts             ← Routes
    │   ├── views/                      ← Pages
    │   ├── components/                 ← Components
    │   ├── stores/                     ← Pinia (planned)
    │   ├── composables/                ← Reusable logic
    │   └── lib/game-engine/            ← Shared engine
    └── ...
```

---

## Key Concepts Reference

### Game Concepts

| Concept | Reference |
|---------|-----------|
| **Leg** | [GAME_RULES.md#game-structure](./GAME_RULES.md#game-structure) |
| **Match** | [GAME_RULES.md#game-structure](./GAME_RULES.md#game-structure) |
| **Turn** | [GAME_RULES.md#turn-structure](./GAME_RULES.md#turn-structure) |
| **Bust** | [GAME_RULES.md#bust-rules](./GAME_RULES.md#bust-rules) |
| **Checkout** | [GAME_RULES.md#checkout-rules](./GAME_RULES.md#checkout-rules) |
| **Close Finish** | [GAME_RULES.md#close-finish-rule](./GAME_RULES.md#close-finish-rule) |
| **Timeout Escalation** | [GAME_RULES.md#timeout-escalation](./GAME_RULES.md#timeout-escalation) |

### Technical Concepts

| Concept | Reference |
|---------|-----------|
| **State Machine** | [ARCHITECTURE.md#game-engine-design](./ARCHITECTURE.md#game-engine-design) |
| **Immutability** | [ARCHITECTURE.md#1-pure-state-machine-in-game-engine](./ARCHITECTURE.md#1-pure-state-machine-in-game-engine) |
| **Pure Functions** | [../server/README.md#game-engine](../server/README.md#game-engine) |
| **WebSocket** | [ARCHITECTURE.md#websocket-events-planned](./ARCHITECTURE.md#websocket-events-planned) |
| **Database Schema** | [ARCHITECTURE.md#database-schema](./ARCHITECTURE.md#database-schema) |
| **Vue 3 Composition** | [../client/README.md#component-structure](../client/README.md#component-structure) |

---

## Common Tasks Checklist

### Adding a New Game Rule

- [ ] Add constant to [../server/src/lib/game-engine/rules.ts](../server/src/lib/game-engine/rules.ts)
- [ ] Add validation logic to [../server/src/lib/game-engine/scoring.ts](../server/src/lib/game-engine/scoring.ts)
- [ ] Update state machine in [../server/src/lib/game-engine/engine.ts](../server/src/lib/game-engine/engine.ts)
- [ ] Add unit tests to [../server/src/lib/game-engine/*.test.ts](../server/src/lib/game-engine/)
- [ ] Document in [GAME_RULES.md](./GAME_RULES.md)
- [ ] Update [ARCHITECTURE.md](./ARCHITECTURE.md) if necessary

### Implementing a New API Endpoint

- [ ] Design endpoint in [ARCHITECTURE.md#api-design](./ARCHITECTURE.md#api-design)
- [ ] Create route handler in [../server/src/routes/](../server/src/routes/)
- [ ] Add validation/middleware as needed
- [ ] Write integration tests
- [ ] Document in [../server/README.md#api-endpoints-planned](../server/README.md#api-endpoints-planned)

### Creating a New Component

- [ ] Create Vue component in [../client/src/components/](../client/src/components/)
- [ ] Use `<script setup>` with TypeScript
- [ ] Add scoped styles
- [ ] Consider extracting logic to composables
- [ ] Document in [../client/README.md](../client/README.md)

### Adding a New Route

- [ ] Add route to [../client/src/router/index.ts](../client/src/router/index.ts)
- [ ] Create view component in [../client/src/views/](../client/src/views/)
- [ ] Document in [../client/README.md#routes](../client/README.md#routes)

---

## Glossary

**Bust**: A turn where the player's answer results in an invalid score (over 180, impossible score, below checkout, or bogey number). The score reverts and play passes to opponent.

**Checkout**: Reaching 0 (or -1 to -10) points. Completes a leg.

**Close Finish**: Final turn given to second player after first player checks out to try to match or beat the score.

**Consecutive Timeout**: Number of turns in a row where a player allowed the timer to expire.

**Leg**: A single game from starting score to checkout. Match consists of multiple legs.

**Match**: Series of legs played in a "best of" format (best of 1, 3, or 5).

**Stat Value**: Points deducted from score based on correct answer (footballer's stat: goals, appearances, clean sheets, etc.).

**Timeout**: Player does not submit answer before timer expires.

**Turn**: One player's opportunity to answer a question and score points.

---

## Contributing to Documentation

To keep documentation accurate:

1. Update relevant docs when code changes
2. Use consistent formatting and terminology
3. Include code examples where appropriate
4. Link to related sections
5. Keep freshn ess timestamps updated
6. Test all links and code samples

See [../CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

---

## FAQ

**Q: Where do I find game rules?**
A: [GAME_RULES.md](./GAME_RULES.md) - Complete rule specifications.

**Q: How do I set up the dev environment?**
A: [../README.md#getting-started](../README.md#getting-started) for project-level, then [../server/README.md](../server/README.md) or [../client/README.md](../client/README.md).

**Q: Where is the game engine code?**
A: [../server/src/lib/game-engine/](../server/src/lib/game-engine/) - Pure state machine implementation.

**Q: How does real-time sync work?**
A: [ARCHITECTURE.md#websocket-events-planned](./ARCHITECTURE.md#websocket-events-planned) - WebSocket event design.

**Q: What's the database schema?**
A: [ARCHITECTURE.md#database-schema](./ARCHITECTURE.md#database-schema) - ER diagram and table descriptions.

**Q: How do I run tests?**
A: [../server/README.md#testing](../server/README.md#testing) for backend, [../client/README.md#testing-planned](../client/README.md#testing-planned) for frontend.

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| March 2025 | 1.0 | Initial comprehensive documentation |

---

**Last Updated**: March 2025
**Documentation Status**: CURRENT
**Coverage**: Comprehensive (all major systems documented)
