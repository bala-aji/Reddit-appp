-- Thread: Phase 0 schema (PRD §4.3)
-- Core tables + RLS. Every user-owned row is reachable from auth.uid() via
-- users.id, either directly (user_id column) or through a join chain
-- (project_id -> projects.user_id, opportunity_id -> ... -> projects.user_id).

create extension if not exists vector;

-- ============================================================================
-- USERS (profile row mirroring auth.users)
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'trial' check (plan in ('trial', 'solo', 'growth', 'agency')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users select own" on public.users
  for select using (id = auth.uid());
create policy "users update own" on public.users
  for update using (id = auth.uid());

-- ============================================================================
-- REDDIT ACCOUNTS
-- ============================================================================
create table public.reddit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  reddit_username text not null,
  access_token text not null,
  refresh_token text not null,
  karma_comment integer not null default 0,
  karma_post integer not null default 0,
  account_created_at timestamptz,
  shadowban_status text not null default 'unknown' check (shadowban_status in ('unknown', 'clear', 'shadowbanned')),
  warmup_progress numeric not null default 0,
  health_score numeric,
  last_probed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reddit_accounts_user_id_idx on public.reddit_accounts (user_id);

alter table public.reddit_accounts enable row level security;

create policy "reddit_accounts owner all" on public.reddit_accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- PROJECTS
-- ============================================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  product_url text,
  profile_json jsonb,
  profile_version integer not null default 1,
  voice_profile_json jsonb,
  negative_keywords text[] not null default '{}',
  embedding vector (1536),
  created_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "projects owner all" on public.projects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- KEYWORDS
-- ============================================================================
create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  term text not null,
  match_type text not null default 'exact' check (match_type in ('exact', 'semantic')),
  is_active boolean not null default true
);

create index keywords_project_id_idx on public.keywords (project_id);

alter table public.keywords enable row level security;

create policy "keywords via project owner" on public.keywords
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- SUBREDDITS (global cache — not user-owned; public read, service-role write)
-- ============================================================================
create table public.subreddits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subscribers integer,
  rules_json jsonb,
  allows_promo boolean,
  allows_links boolean,
  min_account_age_days integer,
  min_karma integer,
  best_hours integer[],
  rules_fetched_at timestamptz
);

alter table public.subreddits enable row level security;

create policy "subreddits read all authenticated" on public.subreddits
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- PROJECT_SUBREDDITS (join)
-- ============================================================================
create table public.project_subreddits (
  project_id uuid not null references public.projects (id) on delete cascade,
  subreddit_id uuid not null references public.subreddits (id) on delete cascade,
  is_pinned boolean not null default false,
  relevance_score numeric,
  trust_score numeric,
  primary key (project_id, subreddit_id)
);

alter table public.project_subreddits enable row level security;

create policy "project_subreddits via project owner" on public.project_subreddits
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- POSTS (global cache, deduped by reddit_fullname — not user-owned)
-- ============================================================================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  reddit_fullname text not null unique,
  subreddit_id uuid references public.subreddits (id),
  title text not null,
  body text,
  author text,
  url text,
  created_utc timestamptz not null,
  score integer not null default 0,
  num_comments integer not null default 0,
  embedding vector (1536),
  fetched_at timestamptz not null default now(),
  body_expires_at timestamptz
);

create index posts_subreddit_id_idx on public.posts (subreddit_id);
create index posts_created_utc_idx on public.posts (created_utc desc);

alter table public.posts enable row level security;

create policy "posts read all authenticated" on public.posts
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- OPPORTUNITIES
-- ============================================================================
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  intent_score numeric,
  citation_score numeric,
  composite_score numeric,
  reason text,
  matched_signals text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'saved', 'drafted', 'posted', 'dismissed')),
  prompt_version text,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, post_id)
);

-- Feed query per §4.5: index on (project_id, status, composite_score DESC)
create index opportunities_feed_idx on public.opportunities (project_id, status, composite_score desc);

alter table public.opportunities enable row level security;

create policy "opportunities via project owner" on public.opportunities
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- DRAFTS
-- ============================================================================
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  variant text not null check (variant in ('helpful', 'peer', 'expert')),
  body text not null,
  compliance_verdict text check (compliance_verdict in ('safe', 'caution', 'blocked')),
  compliance_notes text,
  was_edited boolean not null default false,
  model text,
  created_at timestamptz not null default now()
);

create index drafts_opportunity_id_idx on public.drafts (opportunity_id);

