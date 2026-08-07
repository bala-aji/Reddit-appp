export interface FreshnessReachInput {
  postCreatedUtc: string;
  /** Injected rather than read from the clock, so this stays pure and testable. */
  now: string;
  subredditSubscribers: number;
  score: number;
}

// Freshness/reach sub-score (PRD §2.3 F2): age decay x subreddit subscriber
// log x current upvote velocity, banded into 0-10.
export function freshnessReachScore(input: FreshnessReachInput): number {
  const ageHours = Math.max(
    0,
    (new Date(input.now).getTime() - new Date(input.postCreatedUtc).getTime()) / (1000 * 60 * 60),
  );
  const ageDecay = Math.exp(-ageHours / 24);
  const subscriberLog = Math.log10(Math.max(10, input.subredditSubscribers));
  const velocity = input.score / Math.max(1, ageHours);
  const raw = ageDecay * subscriberLog * Math.log10(1 + velocity);

  return Math.max(0, Math.min(10, raw * 2));
}
