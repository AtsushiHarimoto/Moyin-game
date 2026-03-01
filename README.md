# Moyin Game

🌏 **Languages:** [English](README.md) | [日本語](docs/README.ja.md) | [繁體中文](docs/README.zh-TW.md)

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Part of Moyin Ecosystem](https://img.shields.io/badge/Moyin-Ecosystem-blue)](https://github.com/AtsushiHarimoto/Moyin-Factory)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-monorepo-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

**An AI-driven visual novel engine where every playthrough is unique.** Players interact with LLM-powered characters through branching narratives, with a deterministic append-only state model that ensures full session replay.

> **[Part of the Moyin Ecosystem](https://github.com/AtsushiHarimoto/Moyin-Factory)** -- Moyin Game is the interactive runtime within the larger Moyin creative platform.

---

## Table of Contents

- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Key Technical Decisions](#key-technical-decisions)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Internationalization](#internationalization)
- [Testing Strategy](#testing-strategy)
- [Moyin Ecosystem](#moyin-ecosystem)
- [License](#license)

---

## Architecture

```mermaid
graph TB
    subgraph Client["apps/web (React 19)"]
        Player["Player Input"]
        UI["UI Layer<br/>Pixi.js / Three.js / React"]
        Store["Zustand Stores"]
    end

    subgraph Engine["packages/vn-engine"]
        Runtime["VN Runtime<br/>Execution Engine"]
        Session["Session Manager"]
        Replay["Replay Engine"]
        Memory["Memory System<br/>Facts / Embedding / Vector Store"]
        Persistence["Persistence<br/>IndexedDB via Dexie"]
    end

    subgraph LLM["packages/llm-sdk"]
        Orchestrator["Orchestrator"]
        Streaming["Streaming Handler"]
        Quality["Quality Scoring"]
        Repair["JSON Repair"]
        Templates["Prompt Templates"]
    end

    subgraph Adapters["LLM Adapters"]
        ChatGPT["ChatGPT"]
        Gemini["Gemini"]
        Grok["Grok"]
        Ollama["Ollama<br/>(Offline)"]
    end

    subgraph Shared["packages/shared + packages/net-client"]
        Types["Shared Types"]
        HTTP["HTTP Client<br/>Dedup / Retry"]
    end

    Player -->|"text / choice"| Runtime
    Runtime -->|"proposal request"| Orchestrator
    Orchestrator --> Streaming
    Streaming --> Adapters
    Orchestrator --> Quality
    Orchestrator --> Repair
    Orchestrator --> Templates
    Quality -->|"accept / reject"| Runtime
    Runtime -->|"append event"| Session
    Session --> Memory
    Session --> Persistence
    Session --> Replay
    Runtime --> Store
    Store --> UI
    Orchestrator --> HTTP
    UI --> Player

    style Client fill:#1a1a2e,stroke:#e94560,color:#fff
    style Engine fill:#16213e,stroke:#0f3460,color:#fff
    style LLM fill:#0f3460,stroke:#533483,color:#fff
    style Adapters fill:#533483,stroke:#e94560,color:#fff
    style Shared fill:#1a1a2e,stroke:#533483,color:#fff
```

### Core Loop

```
Player Input --> VN Engine --> LLM SDK (proposal) --> Quality Judge --> Accept/Reject
                                                                          |
                                                              [Accept] Append to Session State
                                                              [Reject] Re-request from LLM
```

The LLM acts purely as a **proposal generator**. Every response is validated by the Quality Judge before being committed to the append-only session log. This separation ensures narrative consistency even across different LLM providers.

---

## Monorepo Structure

```
moyin-game/
├── apps/
│   └── web/                    @moyin/web        Game client (React 19 + Vite)
├── packages/
│   ├── llm-sdk/                @moyin/llm-sdk    Multi-provider LLM integration
│   ├── vn-engine/              @moyin/vn-engine   Visual novel engine core
│   ├── net-client/             @moyin/net-client  HTTP client with dedup & retry
│   └── shared/                 @moyin/shared      Shared types and utilities
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── eslint.config.mjs
```

| Package | Responsibility |
|---------|---------------|
| **`@moyin/web`** | React 19 game client with Pixi.js/Three.js rendering, Zustand state management, React Router 7 routing, TanStack Query data fetching, Tailwind CSS 4, Framer Motion + GSAP animations, i18next (5 languages), Playwright E2E + VRT |
| **`@moyin/llm-sdk`** | Provider-agnostic LLM integration with adapters for ChatGPT, Gemini, Grok, and Ollama. Includes streaming support, malformed JSON repair, quality scoring, recording/replay, and prompt template management |
| **`@moyin/vn-engine`** | Visual novel runtime with execution engine, session management, replay engine, backlog management, memory system (facts, embeddings, vector store, summaries), and IndexedDB persistence via Dexie |
| **`@moyin/net-client`** | HTTP client layer with request deduplication, automatic retry, error handling, tracing, and i18n-aware error messages |
| **`@moyin/shared`** | Cross-package TypeScript types and utility functions |

---

## Key Technical Decisions

### 1. Append-Only Session State
All game events are immutably appended to a session log. No state is ever overwritten. This guarantees:
- **Deterministic replay** -- any session can be replayed from its event log to reproduce the exact game state
- **Debugging** -- full traceability of every state transition
- **Save/Load** -- session persistence is simply serializing the event log

### 2. LLM as Proposal Generator
The LLM never directly mutates game state. Instead:
1. The engine sends context to the LLM SDK
2. The LLM generates a **proposal** (dialogue, choices, emotional shifts)
3. The **Quality Judge** scores and validates the proposal
4. Only accepted proposals are committed as events

This architecture means swapping LLM providers (or going offline with Ollama) does not affect game integrity.

### 3. Offline-First Design
- All session data persists in **IndexedDB** (via Dexie)
- **Ollama adapter** enables fully offline play with local models
- No server dependency for core gameplay

### 4. Multi-Provider LLM Strategy
Four adapters with a unified interface:
- **ChatGPT** -- primary cloud provider
- **Gemini** -- alternative cloud provider
- **Grok** -- alternative cloud provider
- **Ollama** -- local/offline provider

Streaming, JSON repair, and quality scoring work identically across all providers.

### 5. Memory Architecture
The VN Engine maintains a layered memory system:
- **Facts** -- discrete world-state facts extracted from dialogue
- **Summaries** -- compressed narrative context for long sessions
- **Embeddings + Vector Store** -- semantic search over past events for contextual recall

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.7 |
| Build | Vite 6, pnpm 9 workspaces |
| State | Zustand 5 |
| Routing | React Router 7 |
| Data Fetching | TanStack Query 5 |
| 2D Rendering | Pixi.js 8 |
| 3D Rendering | Three.js + React Three Fiber 9, Rapier 3D physics |
| Animation | Framer Motion 11, GSAP 3 |
| Styling | Tailwind CSS 4, CVA, clsx |
| Persistence | Dexie 3 (IndexedDB) |
| i18n | i18next + react-i18next |
| Testing | Vitest (unit), Playwright (E2E + VRT) |
| Linting | ESLint 9, typescript-eslint |

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (project uses pnpm 9.15.4)

### Installation

```bash
# Clone the repository
git clone https://github.com/AtsushiHarimoto/Moyin-game.git
cd Moyin-game

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The dev server starts at `http://localhost:8001`.

### Build for Production

```bash
pnpm build
pnpm preview
```

---

## Scripts

| Command | Description |
|---------|------------|
| `pnpm dev` | Start the web app dev server (port 8001) |
| `pnpm build` | Build the web app for production |
| `pnpm preview` | Preview the production build |
| `pnpm test` | Run all unit tests across packages |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type-check all packages (via `tsc --noEmit`) |
| `pnpm clean` | Remove all `dist/` and `node_modules/` |

---

## Internationalization

Moyin Game supports 5 languages out of the box:

| Code | Language |
|------|----------|
| `en` | English |
| `ja` | Japanese |
| `zh-CN` | Simplified Chinese |
| `zh-HK` | Traditional Chinese (Hong Kong) |
| `zh-TW` | Traditional Chinese (Taiwan) |

Language detection is automatic via `i18next-browser-languagedetector`.

---

## Testing Strategy

- **Unit Tests** -- Vitest across all packages (`pnpm test`)
- **E2E Tests** -- Playwright for full user-flow testing (`pnpm test:e2e`)
- **Visual Regression Testing (VRT)** -- Pixel-level screenshot comparison via Playwright + pixelmatch
- **Type Safety** -- Strict TypeScript with `tsc --noEmit` checks across the monorepo

---

## Moyin Ecosystem

Moyin Game is one component of the **Moyin Ecosystem**, a suite of tools for AI-powered interactive storytelling.

| Repository | Description |
|-----------|------------|
| [**Moyin Factory**](https://github.com/AtsushiHarimoto/Moyin-Factory) | Ecosystem hub and orchestration |
| [**Moyin Game**](https://github.com/AtsushiHarimoto/Moyin-game) | AI-driven visual novel engine (this repo) |

---

## License

This work is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

See [LICENSE](./LICENSE) for the full text.
