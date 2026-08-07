import { describe, expect, it } from "vitest";
import { freshnessReachScore } from "./freshness-reach";

describe("freshnessReachScore", () => {
  const now = "2026-08-01T12:00:00Z";

  it("scores a fresh, high-velocity post in a large subreddit higher than a stale one", () => {
    const fresh = freshnessReachScore({
      postCreatedUtc: "2026-08-01T11:00:00Z",
      now,
      subredditSubscribers: 500_000,
      score: 200,
    });
    const stale = freshnessReachScore({
      postCreatedUtc: "2026-07-01T11:00:00Z",
      now,
      subredditSubscribers: 500_000,
      score: 200,
    });
    expect(fresh).toBeGreaterThan(stale);
  });

  it("stays within the 0-10 band", () => {
    const score = freshnessReachScore({
      postCreatedUtc: now,
      now,
      subredditSubscribers: 10_000_000,
      score: 100_000,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });

  it("never goes negative for a very old post", () => {
    const score = freshnessReachScore({
      postCreatedUtc: "2020-01-01T00:00:00Z",
      now,
      subredditSubscribers: 100,
      score: 0,
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
