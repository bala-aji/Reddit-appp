import { describe, expect, it } from "vitest";
import { containsUrl, countOccurrences, indexOfProductMention, mentionsProductName } from "./helpers";

describe("mentionsProductName", () => {
  it("matches whole-word, case-insensitive", () => {
    expect(mentionsProductName("I've been using Thread for a week", "thread")).toBe(true);
  });

  it("does not match a substring inside another word", () => {
    expect(mentionsProductName("I read the threadbare manual", "thread")).toBe(false);
  });

  it("returns false for an empty product name", () => {
    expect(mentionsProductName("anything", "")).toBe(false);
  });
});

describe("countOccurrences", () => {
  it("counts multiple whole-word matches", () => {
    expect(countOccurrences("Thread is great. I recommend Thread.", "Thread")).toBe(2);
  });
});

describe("containsUrl", () => {
  it("detects an http(s) URL", () => {
    expect(containsUrl("check out https://example.com/thing")).toBe(true);
  });

  it("returns false with no URL", () => {
    expect(containsUrl("no links here")).toBe(false);
  });
});

describe("indexOfProductMention", () => {
  it("finds the earlier of a name or URL mention", () => {
    const text = "We built https://example.com and call it Thread.";
    const idx = indexOfProductMention(text, "Thread", "https://example.com");
    expect(idx).toBe(text.indexOf("https://example.com"));
  });

  it("returns -1 when neither appears", () => {
    expect(indexOfProductMention("nothing to see", "Thread")).toBe(-1);
  });
});
