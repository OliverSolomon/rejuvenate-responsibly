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

export function formatUsd(amount: number): string {
  if (amount < 0.001) return "under $0.001";
  if (amount < 0.1) return `$${amount.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`;
  return `$${amount.toFixed(2)}`;
}