alter table public.drafts enable row level security;

create policy "drafts via opportunity owner" on public.drafts
  for all using (
    exists (
      select 1 from public.opportunities o
      join public.projects p on p.id = o.project_id
      where o.id = opportunity_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.opportunities o
      join public.projects p on p.id = o.project_id
      where o.id = opportunity_id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- REPLIES
-- ============================================================================
create table public.replies (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts (id) on delete cascade,
  reddit_comment_fullname text,
  posted_at timestamptz,
  karma integer,
  is_removed boolean not null default false,
  removed_detected_at timestamptz,
  serp_positions_json jsonb
);

create index replies_draft_id_idx on public.replies (draft_id);

alter table public.replies enable row level security;

create policy "replies via draft owner" on public.replies
  for all using (
    exists (
      select 1 from public.drafts d
      join public.opportunities o on o.id = d.opportunity_id
      join public.projects p on p.id = o.project_id
      where d.id = draft_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.drafts d
      join public.opportunities o on o.id = d.opportunity_id
      join public.projects p on p.id = o.project_id
      where d.id = draft_id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMPETITORS
-- ============================================================================
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  aliases text[] not null default '{}'
);

create index competitors_project_id_idx on public.competitors (project_id);

alter table public.competitors enable row level security;

create policy "competitors via project owner" on public.competitors
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- MENTIONS
-- ============================================================================
create table public.mentions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  kind text not null check (kind in ('brand', 'competitor', 'comparison')),
  sentiment text
);

create index mentions_project_id_idx on public.mentions (project_id);

alter table public.mentions enable row level security;

create policy "mentions via project owner" on public.mentions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- KEYWORDS_SEO
-- ============================================================================
create table public.keywords_seo (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  term text not null,
  volume integer,
  difficulty numeric
);

create index keywords_seo_project_id_idx on public.keywords_seo (project_id);

alter table public.keywords_seo enable row level security;

create policy "keywords_seo via project owner" on public.keywords_seo
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- SERP_SNAPSHOTS
-- ============================================================================
create table public.serp_snapshots (
  id uuid primary key default gen_random_uuid(),
  keywords_seo_id uuid not null references public.keywords_seo (id) on delete cascade,
  checked_at timestamptz not null default now(),
  results_json jsonb
);

create index serp_snapshots_keywords_seo_id_idx on public.serp_snapshots (keywords_seo_id);

alter table public.serp_snapshots enable row level security;

create policy "serp_snapshots via keyword owner" on public.serp_snapshots
  for all using (
    exists (
      select 1 from public.keywords_seo k
      join public.projects p on p.id = k.project_id
      where k.id = keywords_seo_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.keywords_seo k
      join public.projects p on p.id = k.project_id
      where k.id = keywords_seo_id and p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- GEO_PROBES
-- ============================================================================
create table public.geo_probes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  prompt text not null,
  engine text not null check (engine in ('perplexity', 'openai', 'anthropic')),
  run_at timestamptz not null default now(),
  brand_mentioned boolean,
  position integer,
  sentiment text,
  cited_urls text[] not null default '{}',
  matched_own_reply_id uuid references public.replies (id)
);

create index geo_probes_project_id_idx on public.geo_probes (project_id);

alter table public.geo_probes enable row level security;

create policy "geo_probes via project owner" on public.geo_probes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- VISIBILITY_SCORES
-- ============================================================================
create table public.visibility_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  week date not null,
  score numeric,
  per_engine_json jsonb,
  next_moves_json jsonb,
  unique (project_id, week)
);

create index visibility_scores_project_id_idx on public.visibility_scores (project_id);

alter table public.visibility_scores enable row level security;

create policy "visibility_scores via project owner" on public.visibility_scores
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- FEEDBACK
-- ============================================================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  verdict text not null check (verdict in ('relevant', 'not_relevant')),
  note text,
  created_at timestamptz not null default now()
);

create index feedback_opportunity_id_idx on public.feedback (opportunity_id);
create index feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

create policy "feedback owner all" on public.feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================================
-- USAGE_EVENTS
-- ============================================================================
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null,
  qty numeric not null default 1,
  occurred_at timestamptz not null default now()
);

create index usage_events_user_id_idx on public.usage_events (user_id);

alter table public.usage_events enable row level security;

create policy "usage_events owner select" on public.usage_events
  for select using (user_id = auth.uid());

-- ============================================================================
-- Auto-create a public.users row when a new auth.users row is inserted
-- ============================================================================
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
