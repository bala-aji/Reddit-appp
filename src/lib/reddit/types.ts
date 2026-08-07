// Domain types shared by every RedditReader/RedditWriter implementation.
// Kept provider-agnostic: no field here should leak a specific provider's
// wire format (e.g. the official API's "kind"/"data" envelope).

export interface RedditPost {
  fullname: string; // e.g. "t3_abc123" — used for dedupe (PRD §F1)
  subreddit: string;
  title: string;
  body: string;
  author: string;
  url: string;
  permalink: string;
  createdUtc: string; // ISO 8601
  score: number;
  numComments: number;
}

export interface RedditComment {
  fullname: string; // e.g. "t1_xyz789"
  parentFullname: string;
  postFullname: string;
  subreddit: string;
  body: string;
  author: string;
  permalink: string;
  createdUtc: string;
  score: number;
  isRemoved: boolean; // body === "[removed]" / "[deleted]"
}

export interface SubredditRules {
  subreddit: string;
  subscribers: number;
  allowsPromo: boolean | null; // null = could not be determined from rules text
  allowsLinks: boolean | null;
  minAccountAgeDays: number | null;
  minKarma: number | null;
  rawRulesText: string[];
  fetchedAt: string;
}

export interface RedditUserProfile {
  username: string;
  createdUtc: string;
  commentKarma: number;
  postKarma: number;
  isSuspended: boolean;
}

export interface ShadowbanProbeResult {
  username: string;
  visibleLoggedOut: boolean;
  visibleAuthenticated: boolean;
  probedAt: string;
  likelyShadowbanned: boolean; // visibleAuthenticated && !visibleLoggedOut
}

export interface ListingOptions {
  limit?: number;
  after?: string; // pagination cursor
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO 8601
  scope: string[];
}
