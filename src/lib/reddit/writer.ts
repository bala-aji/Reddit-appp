// Defined per PRD §6 step 3 ("RedditReader, RedditWriter"). NOT wired into
// any call site yet: PRD open decision §7.3 leans copy-only for MVP
// ("Copy & Open Thread → mark Posted" in the daily loop, §2.2) and the
// explicit non-goal in §2.4 is "no cron that comments without a human
// clicking." If direct in-app posting ships later, callers still go through
// this interface — never straight to a provider — so the rate governor
// (PRD F5: 3/hr, 8/day, 12-min spacing, jittered ±40%) has one seam to
// enforce against, and it stays swappable like RedditReader.
export interface RedditWriter {
  postComment(parentFullname: string, body: string): Promise<{ fullname: string }>;
}
