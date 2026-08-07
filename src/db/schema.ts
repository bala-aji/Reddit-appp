import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Mirrors supabase/migrations/20260806182824_init_schema.sql (PRD §4.3).
// This is the read/write surface for app code; the SQL migration is the
// source of truth for schema + RLS. Keep the two in sync by hand — do not
// run drizzle-kit push/generate against this file, only drizzle-kit introspect
// if the SQL migration ever drifts.

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  plan: text("plan").notNull().default("trial"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const redditAccounts = pgTable(
  "reddit_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redditUsername: text("reddit_username").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    karmaComment: integer("karma_comment").notNull().default(0),
    karmaPost: integer("karma_post").notNull().default(0),
    accountCreatedAt: timestamp("account_created_at", { withTimezone: true }),
    shadowbanStatus: text("shadowban_status").notNull().default("unknown"),
    warmupProgress: numeric("warmup_progress").notNull().default("0"),
    healthScore: numeric("health_score"),
    lastProbedAt: timestamp("last_probed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reddit_accounts_user_id_idx").on(t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    productUrl: text("product_url"),
    profileJson: jsonb("profile_json"),
    profileVersion: integer("profile_version").notNull().default(1),
    voiceProfileJson: jsonb("voice_profile_json"),
    negativeKeywords: text("negative_keywords").array().notNull().default(sql`'{}'::text[]`),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_user_id_idx").on(t.userId)],
);

export const keywords = pgTable(
  "keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    matchType: text("match_type").notNull().default("exact"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("keywords_project_id_idx").on(t.projectId)],
);

export const subreddits = pgTable("subreddits", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  subscribers: integer("subscribers"),
  rulesJson: jsonb("rules_json"),
  allowsPromo: boolean("allows_promo"),
  allowsLinks: boolean("allows_links"),
  minAccountAgeDays: integer("min_account_age_days"),
  minKarma: integer("min_karma"),
  bestHours: integer("best_hours").array(),
  rulesFetchedAt: timestamp("rules_fetched_at", { withTimezone: true }),
});

export const projectSubreddits = pgTable(
  "project_subreddits",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    subredditId: uuid("subreddit_id")
      .notNull()
      .references(() => subreddits.id, { onDelete: "cascade" }),
    isPinned: boolean("is_pinned").notNull().default(false),
    relevanceScore: numeric("relevance_score"),
    trustScore: numeric("trust_score"),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.subredditId] })],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    redditFullname: text("reddit_fullname").notNull().unique(),
    subredditId: uuid("subreddit_id").references(() => subreddits.id),
    title: text("title").notNull(),
    body: text("body"),
    author: text("author"),
    url: text("url"),
    createdUtc: timestamp("created_utc", { withTimezone: true }).notNull(),
    score: integer("score").notNull().default(0),
    numComments: integer("num_comments").notNull().default(0),
    embedding: vector("embedding", { dimensions: 1536 }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    bodyExpiresAt: timestamp("body_expires_at", { withTimezone: true }),
  },
  (t) => [
    index("posts_subreddit_id_idx").on(t.subredditId),
    index("posts_created_utc_idx").on(t.createdUtc),
  ],
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    intentScore: numeric("intent_score"),
    citationScore: numeric("citation_score"),
    compositeScore: numeric("composite_score"),
    reason: text("reason"),
    matchedSignals: text("matched_signals").array().notNull().default(sql`'{}'::text[]`),
    status: text("status").notNull().default("new"),
    promptVersion: text("prompt_version"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("opportunities_project_post_unique").on(t.projectId, t.postId),
    index("opportunities_feed_idx").on(t.projectId, t.status, t.compositeScore),
  ],
);

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    variant: text("variant").notNull(),
    body: text("body").notNull(),
    complianceVerdict: text("compliance_verdict"),
    complianceNotes: text("compliance_notes"),
    wasEdited: boolean("was_edited").notNull().default(false),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("drafts_opportunity_id_idx").on(t.opportunityId)],
);

export const replies = pgTable(
  "replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    redditCommentFullname: text("reddit_comment_fullname"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    karma: integer("karma"),
    isRemoved: boolean("is_removed").notNull().default(false),
    removedDetectedAt: timestamp("removed_detected_at", { withTimezone: true }),
    serpPositionsJson: jsonb("serp_positions_json"),
  },
  (t) => [index("replies_draft_id_idx").on(t.draftId)],
);

export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [index("competitors_project_id_idx").on(t.projectId)],
);

export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sentiment: text("sentiment"),
  },
  (t) => [index("mentions_project_id_idx").on(t.projectId)],
);

export const keywordsSeo = pgTable(
  "keywords_seo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    volume: integer("volume"),
    difficulty: numeric("difficulty"),
  },
  (t) => [index("keywords_seo_project_id_idx").on(t.projectId)],
);

export const serpSnapshots = pgTable(
  "serp_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keywordsSeoId: uuid("keywords_seo_id")
      .notNull()
      .references(() => keywordsSeo.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    resultsJson: jsonb("results_json"),
  },
  (t) => [index("serp_snapshots_keywords_seo_id_idx").on(t.keywordsSeoId)],
);

export const geoProbes = pgTable(
  "geo_probes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    engine: text("engine").notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    brandMentioned: boolean("brand_mentioned"),
    position: integer("position"),
    sentiment: text("sentiment"),
    citedUrls: text("cited_urls").array().notNull().default(sql`'{}'::text[]`),
    matchedOwnReplyId: uuid("matched_own_reply_id").references(() => replies.id),
  },
  (t) => [index("geo_probes_project_id_idx").on(t.projectId)],
);

export const visibilityScores = pgTable(
  "visibility_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    week: date("week").notNull(),
    score: numeric("score"),
    perEngineJson: jsonb("per_engine_json"),
    nextMovesJson: jsonb("next_moves_json"),
  },
  (t) => [
    unique("visibility_scores_project_week_unique").on(t.projectId, t.week),
    index("visibility_scores_project_id_idx").on(t.projectId),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verdict: text("verdict").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("feedback_opportunity_id_idx").on(t.opportunityId),
    index("feedback_user_id_idx").on(t.userId),
  ],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    qty: numeric("qty").notNull().default("1"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_user_id_idx").on(t.userId)],
);
