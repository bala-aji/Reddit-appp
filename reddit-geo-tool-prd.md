# PRD — "Thread" (working name)
### Reddit lead-intelligence + AI-citation (GEO) platform
**Version:** 0.1 (build spec for Claude Code)
**Owner:** Balaganesh Rahavan
**Date:** 6 Aug 2026
**Status:** Draft for build — assumptions marked `[ASSUMPTION]`, open decisions marked `[DECIDE]`

---

## 0. Assumptions I made (flip any of these before we build)

| # | Assumption | Why |
|---|---|---|
| A1 | Stack: Next.js 15 (App Router) + Supabase (Postgres/Auth/Storage/pgvector) + Vercel + Trigger.dev for background jobs | Matches your existing muscle memory; fastest path with Claude Code |
| A2 | LLM: Claude (Haiku for volume scoring, Sonnet for reply drafting) via Anthropic API | Cost curve works; you already build this way |
| A3 | **Bring-Your-Own Reddit account** — each user OAuths their own Reddit account, and *their* token pays *their* rate limit | The only economically viable model (see §4.2). Non-negotiable architecturally. |
| A4 | Reply flow is **draft → human reviews → copy/post**, never fully autonomous | Ban-safety is the product's core promise |
| A5 | Global pricing in USD, Stripe (not Razorpay) | Buyers are US/EU indie SaaS founders |
| A6 | Solo build, 6-week MVP target | Your usual cadence |

`[DECIDE]` — Positioning wedge. See §1.4. Do not skip this; a straight clone loses.

---

## 1. Executive Summary

### 1.1 Problem Statement
Founders know Reddit is now the highest-leverage acquisition channel — it dominates Google page-one for buyer-intent queries and is the single most-cited source in LLM answers — but finding the right threads costs 2–4 hrs/day of manual browsing, and one badly-judged promotional comment gets the account banned and the domain shadow-filtered.

### 1.2 Proposed Solution
A monitoring + scoring + drafting workspace that watches all of Reddit for a product's intent signals, scores each thread on **two axes (buyer intent × citation potential)**, drafts a rule-compliant, value-first reply in the user's voice, and tracks whether that reply later shows up in Google SERPs and in ChatGPT/Perplexity/Claude answers — closing the loop from "comment posted" to "cited by AI."

### 1.3 Success Criteria (measurable)

| KPI | Target at day 90 |
|---|---|
| Precision@10 on opportunity feed (user marks "relevant") | ≥ 70% |
| Median time from thread creation → appearing in user's feed | ≤ 25 min |
| % of drafted replies posted with ≤ 1 user edit | ≥ 50% |
| Account-action rate (removal/ban) among active users | ≤ 2% of posted replies |
| Blended LLM + data cost per active user / month | ≤ $2.20 |
| Week-4 retention of paying users | ≥ 55% |
| First tracked AI citation per user | ≤ 30 days from first reply |

### 1.4 Positioning wedge `[DECIDE]`
RedditGrow, GummySearch, ReplyGuy, Syften, OctoLens, F5Bot and ~10 others already exist. Cloning feature-for-feature means competing on ads and SEO against an incumbent with a 12-month content head start. Three wedges, ranked by my confidence:

1. **Agency-native multi-client (strongest).** Every incumbent is built for one founder / one product. Agencies running Reddit for 8 clients are stuck in spreadsheets. Ship: client workspaces, per-client account pools, approval queues, white-label weekly client report PDF, per-client billing rollup. Price $199–499/mo instead of $19. Fewer customers, 10× ARPU, and it's the segment least served.
2. **GEO-first, Reddit-as-tactic.** Sell "AI visibility" as the outcome and Reddit as one of several surfaces (add Quora, Stack Overflow, HN, YouTube comments, G2). The category ("answer engine optimization") is where budget is moving in 2026; "Reddit tool" is a crowded feature.
3. **Developer/agent-native.** MCP server + CLI + webhooks as the *primary* interface, dashboard secondary. Sells to the Claude Code / Cursor crowd, which is exactly your distribution. Cheap to build since the API layer exists anyway.

