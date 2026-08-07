# Compliance golden set — starter subset

`violating-drafts.json` is a **12-item starter set**, not the 50-item set
PRD §3.3 requires ("0 false-negatives on a 50-item set of known
rule-violating drafts... treat as P0"). Unlike the scoring golden set, this
one only exercises `checkComplianceRules` (the deterministic layer) — no
network call, no API key needed — so `pnpm eval:replies` can and does treat
a false negative here as a hard CI failure regardless of sample size: a
false negative in the deterministic rules is a real bug in that code, not a
statistical sampling question.

Before Phase 1 ships, grow this to the real 50-item set: real drafts (not
synthetic examples), including violations the deterministic layer is
expected to miss on its own (that's what the LLM second layer in
`llm-checker.ts` exists to catch — evaluating *that* layer needs a live
`ANTHROPIC_API_KEY` and isn't covered by this script yet).

## Fields

Mirrors `ComplianceCheckInput` (see `../types.ts`) plus:

- `isKnownViolation` — hand-labeled: true if a human reviewer would flag this draft
- `violationType` — free-text note on why, for humans reading the file
