import type { RedditPost } from "../reddit/types";
import { keywordPrefilter } from "./keyword-prefilter";
import { embeddingPrefilter } from "./embedding-prefilter";
import { freshnessReachScore } from "./freshness-reach";
import { compositeScore } from "./composite-score";
import type { IntentCitationScorer } from "./intent-citation-scorer";

export interface ScoringPipelineInput {
  post: RedditPost;
  postEmbedding: number[];
  keywords: string[];
  negativeKeywords: string[];
  problemStatements: string[];
  problemStatementEmbeddings: number[][];
  embeddingThreshold: number;
  subredditSubscribers: number;
  /** Injected for testability — never read from the clock inside pure logic. */
  now: string;
  scorer: IntentCitationScorer;
}

export type ScoringPipelineOutcome =
  | { status: "rejected"; stage: "keyword" | "embedding"; reason: string }
  | {
      status: "scored";
      intentScore: number;
      citationScore: number;
      freshnessReachScore: number;
      compositeScore: number;
      reason: string;
      matchedSignals: string[];
    };

// Orchestrates the three-stage funnel (PRD §2.3 F2): keyword/regex prefilter
// -> embedding cosine vs. Product Profile -> LLM structured scoring on the
// survivors. The only network call is inside `scorer`, injected by the
// caller — this function itself makes none.
export async function runScoringPipeline(input: ScoringPipelineInput): Promise<ScoringPipelineOutcome> {
  const keywordResult = keywordPrefilter({
    title: input.post.title,
    body: input.post.body,
    keywords: input.keywords,
    negativeKeywords: input.negativeKeywords,
  });
  if (!keywordResult.passed) {
    return { status: "rejected", stage: "keyword", reason: "no keyword match or negative keyword hit" };
  }

  const embeddingResult = embeddingPrefilter(
    input.postEmbedding,
    input.problemStatementEmbeddings,
    input.embeddingThreshold,
  );
  if (!embeddingResult.passed) {
    return {
      status: "rejected",
      stage: "embedding",
      reason: `below threshold (best cosine ${embeddingResult.bestScore.toFixed(3)})`,
    };
  }

  const llmResult = await input.scorer.score({ post: input.post, problemStatements: input.problemStatements });

  const freshness = freshnessReachScore({
    postCreatedUtc: input.post.createdUtc,
    now: input.now,
    subredditSubscribers: input.subredditSubscribers,
    score: input.post.score,
  });

  const composite = compositeScore({
    intentScore: llmResult.intentScore,
    citationScore: llmResult.citationScore,
    freshnessReachScore: freshness,
  });

  return {
    status: "scored",
    intentScore: llmResult.intentScore,
    citationScore: llmResult.citationScore,
    freshnessReachScore: freshness,
    compositeScore: composite,
    reason: llmResult.reason,
    matchedSignals: llmResult.matchedSignals,
  };
}
