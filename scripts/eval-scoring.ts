// Eval harness CLI (PRD §6 step 8 / §3.3). Run with `pnpm eval:scoring`.
//
// IMPORTANT: golden-set.json is a 10-item starter set, not the real 300-post
// golden set §3.3 requires — see src/lib/scoring/golden-set/README.md. Gate
// failures here are advisory only until the real set is in place; this
// script exits 0 regardless of gate outcome while the set stays this small,
// so it never gives a false "shipped" signal in CI.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AnthropicScorer } from "../src/lib/scoring/intent-citation-scorer";
import { precisionAtK, recall, spearmanCorrelation } from "../src/lib/scoring/eval/metrics";
import type { RedditPost } from "../src/lib/reddit/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REAL_GOLDEN_SET_SIZE = 300;
const RELEVANCE_THRESHOLD = 5; // predicted intentScore >= this counts as "relevant"

const PRODUCT_PROBLEM_STATEMENTS = [
  "founders wasting hours a day manually searching Reddit for buyer-intent threads",
  "founders worried about getting banned for a badly-judged promotional comment",
  "founders who want to know whether ChatGPT/Perplexity recommend their product",
];

interface GoldenSetItem {
  fullname: string;
  subreddit: string;
  title: string;
  body: string;
  createdUtc: string;
  score: number;
  numComments: number;
  humanIntentScore: number;
  humanRelevant: boolean;
}

function loadGoldenSet(): GoldenSetItem[] {
  const path = join(__dirname, "../src/lib/scoring/golden-set/golden-set.json");
  return JSON.parse(readFileSync(path, "utf8")) as GoldenSetItem[];
}

function toPost(item: GoldenSetItem): RedditPost {
  return {
    fullname: item.fullname,
    subreddit: item.subreddit,
    title: item.title,
    body: item.body,
    author: "golden-set",
    url: `https://reddit.com/${item.fullname}`,
    permalink: `https://reddit.com/${item.fullname}`,
    createdUtc: item.createdUtc,
    score: item.score,
    numComments: item.numComments,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY not set — skipping live scoring eval. Set it to run this for real.");
    process.exit(0);
  }

  const items = loadGoldenSet();
  const scorer = new AnthropicScorer();

  const results = await Promise.all(
    items.map(async (item) => {
      const result = await scorer.score({ post: toPost(item), problemStatements: PRODUCT_PROBLEM_STATEMENTS });
      return { item, result };
    }),
  );

  const sortedByPredicted = [...results].sort((a, b) => b.result.intentScore - a.result.intentScore);
  const k = Math.min(10, sortedByPredicted.length);
  const precision = precisionAtK(
    sortedByPredicted.map((r) => r.item.humanRelevant),
    k,
  );

  const predictedPositive = results.map((r) => r.result.intentScore >= RELEVANCE_THRESHOLD);
  const actualPositive = results.map((r) => r.item.humanRelevant);
  const recallScore = recall(predictedPositive, actualPositive);

  const spearman = spearmanCorrelation(
    results.map((r) => r.result.intentScore),
    results.map((r) => r.item.humanIntentScore),
  );

  const gates = [
    { name: `Precision@${k}`, value: precision, threshold: 0.7, pass: precision >= 0.7 },
    { name: "Recall (high-intent)", value: recallScore, threshold: 0.8, pass: recallScore >= 0.8 },
    { name: "Spearman correlation", value: spearman, threshold: 0.65, pass: spearman >= 0.65 },
  ];

  console.log(`\nScoring eval — ${items.length}-item golden set\n`);
  for (const gate of gates) {
    const status = gate.pass ? "PASS" : "FAIL";
    console.log(`  [${status}] ${gate.name}: ${gate.value.toFixed(3)} (gate: >= ${gate.threshold})`);
  }

  const isStarterSet = items.length < REAL_GOLDEN_SET_SIZE;
  if (isStarterSet) {
    console.log(
      `\nAdvisory only: this is a ${items.length}-item starter set, not the §3.3 300-post golden set.`,
      "Gate failures here do not block shipping — see src/lib/scoring/golden-set/README.md.",
    );
  }

  const allPassed = gates.every((g) => g.pass);
  process.exit(isStarterSet ? 0 : allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
