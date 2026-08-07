import { describe, expect, it } from "vitest";
import { checkComplianceRules } from "./checker";
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

describe("checkComplianceRules", () => {
  it("is safe for a plain, value-first reply with no product mention", () => {
    const result = checkComplianceRules(baseInput());
    expect(result.verdict).toBe("safe");
    expect(result.violations).toHaveLength(0);
  });

  it("blocks self-promotion when the subreddit prohibits it", () => {
    const result = checkComplianceRules(
      baseInput({
        draftBody: "You should try Thread, it solves exactly this.",
        subredditRules: { allowsPromo: false, allowsLinks: true },
      }),
    );
    expect(result.verdict).toBe("blocked");
    expect(result.violations.map((v) => v.rule)).toContain("self-promo-prohibited");
  });

  it("blocks a link when the subreddit prohibits links", () => {
    const result = checkComplianceRules(
      baseInput({
        draftBody: "Here's the tool I use: https://example.com",
        subredditRules: { allowsPromo: true, allowsLinks: false },
      }),
    );
    expect(result.verdict).toBe("blocked");
    expect(result.violations.map((v) => v.rule)).toContain("link-not-allowed");
  });

  it("blocks a link when intent is below 8 even if links are allowed", () => {
    const result = checkComplianceRules(
      baseInput({
        draftBody: "Here's the tool I use: https://example.com",
        intentScore: 5,
        subredditRules: { allowsPromo: true, allowsLinks: true },
      }),
    );
    expect(result.verdict).toBe("blocked");
    expect(result.violations.map((v) => v.rule)).toContain("link-requires-high-intent");
  });

  it("cautions on more than one product mention", () => {
    const result = checkComplianceRules(
      baseInput({ draftBody: "Thread does this well. Thread also handles the second part." }),
    );
    expect(result.violations.map((v) => v.rule)).toContain("max-one-product-mention");
    expect(result.verdict).not.toBe("safe");
  });

  it("cautions on a banned LLM-cadence phrase", () => {
    const result = checkComplianceRules(baseInput({ draftBody: "Great question! Here's what worked for us." }));
    expect(result.violations.map((v) => v.rule)).toContain("banned-phrase");
  });

  it("cautions on heavy em-dash density", () => {
    const result = checkComplianceRules(
      baseInput({
        draftBody: "It's simple — fast — and — reliable — in every case — we've tested.",
      }),
    );
    expect(result.violations.map((v) => v.rule)).toContain("em-dash-cadence");
  });

  it("cautions on bullets when the thread doesn't use them", () => {
    const result = checkComplianceRules(
      baseInput({ draftBody: "A few options:\n- one\n- two\n- three", threadUsesBullets: false }),
    );
    expect(result.violations.map((v) => v.rule)).toContain("unwarranted-bullets");
  });

  it("does not flag bullets when the thread already uses them", () => {
    const result = checkComplianceRules(
      baseInput({ draftBody: "A few options:\n- one\n- two", threadUsesBullets: true }),
    );
    expect(result.violations.map((v) => v.rule)).not.toContain("unwarranted-bullets");
  });

  it("cautions when the product is mentioned before any value is delivered", () => {
    const result = checkComplianceRules(baseInput({ draftBody: "Thread is exactly what you need here." }));
    expect(result.violations.map((v) => v.rule)).toContain("promotion-before-value");
  });

  it("does not flag promotion-before-value when the mention comes late", () => {
    const filler = "a".repeat(100);
    const result = checkComplianceRules(baseInput({ draftBody: `${filler} anyway, Thread handles this.` }));
    expect(result.violations.map((v) => v.rule)).not.toContain("promotion-before-value");
  });
});
