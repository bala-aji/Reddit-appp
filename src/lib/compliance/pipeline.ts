import { checkComplianceRules } from "./checker";
import type { ComplianceCheckInput, ComplianceCheckResult, ComplianceVerdict } from "./types";
import type { LlmComplianceChecker } from "./llm-checker";

const VERDICT_SEVERITY: Record<ComplianceVerdict, number> = { safe: 0, caution: 1, blocked: 2 };

export interface ComplianceLlmContext {
  threadTitle: string;
  subredditRulesText: string[];
}

/**
 * Deterministic rules run first and can short-circuit a "blocked" verdict
 * without spending a token — the LLM layer only runs on drafts that survive
 * the rules, and its verdict can only escalate, never downgrade, the rule
 * result (PRD's compliance-checker P0: 0 false negatives).
 */
export async function checkCompliance(
  input: ComplianceCheckInput,
  context: ComplianceLlmContext,
  llmChecker: LlmComplianceChecker,
): Promise<ComplianceCheckResult> {
  const ruleResult = checkComplianceRules(input);
  if (ruleResult.verdict === "blocked") {
    return ruleResult;
  }

  const llmResult = await llmChecker.check({
    draftBody: input.draftBody,
    threadTitle: context.threadTitle,
    subredditRulesText: context.subredditRulesText,
  });

  const verdict =
    VERDICT_SEVERITY[llmResult.verdict] > VERDICT_SEVERITY[ruleResult.verdict] ? llmResult.verdict : ruleResult.verdict;

  return {
    verdict,
    violations: [
      ...ruleResult.violations,
      ...(llmResult.verdict !== "safe"
        ? [{ rule: "llm-judgment", verdict: llmResult.verdict, detail: llmResult.reason }]
        : []),
    ],
  };
}
