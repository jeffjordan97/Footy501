# Footy 501 - AI Agent Reference

**Last Updated**: March 2026

This document describes all AI agents available in the project, when to use each one, and how they work together.

---

## Quick Reference

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| **architect** | opus | Architectural decisions | System design, scalability, trade-offs |
| **code-reviewer** | opus | After writing/modifying code | Quality, security, maintainability review |
| **security-reviewer** | opus | Before commits with sensitive code | Vulnerability detection, OWASP compliance |
| **typescript-pro** | opus | TypeScript architecture/typing | Advanced types, generics, strict safety |
| **frontend-developer** | inherit | Creating/fixing UI components | Vue/React patterns, state, responsive design |
| **javascript-pro** | inherit | JS optimization, async debugging | ES6+, Node.js APIs, event loop patterns |
| **accessibility-expert** | inherit | Auditing/building accessible UI | WCAG compliance, screen readers, keyboard nav |
| **performance-engineer** | inherit | Optimization, scalability | Profiling, caching, load testing, Core Web Vitals |
| **deployment-engineer** | haiku | CI/CD setup, deployment automation | Pipelines, GitOps, containers, zero-downtime |
| **dx-optimizer** | sonnet | Project setup, workflow friction | Tooling, onboarding, build optimization |
| **incident-responder** | sonnet | Production incidents | Rapid resolution, post-mortems, SRE practices |
| **mermaid-expert** | haiku | Visual documentation | Flowcharts, ERDs, sequence diagrams |

---

## Pre-existing Agents (Project-level)

### architect

**When to use**: Planning new features, making technology choices, evaluating trade-offs between approaches, designing system boundaries.

**Football501 examples**:
- Designing the multiplayer game session architecture
- Evaluating WebSocket vs SSE for real-time updates
- Planning database schema changes for new game modes
- Structuring the monorepo for shared code

### code-reviewer

**When to use**: Immediately after writing or modifying code. Automatically triggered for all code changes.

**Football501 examples**:
- Reviewing game engine state machine changes
- Checking Vue component patterns and composition API usage
- Validating Express route handlers and middleware
- Reviewing Drizzle ORM query patterns

### security-reviewer

**When to use**: Before commits that touch authentication, user input handling, API endpoints, or WebSocket events.

**Football501 examples**:
- Reviewing Socket.IO event handlers for injection
- Checking REST API input validation
- Auditing database queries for SQL injection
- Reviewing player authentication flow

---

## New Agents (from wshobson/agents)

### typescript-pro

**When to use**: Working on complex TypeScript types, generics, or strict type safety patterns. Use proactively for TypeScript architecture decisions.

**Football501 examples**:
- Designing shared type definitions in `shared/types/`
- Creating generic game engine interfaces
- Optimizing TSConfig for the monorepo
- Building type-safe Drizzle ORM schemas
- Creating utility types for game state transformations

### javascript-pro

**When to use**: Working with Node.js async patterns, event loop optimization, or complex JavaScript patterns.

**Football501 examples**:
- Optimizing Socket.IO event handling with async/await
- Debugging race conditions in multiplayer game state
- Improving Express middleware chains
- Optimizing Fuse.js fuzzy search performance

### frontend-developer

**When to use**: Creating or fixing UI components, implementing responsive layouts, handling client-side state management.

**Football501 examples**:
- Building new Vue 3 components with Composition API
- Implementing Pinia store patterns for game state
- Optimizing component rendering performance
- Setting up Vite build optimizations
- Implementing real-time UI updates via Socket.IO
- Tailwind CSS responsive design for game views

### accessibility-expert

**When to use**: Auditing accessibility, building accessible components, ensuring inclusive user experiences. Use proactively when building game UI.

**Football501 examples**:
- Ensuring game timer is accessible to screen readers
- Making player search input keyboard-navigable
- Adding ARIA labels to score displays and game controls
- Color contrast verification for the game theme
- Ensuring turn notifications work with assistive tech
- Making lobby and game configuration forms accessible

