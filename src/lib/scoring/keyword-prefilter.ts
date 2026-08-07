export interface KeywordPrefilterInput {
  title: string;
  body: string;
  keywords: string[];
  negativeKeywords: string[];
}

export interface KeywordPrefilterResult {
  passed: boolean;
  matchedKeywords: string[];
  matchedNegative: string[];
}

// Stage (a) of the three-stage funnel (PRD §2.3 F2). Pure — no network calls.
export function keywordPrefilter(input: KeywordPrefilterInput): KeywordPrefilterResult {
  const haystack = `${input.title} ${input.body}`.toLowerCase();
  const matchedKeywords = input.keywords.filter((k) => haystack.includes(k.toLowerCase()));
  const matchedNegative = input.negativeKeywords.filter((k) => haystack.includes(k.toLowerCase()));

  return {
    passed: matchedKeywords.length > 0 && matchedNegative.length === 0,
    matchedKeywords,
    matchedNegative,
  };
}
