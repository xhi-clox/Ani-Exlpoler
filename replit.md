# AniStream

A full-stack anime streaming web application. Browse trending and seasonal anime, search titles, view details with episode lists, watch episodes with an HLS video player, comment on episodes, and sync watch history to MyAnimeList.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/anime-stream run dev` — run the frontend (port 26167)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already provisioned)
- Optional env: `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET` — for MyAnimeList OAuth2 sync

## Deployment

- **Frontend (Vercel)**: project root is the repository root; `vercel.json` sets the install/build commands and publishes `artifacts/anime-stream/dist/public`. Set `VITE_API_SERVER_URL` (for example `https://analithe-api.onrender.com/api`) in the Vercel project env vars so the built bundle knows where the API lives.
- **API (Render)**: `render.yaml` builds `@workspace/api-server` from the repository root and starts `artifacts/api-server/dist/index.mjs`. Set `DATABASE_URL` (Render Postgres) and `JWT_SECRET`; Render injects `PORT`. Migrations run automatically on boot.
- Health check: `GET /api/healthz`.
- Local env template: `.env.example`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter (routing), TanStack Query, Tailwind CSS, hls.js
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (comments table)
- Anime data: Jikan API (api.jikan.moe/v4) — free, no key needed
- Streams: @consumet/extensions AnimeKai provider
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/comments.ts` — comments table schema
- `artifacts/api-server/src/routes/anime.ts` — trending, recent, search, details, stream
- `artifacts/api-server/src/routes/comments.ts` — episode comments CRUD
- `artifacts/api-server/src/routes/mal.ts` — MAL OAuth2 + sync
- `artifacts/anime-stream/src/` — React frontend
- `artifacts/api-server/build.mjs` — esbuild config (@consumet/extensions externalized)

## Architecture decisions

- **Jikan API over @consumet scrapers**: @consumet scraper providers (Gogoanime, HiAnime) are blocked from Replit's IPs (HTTP 522). Jikan (api.jikan.moe) is the official MAL data API — reliable, free, no key required.
- **@consumet/extensions externalized in esbuild**: `got-scraping` (a dependency of consumet) is ESM-only and can't be bundled by esbuild. Added `"@consumet/extensions"` and `"got-scraping"` to the `external` list in `build.mjs`.
- **Comments stored in Postgres**: Using the built-in Replit Postgres DB instead of Supabase to avoid requiring extra credentials.
- **MAL OAuth uses PKCE**: Code verifiers stored in-memory (Map) — ephemeral and fine for development. Tokens returned as query params on redirect to frontend, stored in localStorage.

## Product

- Home page: trending anime (Jikan top anime) + current season releases
- Search: full-text anime search powered by Jikan
- Anime detail: cover art, synopsis, genres, episode grid
- Watch page: HLS video player (hls.js), MAL progress sync at 85%, episode navigation, real-time comments
- Comments: per-episode comment threads stored in PostgreSQL

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **@consumet scraper blocked**: HiAnime/Gogoanime scraper returns HTTP 522 from Replit. Always use Jikan for metadata. Only use @consumet for stream sources.
- **Jikan rate limit**: 3 req/sec, 60/min. Don't hammer it in tight loops.
- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
