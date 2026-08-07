export interface CompositeScoreInput {
  intentScore: number;
  citationScore: number;
  freshnessReachScore: number;
}

// PRD §2.3 F2: composite = 0.55*intent + 0.30*citation + 0.15*freshness_and_reach
export function compositeScore(input: CompositeScoreInput): number {
  return 0.55 * input.intentScore + 0.3 * input.citationScore + 0.15 * input.freshnessReachScore;
}
