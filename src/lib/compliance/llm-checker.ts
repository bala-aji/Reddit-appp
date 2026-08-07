import { z } from "zod";
import { callStructured } from "../ai/client";

export const LlmComplianceResultSchema = z.object({
  verdict: z.enum(["safe", "caution", "blocked"]),
  reason: z.string(),
});

export type LlmComplianceResult = z.infer<typeof LlmComplianceResultSchema>;

export interface LlmComplianceInput {
  draftBody: string;
  threadTitle: string;
  subredditRulesText: string[];
}

// Second layer (PRD §6 step 5) — catches what regex can't: subtlety of
// self-promotion, tone, whether it reads like marketing copy. Same
// interface + fixture pattern as RedditReader / IntentCitationScorer.
export interface LlmComplianceChecker {
  check(input: LlmComplianceInput): Promise<LlmComplianceResult>;
}

const PROMPT_VERSION = "compliance-llm-v1";

export class AnthropicComplianceChecker implements LlmComplianceChecker {
  async check(input: LlmComplianceInput): Promise<LlmComplianceResult> {
    const { data } = await callStructured({
      task: "compliance:llm-check",
      promptVersion: PROMPT_VERSION,
      model: "haiku",
      system: [
        "You are a strict moderator simulation judging whether a drafted Reddit reply would likely be removed.",
        "A false negative here means a real user could get banned — when genuinely uncertain, escalate the verdict rather than downgrade it.",
        "Judge tone, subtlety of self-promotion, and whether the reply reads like a genuine community member rather than marketing copy.",
      ].join(" "),
      user: [
        `Subreddit rules: ${input.subredditRulesText.join(" | ") || "(none fetched)"}`,
        `Thread title: ${input.threadTitle}`,
        `Draft reply: ${input.draftBody}`,
      ].join("\n"),
      schema: LlmComplianceResultSchema,
      maxTokens: 256,
    });
    return data;
  }
}

export class FixtureComplianceChecker implements LlmComplianceChecker {
  constructor(private readonly canned: LlmComplianceResult) {}

  async check(): Promise<LlmComplianceResult> {
    return this.canned;
  }
}
