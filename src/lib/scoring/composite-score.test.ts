import { describe, expect, it } from "vitest";
import { compositeScore } from "./composite-score";

describe("compositeScore", () => {
  it("applies the PRD §2.3 F2 weights (0.55/0.30/0.15)", () => {
    const score = compositeScore({ intentScore: 10, citationScore: 10, freshnessReachScore: 10 });
    expect(score).toBeCloseTo(10);
  });

  it("weights intent most heavily", () => {
    const intentHeavy = compositeScore({ intentScore: 10, citationScore: 0, freshnessReachScore: 0 });
    const citationHeavy = compositeScore({ intentScore: 0, citationScore: 10, freshnessReachScore: 0 });
    expect(intentHeavy).toBeGreaterThan(citationHeavy);
  });

  it("returns 0 for all-zero inputs", () => {
    expect(compositeScore({ intentScore: 0, citationScore: 0, freshnessReachScore: 0 })).toBe(0);
  });
});
