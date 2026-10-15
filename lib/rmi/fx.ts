import "server-only";

/**
 * US dollar to Kenyan shilling, for showing what a report costs in KES.
 *
 * Two independent public sources are tried in order, each cached for six hours
 * (rates are published daily, so there is nothing to gain from asking more
 * often). If both are unreachable a built-in rate is used and the page says so,
 * so the figure is never silently stale.
 *
 * Sources:
 *  - open.er-api.com, ExchangeRate-API's open endpoint. Free, no key, daily
 *    rates, KES included. Attribution is required and shown on the page.
 *  - Fawaz Ahmed's currency-api, served from the jsDelivr CDN. Free, no key.
 */

export type FxRate = {
  /** Kenyan shillings per US dollar. */
  kesPerUsd: number;
  source: "live" | "built-in";
  /** Where the rate came from, for the attribution line. */
  provider: string;
  /** ISO timestamp the provider published the rate, when it says. */
  asOf: string | null;
};

/** Roughly the rate in October 2026; only used when no source answers. */
const BUILT_IN_KES_PER_USD = 129;

const REVALIDATE = 6 * 60 * 60;

/** A plausible shilling rate. Guards against a bad payload being shown as fact. */
const sane = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 50 && n < 400;

async function fromExchangeRateApi(): Promise<FxRate> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: REVALIDATE },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as {
    result?: string;
    time_last_update_utc?: string;
    rates?: Record<string, number>;
  };
  const rate = data.rates?.KES;
  if (data.result !== "success" || !sane(rate)) throw new Error("bad payload");
  const asOf = data.time_last_update_utc ? new Date(data.time_last_update_utc) : null;
  return {
    kesPerUsd: rate,
    source: "live",
    provider: "ExchangeRate-API",
    asOf: asOf && !Number.isNaN(asOf.getTime()) ? asOf.toISOString() : null,
  };
}

async function fromCurrencyApi(): Promise<FxRate> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { date?: string; usd?: Record<string, number> };
  const rate = data.usd?.kes;
  if (!sane(rate)) throw new Error("bad payload");
  return {
    kesPerUsd: rate,
    source: "live",
    provider: "currency-api (jsDelivr)",
    asOf: data.date ?? null,
  };
}

export async function kesPerUsd(): Promise<FxRate> {
  for (const source of [fromExchangeRateApi, fromCurrencyApi]) {
    try {
      return await source();
    } catch {
      // try the next source
    }
  }
  return { kesPerUsd: BUILT_IN_KES_PER_USD, source: "built-in", provider: "built-in estimate", asOf: null };
}