My call: **build the core once, launch on wedge 2's messaging, monetise wedge 1.** Wedge 3 ships free as a distribution hack.

**Decision (2026-08-06): building toward wedge 2 (GEO-first, Reddit-as-tactic).**

---

## 2. User Experience & Functionality

### 2.1 Personas

| Persona | Context | Job to be done | Willingness to pay |
|---|---|---|---|
| **Indie SaaS founder** (primary) | Pre-PMF, $0–20k MRR, no ad budget, does own marketing | Find 3–5 threads/day worth replying to; not get banned | $19–49/mo |
| **Growth marketer at seed startup** | Owns one channel experiment, needs to prove it | Attributable pipeline + a weekly slide for the founder | $99/mo |
| **Agency operator** (highest LTV) | Runs organic for 5–15 clients | Multi-client throughput, approvals, client-facing reports | $299–499/mo |
| **Non-goal persona** | Blackhat spammers, mass DM senders | — | Actively refuse; they cause the bans that kill the product |

### 2.2 Core user flows

**Onboarding (target: ≤ 4 min to first scored opportunity)**
1. Sign up → paste product URL
2. Crawler fetches homepage + /pricing + og tags → Claude generates a **Product Profile**: one-paragraph description, ICP, 5 problem statements, 15 candidate keywords, 12 candidate subreddits, 5 likely competitors
3. User edits/approves the profile (this screen is the whole product's accuracy ceiling — make it excellent, not skippable)
4. Connect Reddit account (OAuth) → account health check runs (age, karma, shadowban probe)
5. Backfill: last 7 days of matching posts scored → feed is populated before they leave onboarding

**Daily loop (target: ≤ 8 min/day)**
Feed sorted by composite score → open card → see thread context, why-it-matched, subreddit rules digest, and 3 tone-variant drafts → edit → Copy & Open Thread → mark Posted → reply tracked for karma, removal, SERP rank, AI citation.

### 2.3 Feature set — MVP scope

#### F1. Monitoring & ingestion
- **US1** — *As a founder, I want every new Reddit post matching my product's intent surfaced within 30 minutes, so I can be an early commenter.*
- AC:
  - Sources: `/r/{sub}/new` for pinned subs (poll ≤ 5 min), Reddit search API for keyword sweeps (≤ 15 min), comment streams for pinned subs (≤ 15 min) `[MVP: posts only, comments in v1.1]`
  - Dedupe by `reddit_fullname`; a post never appears twice across keywords
  - Per-user rate budget enforced with a token bucket; the system must degrade (widen poll interval) rather than 429
  - Ingestion lag surfaced in-app as a status pill; alert if p95 > 45 min

#### F2. Two-axis scoring
- **US2** — *As a founder, I want only threads worth my time, so I don't read 200 posts to find 3.*
- Composite score = `0.55 × intent + 0.30 × citation_potential + 0.15 × freshness_and_reach`
  - **Intent (0–10):** is this person describing a problem my product solves, or asking for a tool recommendation?
  - **Citation potential (0–10):** is this thread the type LLMs quote? (recommendation/comparison/"best X for Y" phrasing, subreddit authority, existing SERP presence, comment count trajectory)
  - **Freshness/reach:** age decay × subreddit subscriber log × current upvote velocity
- AC:
  - Three-stage funnel: (a) keyword/regex prefilter, (b) embedding cosine vs. Product Profile problem statements — `pgvector`, threshold tuned per user, (c) Claude Haiku structured scoring on the surviving ≤ 8%
  - Every score returns `reason` (≤ 25 words) and `matched_signals[]`, shown on the card. **No unexplained scores.**
  - Score is idempotent and cached per `(post_id, profile_version)`
  - `Not relevant` feedback writes to `feedback` table and adjusts that user's stage-(b) threshold + negative-keyword list within 24h

#### F3. Reply drafting
- **US3** — *As a founder, I want a reply that sounds like me and won't get removed, so I can post in under a minute.*
- AC:
  - Input context: thread title + body + top 5 comments + subreddit rules + user's Voice Profile + product profile
  - Output: 3 variants labelled by register (Helpful / Peer / Expert), each ≤ 120 words by default
  - **Hard constraints enforced post-generation by a rule-checker, not just prompt instructions:**
    - Value delivered before any product mention; product mention max once, and omitted entirely if subreddit rules prohibit self-promotion
    - No em-dash-heavy LLM cadence, no "Great question!", no bullet lists unless the thread uses them
    - Link included only if the subreddit permits links AND intent ≥ 8
  - **Voice Profile:** built from either (a) the user's last 100 public Reddit comments, or (b) 3 pasted writing samples. Stored as a distilled style card, not raw text.
  - Compliance verdict shown per draft: `Safe / Caution / Blocked` with the specific rule cited

#### F4. Subreddit intelligence
- AC: for each tracked sub — cached rules (parsed to structured flags: self-promo allowed?, links?, min account age/karma?, flair required?), best posting hours from historical top-post timestamps, moderator strictness estimate, relevance score vs. product

#### F5. Account safety
- **US4** — *As a founder, I want to know before I get banned, not after.*
- AC:
  - Health dashboard: account age, karma split (comment/post), per-sub karma, removal history
  - **Shadowban probe:** compare logged-out fetch of `/user/{name}` against authenticated fetch; daily; alert on divergence
  - Rate governor: max 3 comments/hour, max 8/day, min 12-minute spacing, jittered ±40%; hard-blocks the Post button and explains why
  - **7-day warm-up plan** for new accounts: day-by-day tasks (non-commercial comments in target subs) with completion tracking; commercial replies gated until warm-up ≥ 70% complete
  - Auto-detect removed comments (poll own comments; `body == "[removed]"`) → flag, pause posting in that sub, log to a per-sub trust score

#### F6. Google SERP tracker
- AC: user defines ≤ 25 money keywords → weekly SERP pull (SerpAPI or DataForSEO) → store Reddit URLs in top 100 with rank + delta → auto-import those threads as opportunities → track rank movement of threads the user has commented in

#### F7. AI Visibility (GEO) score — *the differentiator*
- **US5** — *As a founder, I want to know whether ChatGPT/Perplexity/Claude recommend me, and what to do about it.*
- AC:
  - Generate 20 buyer-intent probe prompts from the Product Profile ("best X for Y", "alternatives to {competitor}")
  - Weekly run against ≥ 3 engines: Perplexity API (has citations — the trustworthy one), OpenAI, Anthropic `[DECIDE: Gemini/AI Overviews via SERP provider]`
  - Per run record: brand mentioned (bool), position in list, sentiment, **cited source URLs** — flag any citation whose URL is a Reddit thread the user commented in (this is the money moment; make it a celebration event + email)
  - Score 0–100 = weighted mention rate × position quality × citation count, banded Invisible / Emerging / Strong / Dominant, with sparkline history
  - Every score ships with "next 3 moves" — specific threads/subs to target

#### F8. Brand & competitor monitor
- AC: track own brand + ≤ 20 competitor names; alert on mention; special-case "alternative to X" and "X vs Y" threads as highest-value (own card type, always top of feed)

#### F9. Notifications
- AC: instant email for score ≥ 9.0; daily digest email at user's chosen local hour; Slack webhook `[v1.1]`

#### F10. MCP server + REST API
- AC: MCP tools `list_opportunities`, `get_thread_context`, `draft_reply`, `check_compliance`, `get_visibility_score`. Bearer-token REST mirror. Publish to MCP registries — this is a distribution channel, not just a feature.

### 2.4 Explicit Non-Goals (protect the timeline and the ethics)
- ❌ **Autonomous posting.** No cron that comments without a human clicking. This is the single biggest ban and reputational risk, and it's how ReplyGuy-class tools got a bad name.
- ❌ **Bulk/automated DM sending.** Draft DMs, track them in CRM, but the send happens in Reddit's UI by the human. Reddit rate-limits and bans DM automation aggressively.
- ❌ Account farming, aged-account marketplace, upvote exchange, multi-account sockpuppeting. Refuse these requests even when users ask.
- ❌ Non-Reddit platforms in MVP (Quora/HN/X) — v2.0
- ❌ Mobile app. Responsive web only.
- ❌ Historical archive search beyond 30 days (needs Arctic Shift / third-party; v1.1)
- ❌ Team seats/RBAC in MVP (arrives with the agency tier)

---

## 3. AI System Requirements

### 3.1 Model routing & cost budget

| Job | Model | Volume/user/mo | Est. cost |
|---|---|---|---|
| Product profile extraction | Sonnet | 2 runs | $0.02 |
| Stage-b embeddings | `text-embedding-3-small` or Voyage | ~40k posts | $0.05 |
| Stage-c opportunity scoring | **Haiku**, batched 10 posts/call, structured output | ~3k posts | $0.55 |
| Reply drafting (3 variants) | Sonnet | 150 drafts | $0.75 |
| Compliance check | Haiku (+ deterministic rules first) | 150 | $0.05 |
| GEO probes | 20 prompts × 3 engines × 4 wks | 240 calls | $0.35 |
| **Total** | | | **≈ $1.77** |

Guardrails: hard per-user monthly token ceiling tied to plan; prompt caching on the Product Profile block; batch API for nightly scoring; kill-switch env var per job type.

### 3.2 Prompt architecture
- All LLM calls use **structured output** (JSON schema) with a Zod parse on the way out; a parse failure retries once at temp 0, then falls back to heuristic score and flags the row.
- Scoring prompt is versioned (`prompt_version` on every row) so evals are comparable across changes.
- Product Profile is injected as a cached prefix block, not re-templated per call.

### 3.3 Evaluation strategy (build this in week 2, not week 6)
- **Golden set:** 300 real Reddit posts across 6 verticals, hand-labelled by you for intent (0–10) and relevance (bool), plus 60 deliberate near-misses.
- **Gates before any prompt/model change ships:**
  - Precision@10 ≥ 0.70, Recall on high-intent labels ≥ 0.80
  - Spearman correlation of model intent score vs. human label ≥ 0.65
  - Compliance checker: 0 false-negatives on a 50-item set of known rule-violating drafts (a false negative = user gets banned = churn; treat as P0)
- **Reply quality:** 40-thread rubric scored 1–5 on (a) would a mod remove this, (b) does it read human, (c) does it add value before selling, (d) does it match the user's voice. Ship gate: mean ≥ 4.0, zero 1s on (a).
- **Live telemetry as the real eval:** thumbs-down rate per user, post-rate per surfaced opportunity, removal rate per posted reply. Dashboard these from day one.

---

## 4. Technical Specifications

### 4.1 Architecture

```
Next.js 15 (Vercel)  ─────────────────────► Supabase Postgres + pgvector + RLS
  App Router, server actions              ▲          ▲
  shadcn/ui + Tailwind                    │          │
        │                                 │          │
        ▼                                 │          │
  Supabase Auth (email + Google)          │          │
        │                                 │          │
        ▼                                 │          │
  Reddit OAuth (per user, refresh-token)  │          │
                                          │          │
Trigger.dev workers ──────────────────────┘          │
  ├─ ingest:poll-new-posts        (*/5 min per user) │
  ├─ ingest:keyword-search        (*/15 min)         │
  ├─ score:embed-prefilter        (queue-driven)     │
  ├─ score:llm-batch              (queue-driven) ────► Anthropic API
  ├─ safety:shadowban-probe       (daily)
  ├─ safety:reply-outcome-check   (6-hourly)
  ├─ seo:serp-rank                (weekly) ──────────► SerpAPI / DataForSEO
  └─ geo:visibility-probe         (weekly) ──────────► Perplexity / OpenAI / Anthropic

Redis (Upstash): per-user token buckets, dedupe set, job idempotency keys
Stripe: subscriptions + usage metering
Resend: transactional + digest email
```

### 4.2 The Reddit data problem — read this before writing code
This is the constraint that kills naive builds:

- Free Data API: **100 QPM per OAuth client**, ~10 QPM unauthenticated, and explicitly **non-commercial**; since Nov 2025 even free access requires pre-approval under the Responsible Builder Policy.
- Commercial tier: ~$0.24 / 1,000 calls but sold with a large annual minimum (reported five figures) and manual review — economically impossible at $19/mo pricing.
- Structural gaps regardless of tier: no date-range search, no comment search, 1,000-item listing cap, no historical data.

**Therefore:** `[A3]` every user connects their own Reddit account and all reads for that user's project execute under that user's OAuth token, inside that user's 100 QPM. Your platform token is used only for non-user-specific work (subreddit rules cache, public metadata).

Budget maths per user: 100 QPM → 144k calls/day, far more than needed. A user with 25 pinned subs polled every 5 min + 25 keyword searches every 15 min ≈ 9.6k calls/day. Comfortable.

**Be honest with yourself:** this pattern is how the category operates but it sits in a grey zone on Reddit's commercial-use language. Mitigations: (a) present it as a user-agency tool operating on the user's behalf; (b) never resell or pool Reddit data across accounts; (c) never cache post bodies longer than needed (`[DECIDE: 30-day TTL]`); (d) apply for commercial/Responsible Builder approval early — the review takes 2–4 weeks and approval is a moat; (e) budget for a third-party read provider (Apify / Xpoz / Data365, roughly $1.50–$9 per 1k records) as a fallback and for historical backfill. **Treat "Reddit changes terms" as the #1 existential risk (§5.2).**

### 4.3 Data model (core tables)

```
users              id, email, plan, created_at
reddit_accounts    id, user_id, reddit_username, access_token(enc), refresh_token(enc),
                   karma_comment, karma_post, account_created_at, shadowban_status,
                   warmup_progress, health_score, last_probed_at
projects           id, user_id, name, product_url, profile_json, profile_version,
                   voice_profile_json, negative_keywords[], embedding vector(1536)
keywords           id, project_id, term, match_type(exact|semantic), is_active
subreddits         id, name, subscribers, rules_json, allows_promo, allows_links,
                   min_account_age_days, min_karma, best_hours[], rules_fetched_at
project_subreddits project_id, subreddit_id, is_pinned, relevance_score, trust_score
posts              id, reddit_fullname UNIQUE, subreddit_id, title, body, author,
                   url, created_utc, score, num_comments, embedding vector(1536),
                   fetched_at, body_expires_at
opportunities      id, project_id, post_id, intent_score, citation_score,
                   composite_score, reason, matched_signals[], status
                   (new|saved|drafted|posted|dismissed), prompt_version, scored_at
drafts             id, opportunity_id, variant(helpful|peer|expert), body,
                   compliance_verdict, compliance_notes, was_edited, model, created_at
replies            id, draft_id, reddit_comment_fullname, posted_at, karma,
                   is_removed, removed_detected_at, serp_positions_json
competitors        id, project_id, name, aliases[]
mentions           id, project_id, post_id, kind(brand|competitor|comparison), sentiment
keywords_seo       id, project_id, term, volume, difficulty
serp_snapshots     id, keywords_seo_id, checked_at, results_json
geo_probes         id, project_id, prompt, engine, run_at, brand_mentioned, position,
                   sentiment, cited_urls[], matched_own_reply_id
visibility_scores  id, project_id, week, score, per_engine_json, next_moves_json
feedback           id, opportunity_id, user_id, verdict, note
usage_events       id, user_id, kind, qty, occurred_at   -- plan metering
```
Supabase RLS on every table keyed to `user_id`. Reddit tokens encrypted at rest (pgsodium or app-level AES-GCM with key in Vercel env) — **never** returned to the browser.

### 4.4 Integration points
| Service | Use | Fallback |
|---|---|---|
| Reddit OAuth + Data API | ingestion, account health, posting deep-links | Apify/Xpoz reader |
| Anthropic API | scoring, drafting, profiling | — |
| SerpAPI *or* DataForSEO | weekly SERP ranks, search volume | ValueSERP |
| Perplexity API | GEO probes with citations | — |
| Stripe | billing + metering | — |
| Resend | email | Postmark |
| Upstash Redis | rate buckets, dedupe | Postgres advisory locks |
| Trigger.dev | cron + queues + retries | Supabase pg_cron + QStash |

### 4.5 Non-functional requirements
- Feed page TTFB < 400ms p75; opportunity list query < 150ms at 100k rows/project (index on `(project_id, status, composite_score DESC)`)
- Draft generation p95 < 6s, streamed to the UI
- Ingestion p95 lag < 30 min; measured and displayed
- Zero-downtime deploys; all workers idempotent on `(job_key)`
- Lighthouse a11y 100; keyboard-navigable feed (j/k/enter — power users live in this list)
- Audit log for every posted reply and every DM draft (needed for abuse investigations and for your own defence if Reddit asks)

### 4.6 Security & privacy
- Reddit tokens: encrypted, server-only, revocable in-app; refresh handled server-side with rotation
- Post bodies: retained `[DECIDE: 30 days]`, then title+URL+scores only; hard-delete on project deletion within 7 days
- No storing of other Reddit users' PII beyond public username + public content; provide a deletion endpoint
- Stripe-hosted checkout — no card data touches your infra
- GDPR: DPA, export + delete endpoints, EU data residency `[DECIDE]`
- Abuse controls: per-account posting caps enforced server-side; ToS forbidding sockpuppets; kill-switch to suspend a user's automation

---

## 5. Risks & Roadmap

### 5.1 Phased rollout

**Phase 0 — Week 1: spine**
Auth, projects, Reddit OAuth, subreddit + rules cache, ingestion worker for pinned subs, raw feed with no scoring. Golden-set collection starts now.

**Phase 1 — MVP, Weeks 2–5 (this is what you launch)**
F1 ingestion, F2 three-stage scoring with reasons, F3 drafting with compliance checker, F4 subreddit intel, F5 safety basics (health, shadowban probe, rate governor, warm-up), F9 email digest, onboarding URL→profile flow, Stripe. Ship gate: the §3.3 eval gates pass on the golden set.

**Phase 2 — v1.1, Weeks 6–9 (the differentiator)**
F7 AI Visibility score + citation attribution loop, F6 SERP tracker, F8 competitor/comparison monitor, comment-stream monitoring, Slack alerts, F10 MCP server + public API. Launch the free tools (subreddit finder, shadowban checker, AI-visibility checker) as SEO/GEO surface — and use your own tool on itself.

**Phase 3 — v1.2, Weeks 10–14 (the money)**
Agency workspaces: multi-client, multi-account pools, approval queues, white-label weekly client report, roles. DM CRM (draft + track, human sends). Price tier at $299/mo.

**Phase 4 — v2.0**
Multi-platform (Quora, HN, Stack Overflow, YouTube comments, G2), historical archive search, Chrome extension for in-Reddit drafting, team analytics.

### 5.2 Risk register

| Risk | Sev | Mitigation |
|---|---|---|
| **Reddit tightens commercial-use enforcement / kills BYO-token pattern** | Existential | Apply for Responsible Builder approval now; abstract all reads behind a `RedditReader` interface so a third-party provider can be swapped in a day; keep a paid-provider fallback contract ready |
| Users get banned and blame you | High | Rate governor is server-enforced and non-overridable; compliance false-negatives are P0; refuse the spam use case in ToS and in product copy; publish removal-rate transparency |
| Scoring precision too low → churn in week 1 | High | Eval gates before launch; per-user threshold learning; make the "why it matched" visible so users can correct it; onboarding profile review screen is mandatory |
| LLM cost blowout on a heavy user | Med | Haiku + batching + prompt caching; plan-level hard ceilings; alert at 80% |
| Crowded market, no distribution | High | Wedge (§1.4) + free tools + MCP listing + eat your own dog food publicly (build-in-public on Reddit itself) |
| GEO probes are non-deterministic — score looks noisy to users | Med | Fixed prompt set, 3 samples per prompt, report banded score not raw; show confidence interval |
| SERP API costs scale with keywords | Low | Weekly not daily; cap keywords per plan; cache |
| Drafts read as AI-generated — community backlash | High | Voice Profile is mandatory, not optional; style rule-checker; cap product mentions; never post without human review |

### 5.3 Pricing `[DECIDE]`
Start higher than RedditGrow's $19.50 — you don't want the price-sensitive segment, they churn and they spam.
- **Solo** $39/mo — 1 project, 10 keywords, 15 subs, 500 opportunities, 400 drafts
- **Growth** $89/mo — 3 projects, 25 keywords, GEO score, SERP tracker, API/MCP
- **Agency** $299/mo — 10 client workspaces, approvals, white-label reports, 3 seats
- Annual −25%. 7-day trial, card required. No lifetime deals, ever.

---

## 6. Build instructions for Claude Code

Work in this order; one PR per phase; do not start a phase before its predecessor's tests pass.

1. `/init` a Next.js 15 + TS + Tailwind + shadcn/ui repo. Set up Supabase local, Drizzle (or Supabase migrations), Trigger.dev, Vitest, Playwright.
2. Write §4.3 as migrations first, with RLS policies, before any UI. Generate types.
3. Build `lib/reddit/` as a provider-agnostic interface (`RedditReader`, `RedditWriter`) with a `RedditOfficialProvider` implementation and a `FixtureProvider` for tests. **Every other module talks only to the interface.**
4. Build `lib/scoring/` as three pure, separately-testable functions with the golden set as fixtures. No network calls inside scoring logic.
5. Build `lib/compliance/` as deterministic rules first (regex + rule flags); the LLM check is a second layer, never the only layer.
6. Only then build UI. Feed, opportunity detail, draft composer, settings, onboarding wizard.
7. Workers last, wrapping already-tested pure functions.
8. Ship the eval harness as a CLI script (`pnpm eval:scoring`, `pnpm eval:replies`) that runs in CI and prints the §3.3 gates pass/fail.

Conventions to enforce in `CLAUDE.md`: server actions for mutations, Zod at every boundary, no `any`, all LLM calls through a single `lib/ai/client.ts` with logging + cost accounting + prompt versioning, no secrets in client components, all dates UTC in DB and localised at render.

---

## 7. Open decisions needing your input

1. **Wedge** — agency-native, GEO-first, or agent-native? (§1.4) Everything downstream branches here. **Decided 2026-08-06: GEO-first.**
2. **Reddit access posture** — apply for commercial approval up front, or launch BYO-token and apply in parallel? (I'd do both, in parallel.)
3. **Direct posting from the app** — ship it, or deliberately stay copy-only for safety and positioning? (I lean copy-only for MVP; it's a *feature* you can market.)
4. **Post-body retention window** — 30 days, or title-only from the start?
5. **Pricing floor** — $39 or match the market at $19?
