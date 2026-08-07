import type { ComplianceCheckInput, ComplianceCheckResult, ComplianceVerdict } from "./types";
import { ALL_RULES } from "./rules";

const VERDICT_SEVERITY: Record<ComplianceVerdict, number> = { safe: 0, caution: 1, blocked: 2 };

/**
 * Deterministic rule-checker (PRD §6 step 5: regex + rule flags first; the
 * LLM check in llm-checker.ts is a second layer, never the only layer).
 * Pure — no network calls, so it's free to run on every draft before
 * spending a token on the LLM layer.
 */
export function checkComplianceRules(input: ComplianceCheckInput): ComplianceCheckResult {
  const violations = ALL_RULES.map((rule) => rule(input)).filter((v) => v !== null);

  const verdict = violations.reduce<ComplianceVerdict>(
    (worst, v) => (VERDICT_SEVERITY[v.verdict] > VERDICT_SEVERITY[worst] ? v.verdict : worst),
    "safe",
  );

  return { verdict, violations };
}
