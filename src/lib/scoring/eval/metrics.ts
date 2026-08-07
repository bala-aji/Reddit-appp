// Pure metric functions for the §3.3 eval gates. No I/O, no model calls —
// scripts/eval-scoring.ts wires these to the golden set and a live scorer.

export function precisionAtK(labels: boolean[], k: number): number {
  const topK = labels.slice(0, k);
  if (topK.length === 0) return 0;
  return topK.filter(Boolean).length / topK.length;
}

export function recall(predictedPositive: boolean[], actualPositive: boolean[]): number {
  if (predictedPositive.length !== actualPositive.length) {
    throw new Error("recall: array length mismatch");
  }
  const actualPositiveCount = actualPositive.filter(Boolean).length;
  if (actualPositiveCount === 0) return 1;

  let truePositives = 0;
  for (let i = 0; i < actualPositive.length; i++) {
    if (actualPositive[i] && predictedPositive[i]) truePositives++;
  }
  return truePositives / actualPositiveCount;
}

function rank(values: number[]): number[] {
  const sorted = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1][0] === sorted[i][0]) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[sorted[k][1]] = avgRank;
    i = j + 1;
  }
  return ranks;
}

export function spearmanCorrelation(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("spearmanCorrelation: array length mismatch");
  }
  const n = a.length;
  if (n < 2) return 0;

  const rankA = rank(a);
  const rankB = rank(b);
  const meanA = rankA.reduce((s, v) => s + v, 0) / n;
  const meanB = rankB.reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = rankA[i] - meanA;
    const db = rankB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  if (varA === 0 || varB === 0) return 0;
  return cov / Math.sqrt(varA * varB);
}
