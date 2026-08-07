export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("cosineSimilarity: vector length mismatch");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface EmbeddingPrefilterResult {
  passed: boolean;
  bestScore: number;
  bestMatchIndex: number;
}

// Stage (b) of the three-stage funnel (PRD §2.3 F2): cosine similarity vs.
// the Product Profile's problem statements, threshold tuned per user. Pure —
// callers compute embeddings elsewhere (an external API call) and pass
// vectors in; no network calls inside scoring logic (PRD §6 step 4).
export function embeddingPrefilter(
  postEmbedding: number[],
  problemStatementEmbeddings: number[][],
  threshold: number,
): EmbeddingPrefilterResult {
  let bestScore = -1;
  let bestMatchIndex = -1;

  problemStatementEmbeddings.forEach((vec, i) => {
    const score = cosineSimilarity(postEmbedding, vec);
    if (score > bestScore) {
      bestScore = score;
      bestMatchIndex = i;
    }
  });

  return { passed: bestScore >= threshold, bestScore, bestMatchIndex };
}
