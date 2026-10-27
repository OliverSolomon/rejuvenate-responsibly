/**
 * The countries this is sold in, and what they charge in.
 *
 * Two blocs: the East African Community and the Southern African Development
 * Community. Four countries belong to both, and they appear once, under EAC,
 * with their other membership noted, rather than twice in a dropdown.
 *
 * No server imports: the settings form reads this list too.
 */

export type Bloc = "EAC" | "SADC";

export type Country = {
  /** ISO 3166-1 alpha-2, which is what gets stored. */
  code: string;
  name: string;
  /** Which list it appears under. */
  bloc: Bloc;
  /** In both blocs, which the form says rather than listing it twice. */
  alsoIn?: Bloc;
  /** ISO 4217 for the local currency. */
  currency: string;
};

/**
 * EAC first, since that is where the firm works. Alphabetical within each bloc
 * so a dropdown is scannable.
 */
export const COUNTRIES: Country[] = [
  // East African Community
  { code: "BI", name: "Burundi", bloc: "EAC", currency: "BIF" },
  { code: "CD", name: "Democratic Republic of the Congo", bloc: "EAC", alsoIn: "SADC", currency: "CDF" },
  { code: "KE", name: "Kenya", bloc: "EAC", currency: "KES" },
  { code: "RW", name: "Rwanda", bloc: "EAC", currency: "RWF" },
  { code: "SO", name: "Somalia", bloc: "EAC", currency: "SOS" },
  { code: "SS", name: "South Sudan", bloc: "EAC", currency: "SSP" },
  { code: "TZ", name: "Tanzania", bloc: "EAC", alsoIn: "SADC", currency: "TZS" },
  { code: "UG", name: "Uganda", bloc: "EAC", currency: "UGX" },

  // Southern African Development Community
  { code: "AO", name: "Angola", bloc: "SADC", currency: "AOA" },
  { code: "BW", name: "Botswana", bloc: "SADC", currency: "BWP" },
  { code: "KM", name: "Comoros", bloc: "SADC", currency: "KMF" },
  { code: "SZ", name: "Eswatini", bloc: "SADC", currency: "SZL" },
  { code: "LS", name: "Lesotho", bloc: "SADC", currency: "LSL" },
  { code: "MG", name: "Madagascar", bloc: "SADC", currency: "MGA" },
  { code: "MW", name: "Malawi", bloc: "SADC", currency: "MWK" },
  { code: "MU", name: "Mauritius", bloc: "SADC", currency: "MUR" },
  { code: "MZ", name: "Mozambique", bloc: "SADC", currency: "MZN" },
  { code: "NA", name: "Namibia", bloc: "SADC", currency: "NAD" },
  { code: "SC", name: "Seychelles", bloc: "SADC", currency: "SCR" },
  { code: "ZA", name: "South Africa", bloc: "SADC", currency: "ZAR" },
  { code: "ZM", name: "Zambia", bloc: "SADC", currency: "ZMW" },
  { code: "ZW", name: "Zimbabwe", bloc: "SADC", currency: "ZWG" },
];

export const BLOC_LABEL: Record<Bloc, string> = {
  EAC: "East African Community",
  SADC: "Southern African Development Community",
};

/** The default, which is where the firm is. */
export const DEFAULT_COUNTRY = "KE";

export function countryFor(code: string | undefined): Country | undefined {
  if (!code) return undefined;
  const wanted = code.trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === wanted);
}

export function isCountryCode(value: unknown): boolean {
  return typeof value === "string" && Boolean(countryFor(value));
}

/* -------------------------------------------------------------------------- */
/* currencies                                                                  */
/* -------------------------------------------------------------------------- */

export type Currency = {
  code: string;
  name: string;
  /** What to put in front of an amount. Falls back to the code. */
  symbol?: string;
  /** Minor units. The franc currencies here have none. */
  decimals: number;
};

