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
import { RedditApiError } from "../errors";
import {
  mapComment,
  mapListing,
  mapPost,
  mapUserProfile,
  type RawCommentData,
  type RawListing,
  type RawPostData,
  type RawUserAboutData,
} from "./official-mappers";

const OAUTH_BASE = "https://oauth.reddit.com";
const PUBLIC_BASE = "https://www.reddit.com";

export interface RedditOfficialProviderOptions {
  accessToken: string;
  /** Required by Reddit API policy — identify your app + a contact username. */
  userAgent: string;
  /**
   * Called once on a 401 to fetch a fresh access token from the stored
   * refresh token. Token storage/rotation lives in `lib/reddit/auth.ts`
   * (Phase 1), not here — this provider only knows how to ask for a new one.
   */
  onTokenExpired?: () => Promise<string>;
  /**
   * Called after every response with the rate-limit headers Reddit returns
   * (`x-ratelimit-remaining`, `x-ratelimit-reset`, `x-ratelimit-used`). The
   * per-user token bucket that decides whether to widen poll intervals
   * (PRD F1: "degrade rather than 429") lives in the ingestion worker, which
   * should subscribe here rather than this provider re-implementing it.
   */
  onRateLimit?: (info: { remaining: number; resetSeconds: number; used: number }) => void;
}

/**
 * BYO-token implementation of RedditReader/RedditWriter (PRD §4.2/A3): every
 * call executes under the connected user's own OAuth token and their own
 * 100 QPM budget, never a shared platform token.
 */
export class RedditOfficialProvider implements RedditReader, RedditWriter {
  private accessToken: string;

  constructor(private readonly opts: RedditOfficialProviderOptions) {
    this.accessToken = opts.accessToken;
  }

  private async request<T>(
    path: string,
    { authenticated = true, params }: { authenticated?: boolean; params?: Record<string, string> } = {},
  ): Promise<T> {
    const base = authenticated ? OAUTH_BASE : PUBLIC_BASE;
    const url = new URL(`${base}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    }
    if (!authenticated) url.searchParams.set("raw_json", "1");

    const doFetch = () =>
      fetch(url.toString(), {
        headers: {
          "User-Agent": this.opts.userAgent,
          ...(authenticated ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        },
      });

    let res = await doFetch();

    if (res.status === 401 && authenticated && this.opts.onTokenExpired) {
      this.accessToken = await this.opts.onTokenExpired();
      res = await doFetch();
    }

    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    const used = res.headers.get("x-ratelimit-used");
    if (remaining && reset && used && this.opts.onRateLimit) {
      this.opts.onRateLimit({
        remaining: Number(remaining),
        resetSeconds: Number(reset),
        used: Number(used),
      });
    }

    if (!res.ok) {
      throw new RedditApiError(`Reddit API request failed: ${res.status}`, res.status, path);
    }

    return res.json() as Promise<T>;
  }

  async getNewPosts(subreddit: string, opts: ListingOptions = {}): Promise<RedditPost[]> {
    const listing = await this.request<RawListing<RawPostData>>(`/r/${subreddit}/new`, {
      params: { limit: String(opts.limit ?? 25), ...(opts.after ? { after: opts.after } : {}) },
    });
    return mapListing(listing, mapPost);
  }

  async searchPosts(query: string, opts: ListingOptions = {}): Promise<RedditPost[]> {
    const listing = await this.request<RawListing<RawPostData>>("/search", {
      params: {
        q: query,
        sort: "new",
        limit: String(opts.limit ?? 25),
        ...(opts.after ? { after: opts.after } : {}),
      },
    });
    return mapListing(listing, mapPost);
  }

  async getNewComments(subreddit: string, opts: ListingOptions = {}): Promise<RedditComment[]> {
    const listing = await this.request<RawListing<RawCommentData>>(`/r/${subreddit}/comments`, {
      params: { limit: String(opts.limit ?? 25), ...(opts.after ? { after: opts.after } : {}) },
    });
    return mapListing(listing, mapComment);
  }

  async getSubredditRules(subreddit: string): Promise<SubredditRules> {
    const [about, rules] = await Promise.all([
      this.request<{ data: { subscribers: number } }>(`/r/${subreddit}/about`),
      this.request<{ rules: { description: string }[] }>(`/r/${subreddit}/about/rules`),
    ]);

    // Reddit's API doesn't structurally expose self-promo/link/age/karma
    // policy — those live in free-text rules and AutoModerator config that
    // isn't publicly readable. Heuristic inference over rawRulesText is a
    // separate, testable, pure function (PRD §6 step 5: deterministic rules
    // first) — deliberately not duplicated here.
    return {
      subreddit,
      subscribers: about.data.subscribers,
      allowsPromo: null,
      allowsLinks: null,
      minAccountAgeDays: null,
      minKarma: null,
      rawRulesText: rules.rules.map((r) => r.description),
      fetchedAt: new Date().toISOString(),
    };
  }

  async getUserComments(username: string, opts: ListingOptions = {}): Promise<RedditComment[]> {
    const listing = await this.request<RawListing<RawCommentData>>(`/user/${username}/comments`, {
      params: { limit: String(opts.limit ?? 100), ...(opts.after ? { after: opts.after } : {}) },
    });
    return mapListing(listing, mapComment);
  }

  async getUserProfile(username: string): Promise<RedditUserProfile> {
    const about = await this.request<{ data: RawUserAboutData }>(`/user/${username}/about`);
    return mapUserProfile(about.data);
  }

  async probeShadowban(username: string): Promise<ShadowbanProbeResult> {
    const probedAt = new Date().toISOString();

    const [authedResult, loggedOutResult] = await Promise.allSettled([
      this.request<{ data: unknown }>(`/user/${username}/about`),
      this.request<{ data: unknown }>(`/user/${username}/about.json`, { authenticated: false }),
    ]);

    const visibleAuthenticated = authedResult.status === "fulfilled";
    const visibleLoggedOut = loggedOutResult.status === "fulfilled";

    return {
      username,
      visibleAuthenticated,
      visibleLoggedOut,
      probedAt,
      likelyShadowbanned: visibleAuthenticated && !visibleLoggedOut,
    };
  }

  async postComment(parentFullname: string, body: string): Promise<{ fullname: string }> {
    // Not called from any current flow — see writer.ts. Left implemented
    // (rather than throwing) so the rate governor and compliance checker
    // have a real seam to wrap if/when open decision §7.3 ships direct posting.
    const res = await fetch(`${OAUTH_BASE}/api/comment`, {
      method: "POST",
      headers: {
        "User-Agent": this.opts.userAgent,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ api_type: "json", thing_id: parentFullname, text: body }),
    });

    if (!res.ok) {
      throw new RedditApiError(`Failed to post comment: ${res.status}`, res.status, "/api/comment");
    }

    const json = (await res.json()) as { json: { data: { things: { data: { name: string } }[] } } };
    return { fullname: json.json.data.things[0].data.name };
  }
}
