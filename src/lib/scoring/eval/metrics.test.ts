import { describe, expect, it } from "vitest";
import { precisionAtK, recall, spearmanCorrelation } from "./metrics";

describe("precisionAtK", () => {
  it("computes the fraction of relevant items in the top K", () => {
    expect(precisionAtK([true, true, false, true, false], 4)).toBeCloseTo(0.75);
  });

  it("returns 0 for an empty slice", () => {
    expect(precisionAtK([], 5)).toBe(0);
  });
});

describe("recall", () => {
  it("computes true positives over actual positives", () => {
    const predicted = [true, false, true, false];
    const actual = [true, true, true, false];
    expect(recall(predicted, actual)).toBeCloseTo(2 / 3);
  });

  it("returns 1 when there are no actual positives", () => {
    expect(recall([false, false], [false, false])).toBe(1);
  });

  it("throws on length mismatch", () => {
    expect(() => recall([true], [true, false])).toThrow();
  });
});

describe("spearmanCorrelation", () => {
  it("returns 1 for perfectly correlated rankings", () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
  });

  it("returns -1 for perfectly inverse rankings", () => {
    expect(spearmanCorrelation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
  });

  it("returns 0 for fewer than two points", () => {
    expect(spearmanCorrelation([1], [1])).toBe(0);
  });

  it("handles tied ranks without throwing", () => {
    expect(() => spearmanCorrelation([1, 1, 2], [3, 3, 5])).not.toThrow();
  });
});