### deployment-engineer

**When to use**: Setting up CI/CD pipelines, configuring deployment automation, containerizing the application.

**Football501 examples**:
- Creating GitHub Actions workflows for the monorepo
- Setting up Docker containers for server + database
- Configuring deployment pipelines for staging/production
- Automating database migrations in deployment
- Setting up environment-specific configurations

### dx-optimizer

**When to use**: Setting up new project tooling, reducing development friction, optimizing build and test times.

**Football501 examples**:
- Optimizing pnpm workspace scripts
- Setting up git hooks for linting and type checking
- Improving hot reload speed in Vite dev server
- Creating helpful CLI commands for common tasks
- Streamlining the dev environment setup process

### incident-responder

**When to use**: When production issues occur with the multiplayer game service. Use immediately for outages.

**Football501 examples**:
- Diagnosing Socket.IO connection drops in production
- Investigating game state desync between players
- Resolving database connection pool exhaustion
- Managing WebSocket scaling issues under load
- Post-mortem analysis after multiplayer outages

### performance-engineer

**When to use**: Profiling and optimizing application performance, setting up monitoring, load testing.

**Football501 examples**:
- Profiling game engine state transitions for speed
- Load testing Socket.IO with concurrent game sessions
- Optimizing PostgreSQL queries with Drizzle ORM
- Frontend Core Web Vitals optimization
- Caching player search results and game data
- Setting up performance monitoring dashboards

### mermaid-expert

**When to use**: Creating visual documentation, architecture diagrams, or process flow charts.

**Football501 examples**:
- Game state machine diagrams
- Database ER diagrams
- Turn sequence diagrams (player → server → opponent)
- WebSocket event flow charts
- Deployment architecture diagrams
- User journey maps for game flows

---

## Agent Workflow Patterns

### Feature Development

```
planner → typescript-pro → frontend-developer/javascript-pro → code-reviewer → security-reviewer
```

1. **planner** creates implementation plan
2. **typescript-pro** designs type interfaces
3. **frontend-developer** or **javascript-pro** implements
4. **code-reviewer** reviews for quality
5. **security-reviewer** checks for vulnerabilities

### Performance Optimization

```
performance-engineer → code-reviewer → deployment-engineer
```

1. **performance-engineer** profiles and identifies bottlenecks
2. Implement optimizations
3. **code-reviewer** validates changes
4. **deployment-engineer** sets up performance monitoring in CI

### Accessibility Audit

```
accessibility-expert → frontend-developer → code-reviewer
```

1. **accessibility-expert** audits current components
2. **frontend-developer** implements remediation
3. **code-reviewer** validates the fixes

### Documentation

```
mermaid-expert → architect
```

1. **mermaid-expert** creates visual diagrams
2. **architect** reviews for accuracy

### Production Incident

```
incident-responder → performance-engineer → deployment-engineer
```

1. **incident-responder** leads rapid triage and fix
2. **performance-engineer** investigates root cause
3. **deployment-engineer** deploys fix with rollback capability

---

## Model Selection Guide

| Model | Cost | Speed | Best For |
|-------|------|-------|----------|
| **opus** | Highest | Slowest | Deep reasoning: architecture, security, complex types |
| **sonnet** | Medium | Medium | Complex coding: DX optimization, incident response |
| **haiku** | Lowest | Fastest | Operational: deployment configs, diagrams |
| **inherit** | Parent | Parent | Flexible: uses whatever the parent context runs |

---

## Source Attribution

Agents `typescript-pro`, `javascript-pro`, `frontend-developer`, `accessibility-expert`, `deployment-engineer`, `dx-optimizer`, `incident-responder`, `performance-engineer`, and `mermaid-expert` are sourced from [wshobson/agents](https://github.com/wshobson/agents) (MIT License).

Agents `architect`, `code-reviewer`, and `security-reviewer` are project-specific agents.
