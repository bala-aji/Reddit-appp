import { describe, expect, it } from "vitest";
import { checkCompliance } from "./pipeline";
import type { LlmComplianceChecker, LlmComplianceResult } from "./llm-checker";
import type { ComplianceCheckInput } from "./types";

function baseInput(overrides: Partial<ComplianceCheckInput> = {}): ComplianceCheckInput {
  return {
    draftBody: "We've hit the same wall — a plain cron job with a dedupe table got us most of the way there.",
    productName: "Thread",
    intentScore: 9,
    threadUsesBullets: false,
    subredditRules: { allowsPromo: true, allowsLinks: true },
    ...overrides,
  };
}

const context = { threadTitle: "What do you use for dedupe?", subredditRulesText: [] };

class CountingChecker implements LlmComplianceChecker {
  callCount = 0;
  constructor(private readonly canned: LlmComplianceResult) {}

  async check(): Promise<LlmComplianceResult> {
    this.callCount++;
    return this.canned;
  }
}

describe("checkCompliance", () => {
  it("short-circuits on a rule-level block without calling the LLM layer", async () => {
    const llm = new CountingChecker({ verdict: "safe", reason: "n/a" });

    const result = await checkCompliance(
      baseInput({ draftBody: "Try Thread, it solves this.", subredditRules: { allowsPromo: false, allowsLinks: true } }),
      context,
      llm,
    );

    expect(result.verdict).toBe("blocked");
    expect(llm.callCount).toBe(0);
  });

  it("escalates to the LLM verdict when it's stricter than the rule verdict", async () => {
    const llm = new CountingChecker({ verdict: "blocked", reason: "Reads as thinly-veiled marketing." });
    const result = await checkCompliance(baseInput(), context, llm);
    expect(result.verdict).toBe("blocked");
    expect(result.violations.map((v) => v.rule)).toContain("llm-judgment");
    expect(llm.callCount).toBe(1);
  });

  it("keeps the rule verdict when the LLM says safe and rules already flagged caution", async () => {
    const llm = new CountingChecker({ verdict: "safe", reason: "Reads fine." });
    const result = await checkCompliance(
      baseInput({ draftBody: "Great question! We use a cron job for this." }),
      context,
      llm,
    );
    expect(result.verdict).toBe("caution");
  });
});
