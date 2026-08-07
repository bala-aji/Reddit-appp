import { describe, expect, it } from "vitest";
import { keywordPrefilter } from "./keyword-prefilter";

describe("keywordPrefilter", () => {
  it("passes when a positive keyword matches and no negative keyword does", () => {
    const result = keywordPrefilter({
      title: "Best tool for tracking Reddit mentions?",
      body: "Looking for something that surfaces relevant threads automatically.",
      keywords: ["reddit mentions", "tool"],
      negativeKeywords: ["hiring"],
    });
    expect(result.passed).toBe(true);
    expect(result.matchedKeywords).toContain("tool");
  });

  it("fails when a negative keyword matches even if a positive one does too", () => {
    const result = keywordPrefilter({
      title: "Hiring a tool for tracking mentions",
      body: "",
      keywords: ["tool"],
      negativeKeywords: ["hiring"],
    });
    expect(result.passed).toBe(false);
    expect(result.matchedNegative).toContain("hiring");
  });

  it("fails when no positive keyword matches", () => {
    const result = keywordPrefilter({
      title: "My dog ate my charger",
      body: "unrelated venting",
      keywords: ["reddit mentions"],
      negativeKeywords: [],
    });
    expect(result.passed).toBe(false);
  });
});
