import "server-only";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = { role: "system" | "user"; content: string };

export class OpenRouterError extends Error {
  constructor(
    message: string,
    /** The HTTP status OpenRouter answered with, when it got that far. */
    readonly status?: number,
  ) {
    super(message);
  }

  /** 402 is how OpenRouter says the account has no credit left. */
  get creditsOut(): boolean {
    return this.status === 402;
  }
}

/**
 * Whether a key still has credit, asked of OpenRouter directly.
 *
 * `null` means it could not be worked out, which is not the same as out: a key
 * with no limit set reports none, and a network failure reports nothing at
 * all. Callers treat only an explicit `true` as a problem. Cached briefly so a
 * dashboard that is opened often does not ask on every page.
 */
const creditCache = new Map<string, { at: number; out: boolean | null }>();

export async function creditsOut(apiKey: string): Promise<boolean | null> {
  const hit = creditCache.get(apiKey);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.out;

  let out: boolean | null = null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 402) out = true;
    else if (res.ok) {
      const data = (await res.json()) as { data?: { limit_remaining?: number | null } };
      const left = data.data?.limit_remaining;
      out = typeof left === "number" ? left <= 0 : null;
    }
  } catch {
    out = null;
  }
  creditCache.set(apiKey, { at: Date.now(), out });
  return out;
}

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
      res.status,
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
