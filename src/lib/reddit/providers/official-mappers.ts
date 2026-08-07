import type { RedditComment, RedditPost, RedditUserProfile } from "../types";

// Pure, network-free mappers from Reddit's official API wire format to our
// domain types. Kept separate from official.ts (which does the fetching) so
// they're trivially unit-testable against captured API responses.

export interface RawListingChild<T> {
  kind: string;
  data: T;
}

export interface RawListing<T> {
  data: {
    children: RawListingChild<T>[];
    after: string | null;
  };
}

export interface RawPostData {
  name: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  score: number;
  num_comments: number;
}

export interface RawCommentData {
  name: string;
  parent_id: string;
  link_id: string;
  subreddit: string;
  body: string;
  author: string;
  permalink: string;
  created_utc: number;
  score: number;
}

export interface RawUserAboutData {
  name: string;
  created_utc: number;
  comment_karma: number;
  link_karma: number;
  is_suspended?: boolean;
}

export function mapListing<Raw, Mapped>(
  listing: RawListing<Raw>,
  mapItem: (raw: Raw) => Mapped,
): Mapped[] {
  return listing.data.children.map((child) => mapItem(child.data));
}

export function mapPost(raw: RawPostData): RedditPost {
  return {
    fullname: raw.name,
    subreddit: raw.subreddit,
    title: raw.title,
    body: raw.selftext ?? "",
    author: raw.author,
    url: raw.url,
    permalink: `https://reddit.com${raw.permalink}`,
    createdUtc: new Date(raw.created_utc * 1000).toISOString(),
    score: raw.score,
    numComments: raw.num_comments,
  };
}

export function mapComment(raw: RawCommentData): RedditComment {
  return {
    fullname: raw.name,
    parentFullname: raw.parent_id,
    postFullname: raw.link_id,
    subreddit: raw.subreddit,
    body: raw.body,
    author: raw.author,
    permalink: `https://reddit.com${raw.permalink}`,
    createdUtc: new Date(raw.created_utc * 1000).toISOString(),
    score: raw.score,
    isRemoved: raw.body === "[removed]" || raw.body === "[deleted]",
  };
}

export function mapUserProfile(raw: RawUserAboutData): RedditUserProfile {
  return {
    username: raw.name,
    createdUtc: new Date(raw.created_utc * 1000).toISOString(),
    commentKarma: raw.comment_karma,
    postKarma: raw.link_karma,
    isSuspended: raw.is_suspended ?? false,
  };
}
