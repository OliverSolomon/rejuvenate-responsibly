/**
 * Cost of one report, estimated. Pure arithmetic, shared by the server (which
 * knows the prices) and the settings form (which recomputes as you choose).
 *
 * The token counts are measured, not guessed: the drafting prompt for the
 * sample assessments is about 2,500 tokens, the humanizer rules are about
 * 8,000 tokens (31.9k characters), and a generated report is about 1,900
 * tokens (7.6k characters). The humaniser reads the rules plus the draft, and
 * writes the report back out.
 */
export const REPORT_TOKENS = {
  draftIn: 2_500,
  draftOut: 2_000,
  humanizerIn: 10_000,
  humanizerOut: 2_000,
} as const;

export type ModelPrice = {
  id: string;
  /** US dollars per million input tokens. */
  inPerM: number;
  /** US dollars per million output tokens. */
  outPerM: number;
};

function callCost(inTokens: number, outTokens: number, p: ModelPrice): number {
  return (inTokens * p.inPerM + outTokens * p.outPerM) / 1_000_000;
}

export type ReportCost = {
  draft: number | null;
  humanizer: number | null;
  total: number | null;
};

/** Null for a part means that model's price is not known (a custom slug). */
export function reportCost(draft?: ModelPrice, humanizer?: ModelPrice): ReportCost {
  const d = draft ? callCost(REPORT_TOKENS.draftIn, REPORT_TOKENS.draftOut, draft) : null;
  const h = humanizer
    ? callCost(REPORT_TOKENS.humanizerIn, REPORT_TOKENS.humanizerOut, humanizer)
    : null;
  return { draft: d, humanizer: h, total: d !== null && h !== null ? d + h : null };
}

/**
 * An amount in dollars, written in the currency the organisation bills in.
 *
 * Model prices are quoted per million tokens, so a single report often costs a
 * fraction of one unit. Small amounts keep their decimals and large ones lose
 * them, because "KES 0.42" and "KES 54,000" both want to be readable and
 * neither wants the other's precision.
 */
export function formatLocal(usd: number, perUsd: number, currency: string): string {
  const local = usd * perUsd;
  if (local < 0.01) return `under ${currency} 0.01`;
  if (local < 10) return `${currency} ${local.toFixed(2)}`;
  return `${currency} ${local.toLocaleString("en-GB", {
    maximumFractionDigits: local < 1000 ? 1 : 0,
  })}`;
}

/** Cost of one call with this model, for a role that reads `inTokens` and writes `outTokens`. */
export function callCostUsd(inTokens: number, outTokens: number, p: ModelPrice): number {
  return callCost(inTokens, outTokens, p);
}
