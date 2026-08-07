import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import { MODELS, PRICING, type ModelKey } from "./models";
import { AiCallError } from "./errors";

// AGENTS.md hard rule: every LLM call in the app goes through this module.
// Never call the Anthropic SDK directly from a route, server action, or
// component — this is the single place that gets prompt_version tagging,
// cost accounting, retry-once-on-parse-failure, and the per-job kill switch.
const client = new Anthropic();

export interface StructuredCallUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  costUsd: number;
}

export interface StructuredCallResult<T> {
  data: T;
  usage: StructuredCallUsage;
}

export interface StructuredCallOptions<T> {
  /** Job family + variant, e.g. "scoring:intent-citation", "drafting:reply". Also the kill-switch key. */
  task: string;
  /** Tagged onto every row so evals stay comparable across prompt changes (PRD §3.2). */
  promptVersion: string;
  model: ModelKey;
  system: string;
  user: string;
  schema: ZodType<T>;
  maxTokens?: number;
}

function isDisabled(task: string): boolean {
  const family = task.split(":")[0].toUpperCase();
  const flag = process.env[`AI_DISABLE_${family}`];
  return flag === "1" || flag === "true";
}

function computeCost(
  model: ModelKey,
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  },
): StructuredCallUsage {
  const pricing = PRICING[model];
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheReadInputTokens = usage.cache_read_input_tokens ?? 0;
  const cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;

  const costUsd =
    (inputTokens / 1_000_000) * pricing.inputPerMTok +
    (outputTokens / 1_000_000) * pricing.outputPerMTok +
    (cacheReadInputTokens / 1_000_000) * pricing.inputPerMTok * 0.1 +
    (cacheCreationInputTokens / 1_000_000) * pricing.inputPerMTok * 1.25;

  return { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens, costUsd };
}

/**
 * Structured-output LLM call with a Zod schema, per PRD §3.2: JSON schema
 * output, one retry on failure, cost + prompt_version logging. Scoring and
 * drafting are short, well-shaped outputs where extended thinking only adds
 * cost, so thinking is explicitly disabled on Sonnet (Haiku never enables it
 * unless asked, so there's nothing to disable there).
 */
export async function callStructured<T>(opts: StructuredCallOptions<T>): Promise<StructuredCallResult<T>> {
  if (isDisabled(opts.task)) {
    throw new AiCallError(`AI calls disabled for task family "${opts.task}"`, opts.task);
  }

  const modelId = MODELS[opts.model];
  const request = {
    model: modelId,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user" as const, content: opts.user }],
    output_config: { format: zodOutputFormat(opts.schema) },
    ...(opts.model === "sonnet" ? { thinking: { type: "disabled" as const } } : {}),
  };

  let response;
  try {
    response = await client.messages.parse(request);
  } catch (firstErr) {
    try {
      response = await client.messages.parse(request);
    } catch (retryErr) {
      throw new AiCallError(`AI call failed for task "${opts.task}" after one retry`, opts.task, retryErr ?? firstErr);
    }
  }

  if (response.parsed_output == null) {
    throw new AiCallError(`AI call for task "${opts.task}" returned no parsed output`, opts.task);
  }

  const usage = computeCost(opts.model, response.usage);

  console.log(
    JSON.stringify({
      event: "ai_call",
      task: opts.task,
      promptVersion: opts.promptVersion,
      model: modelId,
      ...usage,
    }),
  );

  return { data: response.parsed_output, usage };
}
