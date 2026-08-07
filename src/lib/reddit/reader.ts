import type {
  ListingOptions,
  RedditComment,
  RedditPost,
  RedditUserProfile,
  ShadowbanProbeResult,
  SubredditRules,
} from "./types";

// Every ingestion/scoring/safety module talks ONLY to this interface
// (PRD §6 step 3) — never to a provider class directly. This is what
// lets a third-party read provider (Apify/Xpoz/Data365) swap in for the
// official API in a day if Reddit tightens the BYO-token pattern (§5.2
// existential risk).
export interface RedditReader {
  /** `/r/{sub}/new` — polled per pinned sub (PRD F1, <= 5 min). */
  getNewPosts(subreddit: string, opts?: ListingOptions): Promise<RedditPost[]>;

  /** Reddit search API keyword sweep (PRD F1, <= 15 min). */
  searchPosts(query: string, opts?: ListingOptions): Promise<RedditPost[]>;

  /** Comment stream for a pinned sub. `[MVP: posts only, comments in v1.1]`. */
  getNewComments(subreddit: string, opts?: ListingOptions): Promise<RedditComment[]>;

  /** Cached subreddit rules, parsed to structured flags (PRD F4). */
  getSubredditRules(subreddit: string): Promise<SubredditRules>;

  /** Authenticated fetch of a user's own posted comments, for removal detection (PRD F5) and Voice Profile (PRD F3). */
  getUserComments(username: string, opts?: ListingOptions): Promise<RedditComment[]>;

  /** Public profile fetch, used both directly and for the shadowban probe (PRD F5). */
  getUserProfile(username: string): Promise<RedditUserProfile>;

  /**
   * Compares a logged-out fetch of `/user/{name}` against an authenticated
   * fetch. Divergence indicates a likely shadowban (PRD F5).
   */
  probeShadowban(username: string): Promise<ShadowbanProbeResult>;
}
