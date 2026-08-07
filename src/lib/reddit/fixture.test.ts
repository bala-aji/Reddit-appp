import { describe, expect, it } from "vitest";
import { FixtureProvider } from "./providers/fixture";

describe("FixtureProvider", () => {
  it("filters posts by subreddit", async () => {
    const provider = new FixtureProvider();
    const posts = await provider.getNewPosts("SaaS");
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.subreddit === "SaaS")).toBe(true);
  });

  it("matches search queries against title and body", async () => {
    const provider = new FixtureProvider();
    const results = await provider.searchPosts("syften");
    expect(results).toHaveLength(1);
    expect(results[0].fullname).toBe("t3_3c3c3c");
  });

  it("returns subreddit rules keyed by name", async () => {
    const provider = new FixtureProvider();
    const rules = await provider.getSubredditRules("Entrepreneur");
    expect(rules.allowsLinks).toBe(false);
  });

  it("reports a shadowban only for flagged usernames", async () => {
    const clean = new FixtureProvider();
    const flagged = new FixtureProvider(new Set(["shadowbanned_test_user"]));

    expect((await clean.probeShadowban("founder_throwaway_42")).likelyShadowbanned).toBe(false);
    expect((await flagged.probeShadowban("shadowbanned_test_user")).likelyShadowbanned).toBe(true);
  });
});
