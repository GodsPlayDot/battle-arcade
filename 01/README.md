# Battle Arcade

Battle Arcade is a single browser-game launcher with four independent games. Each game runs in its own frame, preventing its React version, styles, controls, and local save data from affecting the others.

## Included games

- **Grid Combat** — isometric tactical battles with AI opponents.
- **Spin Arena** — loadout-driven top combat.
- **Slime Arcade** — slime battles and arcade mini-games.
- **Ascension Chess** — a local 3D chess RPG with board, army, AI, and rules configuration.

## Features

- Arcade profile with XP, exploration progress, achievements, recent games, and favorites.
- Game search, play-style filters, session-length guidance, and a resume panel.
- One production build that bundles the launcher and all four games.
- No API key is required for Ascension Chess.

## Requirements

- Node.js 20 or later
- npm

## Run locally

Install dependencies for the launcher and each included game:

```bash
npm ci
npm ci --prefix games/grid-combat
npm ci --prefix games/spin-arena
npm ci --prefix games/slime-arcade
npm ci --prefix games/ascension-chess
```

Run the quality checks and create the production build:

```bash
npm run check
npm run build
npm run preview -- --port 4173
```

Open the displayed local URL. The generated `dist/` directory contains the deployable site and is intentionally not committed.

## Project layout

```text
src/                    Arcade launcher UI
games/                  Source for the four included games
public/                 Shared static assets
scripts/build-hub.mjs   Combines game builds into the launcher build
QA_PLAN.md              Gameplay test matrix
GAMEPLAY_REVIEW.md      Game-specific observations and recommendations
```

## GitHub

The repository includes a GitHub Actions workflow that installs dependencies, runs `npm run check`, and builds the production bundle on pushes and pull requests. See `.gitignore` for intentionally excluded local and generated files.
