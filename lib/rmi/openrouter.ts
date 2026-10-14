import "server-only";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user"; content: string };

export class OpenRouterError extends Error {}

/**
 * One chat completion, returned as plain text. Thinking is switched off where
 * the model allows it: these are editing and formatting jobs, and reasoning
 * tokens would only add cost and eat into the output budget.
 */
export async function chat(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${opts.apiKey}`,
      "content-type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://rejuvenateresponsibly.com",
      "X-Title": "Rejuvenate Responsibly RMI",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 6000,
      temperature: opts.temperature ?? 0.4,
      reasoning: { enabled: false },
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    throw new OpenRouterError(
      `OpenRouter returned ${res.status} for ${opts.model}: ${(await res.text()).slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new OpenRouterError(data.error?.message ?? `${opts.model} returned an empty answer.`);
  }
  return content;
}
