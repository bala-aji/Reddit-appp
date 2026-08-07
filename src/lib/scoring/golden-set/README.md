# Golden set — starter subset

`golden-set.json` is a **10-item starter set**, not the 300-post golden set
PRD §3.3 calls for ("300 real Reddit posts across 6 verticals... plus 60
deliberate near-misses"). It exists to prove the eval harness
(`pnpm eval:scoring`) is wired correctly end to end — do not treat a pass
against this file as satisfying the §3.3 ship gate.

Before Phase 1 ships, replace this with the real set: real posts (not
synthetic examples like these), hand-labeled by the product owner for
`humanIntentScore` (0-10) and `humanRelevant` (bool), across 6 verticals,
with 60 deliberate near-misses mixed in.

## Fields

- `fullname` — synthetic `t3_` id, unique per item
- `subreddit`, `title`, `body`, `createdUtc`, `score`, `numComments` — post fields matching `RedditPost`
- `humanIntentScore` — 0-10, hand-labeled
- `humanRelevant` — bool, hand-labeled ("would you want this in your feed?")
