import { describe, expect, it } from "vitest";
import { cosineSimilarity, embeddingPrefilter } from "./embedding-prefilter";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it("throws on mismatched lengths", () => {
    expect(() => cosineSimilarity([1, 2], [1])).toThrow();
  });
});

describe("embeddingPrefilter", () => {
  it("passes when the best match meets the threshold", () => {
    const result = embeddingPrefilter([1, 0], [[0, 1], [1, 0]], 0.5);
    expect(result.passed).toBe(true);
    expect(result.bestMatchIndex).toBe(1);
  });

  it("fails when no problem statement clears the threshold", () => {
    const result = embeddingPrefilter([1, 0], [[0, 1]], 0.5);
    expect(result.passed).toBe(false);
  });
});
