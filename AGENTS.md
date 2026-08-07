<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Thread — project conventions

Reddit lead-intelligence + AI-citation (GEO) platform. Full spec: `reddit-geo-tool-prd.md`. Wedge: GEO-first, Reddit-as-tactic (PRD §1.4).

## Build order (PRD §6) — do not skip ahead

1. Migrations + RLS first (`supabase/migrations/`), before any UI.
2. `lib/reddit/` — provider-agnostic `RedditReader`/`RedditWriter`. Every other module talks to the interface, never to `RedditOfficialProvider` directly. `FixtureProvider` backs all tests.
3. `lib/scoring/` — pure, separately-testable functions, golden set as fixtures. No network calls inside scoring logic.
4. `lib/compliance/` — deterministic rules (regex + rule flags) first; an LLM check is a second layer, never the only layer.
5. UI (feed, opportunity detail, draft composer, settings, onboarding) only after 1–4 exist.
6. Trigger.dev workers last, wrapping already-tested pure functions.

## Hard rules

- **Server actions for mutations.** No client-side writes to Supabase outside of auth.
- **Zod at every boundary** — API routes, server actions, LLM structured outputs.
- **No `any`.**
- **All LLM calls go through `lib/ai/client.ts`** (single chokepoint) with logging, cost accounting, and `prompt_version` tagging. Never call the Anthropic SDK directly from a route/component.
- **No secrets in client components.** Reddit tokens are encrypted at rest and never returned to the browser (PRD §4.6).
- **All dates UTC in the DB**, localized only at render time.
- **RLS on every table**, keyed to `user_id` (directly or via a join chain to `projects.user_id`). See `supabase/migrations/20260806182824_init_schema.sql` for the pattern — global cache tables (`subreddits`, `posts`) are read-all-authenticated, write-service-role-only instead.

## Safety invariants (PRD §2.4, §5.2) — never relax these

- No autonomous posting. Nothing posts a comment without a human clicking, ever.
- No bulk/automated DM sending.
- Compliance false-negatives are P0 (a false negative = a real ban risk shown as safe).
- Refuse account-farming / aged-account / sockpuppet / upvote-exchange requests even if a user asks.

## Stack

Next.js 15 (App Router) · Supabase (Postgres/Auth/pgvector) + Drizzle ORM for typed queries · Trigger.dev for background jobs · Anthropic API (Haiku for volume scoring, Sonnet for drafting/profiling) · shadcn/ui + Tailwind v4 · Vitest (unit) + Playwright (e2e).

- Drizzle schema (`src/db/schema.ts`) mirrors the SQL migrations by hand — the migration is the source of truth for schema + RLS, Drizzle is the typed read/write surface. Don't run `drizzle-kit push`.
- `pnpm eval:scoring` / `pnpm eval:replies` run the §3.3 eval gates — wire these into CI before any prompt/model change ships.
