import "server-only";

import type { ModelPrice } from "./model-cost";

/**
 * The models offered in the settings dropdowns, with their current prices.
 *
 * Prices come from OpenRouter's public model list (cached for an hour). If that
 * cannot be reached, the built-in figures below are used and the page says so.
 * Only models in CHOICES are offered, so the list stays short and every entry
 * is one that suits these jobs: following a fixed structure, or editing prose
 * without dropping figures. Any other model can still be typed in.
 */

/** Cheap models that suit the work, plus two Claude models for comparison. */
const CHOICES = [
  "deepseek/deepseek-v4-flash",
  "qwen/qwen3.7-flash",
  "google/gemini-2.5-flash-lite",
  "qwen/qwen3.8-flash",
  "z-ai/glm-5.3-flash",
  "mistralai/mistral-small-2603",
  "meta-llama/llama-4-maverick",
  "openai/gpt-5.4-nano",
  "openai/gpt-4.1-mini",
  "google/gemini-2.5-flash",
  "anthropic/claude-haiku-5.5",
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-sonnet-4.5",
] as const;

/** Prices seen on OpenRouter on 14 Oct 2026, used when the live list is unreachable. */
const BUILT_IN: Record<(typeof CHOICES)[number], [number, number]> = {
  "deepseek/deepseek-v4-flash": [0.091, 0.182],
  "qwen/qwen3.7-flash": [0.03, 0.13],
  "google/gemini-2.5-flash-lite": [0.1, 0.4],
  "qwen/qwen3.8-flash": [0.15, 0.47],
  "z-ai/glm-5.3-flash": [0.15, 0.5],
  "mistralai/mistral-small-2603": [0.15, 0.6],
  "meta-llama/llama-4-maverick": [0.188, 0.652],
  "openai/gpt-5.4-nano": [0.2, 1.25],
  "openai/gpt-4.1-mini": [0.4, 1.6],
  "google/gemini-2.5-flash": [0.3, 2.5],
  "anthropic/claude-haiku-5.5": [0.1, 0.5],
  "anthropic/claude-sonnet-5.5": [2, 10],
  "anthropic/claude-sonnet-4.5": [3, 15],
};

export type ModelCatalogue = {
  models: ModelPrice[];
  source: "live" | "built-in";
};

function builtIn(): ModelPrice[] {
  return CHOICES.map((id) => ({ id, inPerM: BUILT_IN[id][0], outPerM: BUILT_IN[id][1] }));
}

export async function modelCatalogue(): Promise<ModelCatalogue> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(String(res.status));

    const data = (await res.json()) as {
      data?: { id: string; pricing?: { prompt?: string; completion?: string } }[];
    };
    const live = new Map((data.data ?? []).map((m) => [m.id, m]));

    const models: ModelPrice[] = [];
    for (const id of CHOICES) {
      const m = live.get(id);
      const prompt = Number(m?.pricing?.prompt);
      const completion = Number(m?.pricing?.completion);
      // Left out when OpenRouter no longer lists it, so the dropdown never
      // offers a model that would fail on the first report.
      if (m && Number.isFinite(prompt) && Number.isFinite(completion)) {
        models.push({ id, inPerM: prompt * 1_000_000, outPerM: completion * 1_000_000 });
      }
    }
    if (models.length === 0) throw new Error("empty");
    return { models, source: "live" };
  } catch {
    return { models: builtIn(), source: "built-in" };
  }
}
