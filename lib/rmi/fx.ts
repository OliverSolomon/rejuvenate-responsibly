import "server-only";

import { currencyFor } from "./regions";

/**
 * What a US dollar is worth in the currency the organisation bills in, for
 * showing what a report costs in money people recognise.
 *
 * Two independent public sources are tried in order, each cached for six hours
 * (rates are published daily, so there is nothing to gain from asking more
 * often). If both are unreachable a built-in rate is used and the page says so,
 * so the figure is never silently stale.
 *
 * Sources:
 *  - open.er-api.com, ExchangeRate-API's open endpoint. Free, no key, daily
 *    rates, every currency here included. Attribution is required and shown on
 *    the page.
 *  - Fawaz Ahmed's currency-api, served from the jsDelivr CDN. Free, no key.
 */

export type FxRate = {
  /** The currency this rate is for. */
  currency: string;
  /** Units of that currency per US dollar. 1 when the currency is the dollar. */
  perUsd: number;
  source: "live" | "built-in" | "none";
  /** Where the rate came from, for the attribution line. */
  provider: string;
  /** ISO timestamp the provider published the rate, when it says. */
  asOf: string | null;
};

/**
 * Rough rates in October 2026, used only when no source answers. Kept to the
 * currencies the countries in regions.ts bill in, so a page always has a
 * figure to show rather than a blank.
 */
const BUILT_IN: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  KES: 129,
  TZS: 2500,
  UGX: 3700,
  RWF: 1350,
  BIF: 2950,
  SOS: 571,
  SSP: 4500,
  CDF: 2800,
  ZAR: 18,
  BWP: 13.5,
  NAD: 18,
  LSL: 18,
  SZL: 18,
  ZMW: 26,
  ZWG: 26,
  MWK: 1750,
  MZN: 64,
  AOA: 920,
  MUR: 46,
  SCR: 14.5,
  MGA: 4500,
  KMF: 455,
};

const REVALIDATE = 6 * 60 * 60;

/** Guards against a bad payload being shown as fact. */
const sane = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n < 100_000;

async function fromExchangeRateApi(code: string): Promise<FxRate> {
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
  const rate = data.rates?.[code];
  if (data.result !== "success" || !sane(rate)) throw new Error("bad payload");
  const asOf = data.time_last_update_utc ? new Date(data.time_last_update_utc) : null;
  return {
    currency: code,
    perUsd: rate,
    source: "live",
    provider: "ExchangeRate-API",
    asOf: asOf && !Number.isNaN(asOf.getTime()) ? asOf.toISOString() : null,
  };
}

async function fromCurrencyApi(code: string): Promise<FxRate> {
  const res = await fetch(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(4000) },
  );
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as { date?: string; usd?: Record<string, number> };
  const rate = data.usd?.[code.toLowerCase()];
  if (!sane(rate)) throw new Error("bad payload");
  return {
    currency: code,
    perUsd: rate,
    source: "live",
    provider: "currency-api (jsDelivr)",
    asOf: data.date ?? null,
  };
}

/**
 * The rate for one currency. Billing in dollars needs no rate at all, which is
 * worth short-circuiting: it avoids a network call and the attribution line
 * that would otherwise sit under a figure that was never converted.
 */
export async function ratePerUsd(code: string): Promise<FxRate> {
  const wanted = (currencyFor(code)?.code ?? code).toUpperCase();

  if (wanted === "USD") {
    return { currency: "USD", perUsd: 1, source: "none", provider: "", asOf: null };
  }

  for (const source of [fromExchangeRateApi, fromCurrencyApi]) {
    try {
      return await source(wanted);
    } catch {
      // try the next source
    }
  }

  return {
    currency: wanted,
    perUsd: BUILT_IN[wanted] ?? 1,
    source: "built-in",
    provider: "built-in estimate",
    asOf: null,
  };
}
