// Eval harness CLI (PRD §6 step 8 / §3.3). Run with `pnpm eval:replies`.
//
// Currently covers only the compliance-checker P0 gate: "0 false-negatives
// on a 50-item set of known rule-violating drafts" — against the 12-item
// starter set in src/lib/compliance/golden-set/ (see its README). This
// exercises checkComplianceRules only (deterministic, no network call), so
// unlike eval-scoring.ts this gate is NOT advisory: a false negative here is
// a real defect in the rule-checker regardless of sample size, and the
// script exits 1 on any.
//
// NOT yet covered: the 40-thread reply-quality rubric (mean >= 4.0, zero 1s
// on "would a mod remove this") — that needs the reply-drafting prompt (PRD
// F3), which hasn't been built yet (comes after lib/compliance per §6).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { checkComplianceRules } from "../src/lib/compliance/checker";
import type { ComplianceCheckInput } from "../src/lib/compliance/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GoldenSetItem extends ComplianceCheckInput {
  isKnownViolation: boolean;
  violationType: string;
}

function loadGoldenSet(): GoldenSetItem[] {
  const path = join(__dirname, "../src/lib/compliance/golden-set/violating-drafts.json");
  return JSON.parse(readFileSync(path, "utf8")) as GoldenSetItem[];
}

function main() {
  const items = loadGoldenSet();

  const falseNegatives = items.filter((item) => {
    if (!item.isKnownViolation) return false;
    const result = checkComplianceRules(item);
    return result.verdict === "safe";
  });

  console.log(`\nCompliance false-negative gate — ${items.length}-item starter set\n`);
  console.log(`  Known-violating drafts: ${items.filter((i) => i.isKnownViolation).length}`);
  console.log(`  False negatives: ${falseNegatives.length}`);

  if (falseNegatives.length > 0) {
    console.log("\n  Missed violations:");
    for (const item of falseNegatives) {
      console.log(`    - "${item.draftBody.slice(0, 60)}..." (${item.violationType})`);
    }
  }

  const status = falseNegatives.length === 0 ? "PASS" : "FAIL";
  console.log(`\n  [${status}] 0 false-negatives required (P0 — a false negative here means a real ban risk)`);

  console.log(
    "\nNot run: reply-quality rubric (needs PRD F3 reply drafting, not built yet) and the LLM compliance layer (needs ANTHROPIC_API_KEY).",
  );

  process.exit(falseNegatives.length === 0 ? 0 : 1);
}

main();
