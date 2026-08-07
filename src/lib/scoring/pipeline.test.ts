import { describe, expect, it } from "vitest";
import { runScoringPipeline } from "./pipeline";
import { FixtureScorer, type ScoreResult } from "./intent-citation-scorer";
import type { RedditPost } from "../reddit/types";

const post: RedditPost = {
  fullname: "t3_1a1a1a",
  subreddit: "SaaS",
  title: "What's the best tool for tracking Reddit mentions of my product?",
  body: "I keep missing threads where people ask for recommendations in my niche.",
  author: "founder_throwaway_42",
  url: "https://reddit.com/r/SaaS/comments/1a1a1a",
  permalink: "https://reddit.com/r/SaaS/comments/1a1a1a",
  createdUtc: "2026-08-01T14:32:00Z",
  score: 34,
  numComments: 12,
};

const cannedScore: ScoreResult = {
  intentScore: 9,
  citationScore: 6,
  reason: "Directly asks for a tool recommendation in the product's category.",
  matchedSignals: ["asks for tool recommendation"],
};

function baseInput(overrides: Partial<Parameters<typeof runScoringPipeline>[0]> = {}) {
  return {
    post,
    postEmbedding: [1, 0],
    keywords: ["tool"],
    negativeKeywords: [],
    problemStatements: ["finding relevant Reddit threads to reply to"],
    problemStatementEmbeddings: [[1, 0]],
    embeddingThreshold: 0.5,
    subredditSubscribers: 180_000,
    now: "2026-08-01T15:00:00Z",
    scorer: new FixtureScorer(new Map([[post.fullname, cannedScore]])),
    ...overrides,
  };
}

describe("runScoringPipeline", () => {
  it("rejects at the keyword stage when no keyword matches", async () => {
    const outcome = await runScoringPipeline(baseInput({ keywords: ["nonexistent-term"] }));
    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") expect(outcome.stage).toBe("keyword");
  });

  it("rejects at the embedding stage when below threshold", async () => {
    const outcome = await runScoringPipeline(baseInput({ postEmbedding: [0, 1] }));
    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") expect(outcome.stage).toBe("embedding");
  });

  it("scores a post that survives both prefilters", async () => {
    const outcome = await runScoringPipeline(baseInput());
    expect(outcome.status).toBe("scored");
    if (outcome.status === "scored") {
      expect(outcome.intentScore).toBe(9);
      expect(outcome.citationScore).toBe(6);
      expect(outcome.compositeScore).toBeGreaterThan(0);
    }
  });
});