/**
 * Every local currency of the countries above, plus the two alternatives that
 * are always offered. Nobody is forced to bill in their own currency.
 */
export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US dollar", symbol: "$", decimals: 2 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "AOA", name: "Angolan kwanza", decimals: 2 },
  { code: "BIF", name: "Burundian franc", decimals: 0 },
  { code: "BWP", name: "Botswana pula", symbol: "P", decimals: 2 },
  { code: "CDF", name: "Congolese franc", decimals: 2 },
  { code: "KES", name: "Kenyan shilling", symbol: "KSh", decimals: 2 },
  { code: "KMF", name: "Comorian franc", decimals: 0 },
  { code: "LSL", name: "Lesotho loti", decimals: 2 },
  { code: "MGA", name: "Malagasy ariary", decimals: 0 },
  { code: "MUR", name: "Mauritian rupee", symbol: "₨", decimals: 2 },
  { code: "MWK", name: "Malawian kwacha", decimals: 2 },
  { code: "MZN", name: "Mozambican metical", decimals: 2 },
  { code: "NAD", name: "Namibian dollar", symbol: "N$", decimals: 2 },
  { code: "RWF", name: "Rwandan franc", decimals: 0 },
  { code: "SCR", name: "Seychellois rupee", decimals: 2 },
  { code: "SOS", name: "Somali shilling", decimals: 2 },
  { code: "SSP", name: "South Sudanese pound", decimals: 2 },
  { code: "SZL", name: "Swazi lilangeni", decimals: 2 },
  { code: "TZS", name: "Tanzanian shilling", decimals: 2 },
  { code: "UGX", name: "Ugandan shilling", decimals: 0 },
  { code: "ZAR", name: "South African rand", symbol: "R", decimals: 2 },
  { code: "ZMW", name: "Zambian kwacha", symbol: "K", decimals: 2 },
  { code: "ZWG", name: "Zimbabwe gold", decimals: 2 },
];

/** Always offered whatever the country, so nobody is stuck billing locally. */
export const ALWAYS_OFFERED = ["USD", "EUR"] as const;

export const DEFAULT_CURRENCY = "KES";

export function currencyFor(code: string | undefined): Currency | undefined {
  if (!code) return undefined;
  const wanted = code.trim().toUpperCase();
  return CURRENCIES.find((c) => c.code === wanted);
}

export function isCurrencyCode(value: unknown): boolean {
  return typeof value === "string" && Boolean(currencyFor(value));
}

/**
 * What a country should bill in unless it says otherwise: its own currency, or
 * dollars when we have no entry for it.
 */
export function defaultCurrencyFor(countryCode: string | undefined): string {
  const country = countryFor(countryCode);
  if (!country) return DEFAULT_CURRENCY;
  return currencyFor(country.currency) ? country.currency : "USD";
}

/**
 * The currencies to offer for a country: its own first, then the dollar and the
 * euro. Three entries, or two when the country already bills in one of them.
 */
export function currencyChoicesFor(countryCode: string | undefined): Currency[] {
  const local = defaultCurrencyFor(countryCode);
  const codes = [local, ...ALWAYS_OFFERED.filter((c) => c !== local)];
  return codes
    .map((code) => currencyFor(code))
    .filter((c): c is Currency => Boolean(c));
}

/**
 * An amount with its currency, in the way the country writes it.
 *
 * Intl does the work, so a kwacha reads as a kwacha. The franc currencies have
 * no minor unit, which is why decimals come from the table rather than being
 * assumed to be two.
 */
export function formatMoney(
  amount: number,
  code: string,
  options: { round?: boolean } = {},
): string {
  const currency = currencyFor(code);
  const decimals = options.round ? 0 : (currency?.decimals ?? 2);

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    // An unknown code should still print something sensible.
    const shown = amount.toLocaleString("en-GB", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${currency?.symbol ?? code} ${shown}`;
  }
}
