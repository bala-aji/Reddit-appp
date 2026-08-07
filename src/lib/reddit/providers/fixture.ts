import type { RedditReader } from "../reader";
import type { RedditWriter } from "../writer";
import type {
  ListingOptions,
  RedditComment,
  RedditPost,
  RedditUserProfile,
  ShadowbanProbeResult,
  SubredditRules,
} from "../types";

import postsFixture from "../fixtures/posts.json";
import commentsFixture from "../fixtures/comments.json";
import subredditRulesFixture from "../fixtures/subreddit-rules.json";
import userProfilesFixture from "../fixtures/user-profiles.json";

/**
 * Deterministic, network-free RedditReader/RedditWriter used by tests and by
 * `lib/scoring` / `lib/compliance` fixtures (PRD §6 step 3 and step 4 — "no
 * network calls inside scoring logic"). Set `shadowbannedUsernames` in the
 * constructor to make `probeShadowban` report a divergence for specific
 * fixture users, e.g. in a shadowban-detection test.
 */
export class FixtureProvider implements RedditReader, RedditWriter {
  private readonly posts: RedditPost[] = postsFixture as RedditPost[];
  private readonly comments: RedditComment[] = commentsFixture as RedditComment[];
  private readonly subredditRules: SubredditRules[] = subredditRulesFixture as SubredditRules[];
  private readonly userProfiles: RedditUserProfile[] = userProfilesFixture as RedditUserProfile[];

  constructor(private readonly shadowbannedUsernames: Set<string> = new Set()) {}

  async getNewPosts(subreddit: string, opts: ListingOptions = {}): Promise<RedditPost[]> {
    const matches = this.posts.filter(
      (p) => p.subreddit.toLowerCase() === subreddit.toLowerCase(),
    );
    return matches.slice(0, opts.limit ?? matches.length);
  }

  async searchPosts(query: string, opts: ListingOptions = {}): Promise<RedditPost[]> {
    const needle = query.toLowerCase();
    const matches = this.posts.filter(
      (p) => p.title.toLowerCase().includes(needle) || p.body.toLowerCase().includes(needle),
    );
    return matches.slice(0, opts.limit ?? matches.length);
  }

  async getNewComments(subreddit: string, opts: ListingOptions = {}): Promise<RedditComment[]> {
    const matches = this.comments.filter(
      (c) => c.subreddit.toLowerCase() === subreddit.toLowerCase(),
    );
    return matches.slice(0, opts.limit ?? matches.length);
  }

  async getSubredditRules(subreddit: string): Promise<SubredditRules> {
    const found = this.subredditRules.find(
      (r) => r.subreddit.toLowerCase() === subreddit.toLowerCase(),
    );
    if (!found) {
      throw new Error(`FixtureProvider: no rules fixture for r/${subreddit}`);
    }
    return found;
  }

  async getUserComments(username: string, opts: ListingOptions = {}): Promise<RedditComment[]> {
    const matches = this.comments.filter((c) => c.author.toLowerCase() === username.toLowerCase());
    return matches.slice(0, opts.limit ?? matches.length);
  }

  async getUserProfile(username: string): Promise<RedditUserProfile> {
    const found = this.userProfiles.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) {
      throw new Error(`FixtureProvider: no profile fixture for u/${username}`);
    }
    return found;
  }

  async probeShadowban(username: string): Promise<ShadowbanProbeResult> {
    const isShadowbanned = this.shadowbannedUsernames.has(username);
    return {
      username,
      visibleAuthenticated: true,
      visibleLoggedOut: !isShadowbanned,
      probedAt: new Date(0).toISOString(),
      likelyShadowbanned: isShadowbanned,
    };
  }

  async postComment(parentFullname: string, body: string): Promise<{ fullname: string }> {
    void parentFullname;
    void body;
    return { fullname: `t1_fixture${this.comments.length + 1}` };
  }
}
