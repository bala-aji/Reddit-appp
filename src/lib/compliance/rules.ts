import type { ComplianceCheckInput, ComplianceViolation } from "./types";
import { containsUrl, countOccurrences, indexOfProductMention, mentionsProductName } from "./helpers";

export type ComplianceRule = (input: ComplianceCheckInput) => ComplianceViolation | null;

export const checkSelfPromoProhibited: ComplianceRule = (input) => {
  if (input.subredditRules.allowsPromo === false && mentionsProductName(input.draftBody, input.productName)) {
    return {
      rule: "self-promo-prohibited",
      verdict: "blocked",
      detail: "Subreddit rules prohibit self-promotion but the draft mentions the product.",
    };
  }
  return null;
};

export const checkMaxOneProductMention: ComplianceRule = (input) => {
  const count = countOccurrences(input.draftBody, input.productName);
  if (count > 1) {
    return {
      rule: "max-one-product-mention",
      verdict: "caution",
      detail: `Product mentioned ${count} times; PRD F3 caps this at once.`,
    };
  }
  return null;
};

export const checkLinkGate: ComplianceRule = (input) => {
  if (!containsUrl(input.draftBody)) return null;

  if (input.subredditRules.allowsLinks === false) {
    return { rule: "link-not-allowed", verdict: "blocked", detail: "Subreddit rules prohibit links." };
  }
  if (input.intentScore < 8) {
    return {
      rule: "link-requires-high-intent",
      verdict: "blocked",
      detail: `Draft includes a link but intent score is ${input.intentScore} (PRD F3 requires >= 8).`,
    };
  }
  return null;
};

const BANNED_PHRASES: RegExp[] = [/great question!?/i, /i hope this helps!?/i, /as an ai\b/i, /happy to help!?/i];

export const checkBannedPhrases: ComplianceRule = (input) => {
  const hit = BANNED_PHRASES.find((re) => re.test(input.draftBody));
  if (hit) {
    return {
      rule: "banned-phrase",
      verdict: "caution",
      detail: `Contains a flagged LLM-cadence phrase (matched ${hit.source}).`,
    };
  }
  return null;
};

export const checkEmDashDensity: ComplianceRule = (input) => {
  const emDashCount = (input.draftBody.match(/—/g) ?? []).length;
  const wordCount = input.draftBody.split(/\s+/).filter(Boolean).length;
  if (wordCount > 0 && emDashCount >= 2 && emDashCount / wordCount > 0.02) {
    return {
      rule: "em-dash-cadence",
      verdict: "caution",
      detail: `${emDashCount} em-dashes across ${wordCount} words reads as LLM cadence.`,
    };
  }
  return null;
};

export const checkBulletsWithoutPrecedent: ComplianceRule = (input) => {
  const hasBullets = /(^|\n)\s*[-*•]\s+/.test(input.draftBody);
  if (hasBullets && !input.threadUsesBullets) {
    return {
      rule: "unwarranted-bullets",
      verdict: "caution",
      detail: "Draft uses a bullet list but the thread it's replying to doesn't.",
    };
  }
  return null;
};

export const checkValueBeforePromotion: ComplianceRule = (input) => {
  const idx = indexOfProductMention(input.draftBody, input.productName, input.productUrl);
  if (idx === -1) return null;

  const bodyLength = input.draftBody.length;
  if (bodyLength > 0 && idx / bodyLength < 0.2) {
    return {
      rule: "promotion-before-value",
      verdict: "caution",
      detail: "Product is mentioned in the first 20% of the reply, before value is delivered.",
    };
  }
  return null;
};

export const ALL_RULES: ComplianceRule[] = [
  checkSelfPromoProhibited,
  checkLinkGate,
  checkMaxOneProductMention,
  checkBannedPhrases,
  checkEmDashDensity,
  checkBulletsWithoutPrecedent,
  checkValueBeforePromotion,
];
