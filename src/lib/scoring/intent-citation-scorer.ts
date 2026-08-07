import { z } from "zod";
import { callStructured } from "../ai/client";
import type { RedditPost } from "../reddit/types";

export const ScoreResultSchema = z.object({
  intentScore: z.number().min(0).max(10),
  citationScore: z.number().min(0).max(10),
  reason: z.string(),
  matchedSignals: z.array(z.string()),
});

export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export interface ScorerInput {
  post: RedditPost;
  problemStatements: string[];
}

// Stage (c) of the three-stage funnel (PRD §2.3 F2) — abstracted behind an
// interface, same pattern as RedditReader, so scoring pipeline tests never
// make a real network call.
export interface IntentCitationScorer {
  score(input: ScorerInput): Promise<ScoreResult>;
}

const PROMPT_VERSION = "intent-citation-v1";

export class AnthropicScorer implements IntentCitationScorer {
  async score({ post, problemStatements }: ScorerInput): Promise<ScoreResult> {
    const { data } = await callStructured({
      task: "scoring:intent-citation",
      promptVersion: PROMPT_VERSION,
      model: "haiku",
      system: [
        "You score a single Reddit post on two axes for a product's marketing team.",
        "Intent (0-10): is this person describing a problem the product solves, or asking for a tool recommendation?",
        "Citation potential (0-10): is this the kind of thread LLMs quote when answering buyer-intent questions —",
        "recommendation, comparison, or \"best X for Y\" phrasing?",
        "Give a reason in 25 words or fewer, and list the specific phrases or signals that drove the scores.",
      ].join(" "),
      user: [
        `Product problem statements: ${problemStatements.join("; ")}`,
        `Subreddit: r/${post.subreddit}`,
        `Title: ${post.title}`,
        `Body: ${post.body}`,
      ].join("\n"),
      schema: ScoreResultSchema,
      maxTokens: 512,
    });
    return data;
  }
}

// Test double — canned per-fullname scores, no network access.
export class FixtureScorer implements IntentCitationScorer {
  constructor(private readonly canned: Map<string, ScoreResult>) {}

  async score({ post }: ScorerInput): Promise<ScoreResult> {
    const found = this.canned.get(post.fullname);
    if (!found) {
      throw new Error(`FixtureScorer: no canned score for ${post.fullname}`);
    }
    return found;
  }
}
