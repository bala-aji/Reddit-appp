// Model routing (PRD §3.1): Haiku for high-volume scoring/compliance,
// Sonnet for drafting and profiling. Model IDs and pricing per Anthropic's
// current catalog — do not append date suffixes to these aliases.
export const MODELS = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-5",
} as const;

export type ModelKey = keyof typeof MODELS;

// USD per million tokens, standard (non-introductory) pricing.
export const PRICING: Record<ModelKey, { inputPerMTok: number; outputPerMTok: number }> = {
  haiku: { inputPerMTok: 1.0, outputPerMTok: 5.0 },
  sonnet: { inputPerMTok: 3.0, outputPerMTok: 15.0 },
};
