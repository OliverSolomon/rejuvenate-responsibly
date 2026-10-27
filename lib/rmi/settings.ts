import "server-only";

import { EMAIL_KIND_IDS, type EmailKind } from "./email-kinds";
import {
  changeSettings,
  readSettings,
  readTemplate,
  type BrandAsset,
  type SharedKind,
  type StoredSettings,
} from "./store";
import {
  DEFAULT_COUNTRY,
  defaultCurrencyFor,
  isCountryCode,
  isCurrencyCode,
} from "./regions";
import { pricing, type Tier } from "./pricing";
import { paletteCss, paletteFrom, type PaletteSeeds } from "./palette";
import { currentScope, settingsCompany, DEFAULT_COMPANY } from "./scope";
import { site } from "@/lib/site";
import {
  decryptSecret,
  encryptionAvailable,
  encryptSecret,
  SecretsUnavailableError,
} from "./secrets";

/**
 * One place that answers "what is the setting right now".
 *
 * Order: a value saved in the dashboard, then the environment, then a built-in
 * default. A dashboard value therefore wins, and clearing it hands control back
 * to the environment.
 */

export const DEFAULT_DRAFT_MODEL = "deepseek/deepseek-v4-flash";
export const DEFAULT_HUMANIZER_MODEL = "openai/gpt-4.1-mini";

export type Source = "dashboard" | "env" | "default" | "none";

/* -------------------------------------------------------------------------- */
/* what the rest of the app reads                                             */
/* -------------------------------------------------------------------------- */

/**
 * Which company's settings a dashboard reader should use.
 *
 * Resolved here rather than passed through every signature, because the answer
 * is a fact about the request and every caller would otherwise have to carry it
 * from the page down. A request with nobody signed in falls back to the default
 * company, which is what the public pages want.
 */
async function scopedSettings(): Promise<StoredSettings> {
  const scope = await currentScope();
  return safeSettings(scope ? settingsCompany(scope) : DEFAULT_COMPANY);
}

/**
 * The keys the whole installation shares, which live on the default company's
 * row: the OpenRouter key and models, the Pesapal credentials, the mail
 * provider. One set for everyone, and only a super admin may change them.
 */
async function installationSettings(): Promise<StoredSettings> {
  return safeSettings(DEFAULT_COMPANY);
}

/** The company a request is about when the caller does not say. */
async function activeCompany(): Promise<string> {
  const scope = await currentScope();
  return scope ? settingsCompany(scope) : DEFAULT_COMPANY;
}

/**
 * Whose keys or template a company actually uses.
 *
 * A company other than the default one borrows the installation's unless a
 * super admin has switched that off for it, in which case it has to bring its
 * own. The default company is the installation, so it always uses its own row.
 * Sharing is on unless it was explicitly turned off, so a new company works
 * from the first day without anybody having to remember to enable it.
 */
export type Holder = {
  /** The row the values are read from. */
  settings: StoredSettings;
  /** The company whose row that is. */
  owner: string;
  /** True when the company is using the installation's, not its own. */
  shared: boolean;
};

async function holder(companyId: string, kind: SharedKind): Promise<Holder> {
  if (companyId === DEFAULT_COMPANY) {
    return { settings: await installationSettings(), owner: DEFAULT_COMPANY, shared: false };
  }
  const own = await safeSettings(companyId);
  if (own.sharing?.[kind] !== false) {
    return { settings: await installationSettings(), owner: DEFAULT_COMPANY, shared: true };
  }
  return { settings: own, owner: companyId, shared: false };
}

/** Whether a company is on the installation's keys or template for one thing. */
export async function isShared(companyId: string, kind: SharedKind): Promise<boolean> {
  if (companyId === DEFAULT_COMPANY) return false;
  return (await safeSettings(companyId)).sharing?.[kind] !== false;
}

/**
 * Which company's template a report is built from. The installation's own when
 * the company shares it, otherwise the company's.
 */
export async function templateCompany(companyId: string): Promise<string> {
  return (await isShared(companyId, "template")) ? DEFAULT_COMPANY : companyId;
}

/**
 * The company a save belongs to.
 *
 * Writes resolve this the same way reads do, so a save lands on the row the
 * person was just looking at. With nobody signed in there is nothing to write,
 * and the default company is the only honest answer.
 */
async function writeCompany(): Promise<string> {
  const scope = await currentScope();
  return scope ? settingsCompany(scope) : DEFAULT_COMPANY;
}

/**
 * `useEnv` is false for a company on its own keys: the environment holds the
 * installation's keys, and a company that was told to bring its own must not
 * quietly spend them.
 */
function secret(
  stored: string | undefined,
  envName: string,
  useEnv = true,
): { value?: string; source: Source; unreadable: boolean } {
  const fromEnv = useEnv ? process.env[envName]?.trim() : undefined;
  if (stored) {
    const plain = decryptSecret(stored);
    if (plain) return { value: plain, source: "dashboard", unreadable: false };
    // Saved, but the key changed or went missing. Fall back rather than break.
    return fromEnv
      ? { value: fromEnv, source: "env", unreadable: true }
      : { source: "none", unreadable: true };
  }
  return fromEnv ? { value: fromEnv, source: "env", unreadable: false } : { source: "none", unreadable: false };
}

function text(
  stored: string | undefined,
  envName: string,
  fallback?: string,
  useEnv = true,
): { value?: string; source: Source } {
  if (stored?.trim()) return { value: stored.trim(), source: "dashboard" };
  const fromEnv = useEnv ? process.env[envName]?.trim() : undefined;
  if (fromEnv) return { value: fromEnv, source: "env" };
  return fallback ? { value: fallback, source: "default" } : { source: "none" };
}

/** Whether the environment's keys may be used for this holder. */
const envAllowed = (h: Holder) => h.owner === DEFAULT_COMPANY;

export async function requirePayment(): Promise<{ value: boolean; source: Source }> {
  const stored = await scopedSettings();
  if (typeof stored.requirePayment === "boolean") {
    return { value: stored.requirePayment, source: "dashboard" };
  }
  if (process.env.RMI_REQUIRE_PAYMENT?.trim().toLowerCase() === "false") {
    return { value: false, source: "env" };
  }
  return { value: true, source: "default" };
}

/** Dashboard switch, then RMI_EMAIL_ENABLED=false, then on. */
export async function emailEnabled(): Promise<{ value: boolean; source: Source }> {
  const stored = await scopedSettings();
  if (typeof stored.emailEnabled === "boolean") {
    return { value: stored.emailEnabled, source: "dashboard" };
  }
  if (process.env.RMI_EMAIL_ENABLED?.trim().toLowerCase() === "false") {
    return { value: false, source: "env" };
  }
  return { value: true, source: "default" };
}

/** Whether one kind of email may go out: the master switch and that kind's switch. */
export async function emailAllowed(kind: EmailKind): Promise<boolean> {
  const stored = await scopedSettings();
  if (typeof stored.emailEnabled === "boolean") {
    if (!stored.emailEnabled) return false;
  } else if (process.env.RMI_EMAIL_ENABLED?.trim().toLowerCase() === "false") {
    return false;
  }
  return stored.emailKinds?.[kind] !== false;
}

/** Dashboard value, then RMI_CONTACT_INBOX, then the caller's fallback. */
export async function contactInbox(fallback: string): Promise<string> {
  const stored = await scopedSettings();
  return text(stored.contactInbox, "RMI_CONTACT_INBOX", fallback).value!;
}

export type PesapalConfig = {
  consumerKey?: string;
  consumerSecret?: string;
  env: "sandbox" | "live";
  ipnId?: string;
};

/**
 * The Pesapal credentials a company's payments go through. With no company
 * given, the one in the current request, which is what the dashboard wants; the
 * public routes pass the company the assessment came in through.
 */
export async function pesapalConfig(companyId?: string): Promise<PesapalConfig> {
  const h = await holder(companyId ?? (await activeCompany()), "pesapal");
  const useEnv = envAllowed(h);
  const s = h.settings.pesapal ?? {};
  const env = text(s.env, "PESAPAL_ENV", undefined, useEnv);
  return {
    consumerKey: secret(s.consumerKey, "PESAPAL_CONSUMER_KEY", useEnv).value,
    consumerSecret: secret(s.consumerSecret, "PESAPAL_CONSUMER_SECRET", useEnv).value,
    env: env.value === "live" ? "live" : "sandbox",
    ipnId: text(s.ipnId, "PESAPAL_IPN_ID", undefined, useEnv).value,
  };
}

export type OpenRouterConfig = {
  apiKey?: string;
  draftModel: string;
  humanizerModel: string;
};

export async function openRouterConfig(companyId?: string): Promise<OpenRouterConfig> {
  const h = await holder(companyId ?? (await activeCompany()), "openrouter");
  const useEnv = envAllowed(h);
  const s = h.settings.openrouter ?? {};
  return {
    apiKey: secret(s.apiKey, "OPENROUTER_API_KEY", useEnv).value,
    draftModel: text(s.draftModel, "OPENROUTER_MODEL", DEFAULT_DRAFT_MODEL, useEnv).value!,
    humanizerModel: text(
      s.humanizerModel,
      "OPENROUTER_HUMANIZER_MODEL",
      DEFAULT_HUMANIZER_MODEL,
      useEnv,
    ).value!,
  };
}

export async function pesapalConfigured(companyId?: string): Promise<boolean> {
  const c = await pesapalConfig(companyId);
  return Boolean(c.consumerKey && c.consumerSecret);
}

export async function reportConfigured(companyId?: string): Promise<boolean> {
  return Boolean((await openRouterConfig(companyId)).apiKey);
}

/**
 * Note that OpenRouter said the credit has run out, or that it works again.
 *
 * Recorded on the row that owns the key, so a company on the shared key and the
 * installation both see the same state, and a company on its own key sees its
 * own. Only writes when the state actually changes, so a healthy installation
 * does not touch the database on every report.
 */
export async function recordCredits(companyId: string, out: boolean): Promise<void> {
  try {
    const h = await holder(companyId, "openrouter");
    const flagged = Boolean(h.settings.openrouter?.creditsOutAt);
    if (flagged === out) return;
    await changeSettings((current): StoredSettings => {
      const openrouter = { ...current.openrouter };
      if (out) openrouter.creditsOutAt = new Date().toISOString();
      else delete openrouter.creditsOutAt;
      return { ...current, openrouter };
    }, h.owner);
  } catch (error) {
    // Bookkeeping must never be the reason a report fails.
    console.warn("[rmi:settings] could not record the credit state", error);
  }
}

/* -------------------------------------------------------------------------- */
/* what is set up, and by whom                                                */
/* -------------------------------------------------------------------------- */

export type ResourceState = {
  kind: SharedKind;
  /** True when the company is borrowing the installation's. */
  shared: boolean;
  /** Whether the thing can be used at all. */
  ready: boolean;
  /** OpenRouter has refused for lack of credit. Only meaningful for openrouter. */
  creditsOut: boolean;
};

/**
 * The state of the three shared resources for one company, which is what both
 * the dashboard banner and the settings page need to say what is missing.
 */
export async function resourceStates(companyId: string): Promise<ResourceState[]> {
  const [ai, tplOwner] = await Promise.all([
    holder(companyId, "openrouter"),
    templateCompany(companyId),
  ]);

  const [aiCfg, payCfg, payShared, template] = await Promise.all([
    openRouterConfig(companyId),
    pesapalConfig(companyId),
    isShared(companyId, "pesapal"),
    readTemplate(tplOwner).catch(() => ({ version: 0 }) as Awaited<ReturnType<typeof readTemplate>>),
  ]);

  return [
    {
      kind: "openrouter",
      shared: ai.shared,
      ready: Boolean(aiCfg.apiKey),
      creditsOut: Boolean(ai.settings.openrouter?.creditsOutAt) && Boolean(aiCfg.apiKey),
    },
    {
      kind: "pesapal",
      shared: payShared,
      ready: Boolean(payCfg.consumerKey && payCfg.consumerSecret),
      creditsOut: false,
    },
    {
      kind: "template",
      shared: tplOwner === DEFAULT_COMPANY && companyId !== DEFAULT_COMPANY,
      // Reports still build without a published template, from the built-in
      // one, but a company that was told to make its own has not done so yet.
      ready: Boolean(template.published),
      creditsOut: false,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* what the settings page shows                                               */
/* -------------------------------------------------------------------------- */

export type SecretView = { source: Source; last4: string | null; unreadable: boolean };
export type TextView = { value: string; source: Source };

export type SettingsView = {
  /** False when RMI_SETTINGS_KEY is missing: secrets cannot be saved here. */
  encryption: boolean;
  requirePayment: { value: boolean; source: Source };
  emailEnabled: { value: boolean; source: Source };
  /** Each kind's own switch, ignoring the master switch. */
  emailKinds: Record<EmailKind, boolean>;
  contactInbox: TextView;
  pesapal: {
    consumerKey: SecretView;
    consumerSecret: SecretView;
    env: TextView;
    ipnId: TextView;
  };
  openrouter: { apiKey: SecretView; draftModel: TextView; humanizerModel: TextView };
  /**
   * True where the company is on the installation's key, so there is nothing
   * for it to fill in and the values above are blanked rather than shown.
   */
  managed: { openrouter: boolean; pesapal: boolean };
  /** OpenRouter has refused for lack of credit. */
  creditsOut: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

function secretView(stored: string | undefined, envName: string, useEnv = true): SecretView {
  const s = secret(stored, envName, useEnv);
  return {
    source: s.source,
    last4: s.value ? s.value.slice(-4) : null,
    unreadable: s.unreadable,
  };
}

function textView(
  stored: string | undefined,
  envName: string,
  fallback = "",
  useEnv = true,
): TextView {
  const t = text(stored, envName, fallback || undefined, useEnv);
  return { value: t.value ?? "", source: t.source };
}

export async function settingsView(): Promise<SettingsView> {
  // The switches belong to the company. The keys belong to whoever holds them:
  // the company itself, or the installation when the company shares its keys.
  const company = await activeCompany();
  const [stored, ai, pay] = await Promise.all([
    scopedSettings(),
    holder(company, "openrouter"),
    holder(company, "pesapal"),
  ]);
  const aiEnv = envAllowed(ai);
  const payEnv = envAllowed(pay);
  const blankSecret: SecretView = { source: "none", last4: null, unreadable: false };
  const blankText: TextView = { value: "", source: "none" };
  const p = pay.settings.pesapal ?? {};
  const o = ai.settings.openrouter ?? {};
  return {
    encryption: encryptionAvailable(),
    requirePayment: await requirePayment(),
    emailEnabled: await emailEnabled(),
    emailKinds: Object.fromEntries(
      EMAIL_KIND_IDS.map((k) => [k, stored.emailKinds?.[k] !== false]),
    ) as Record<EmailKind, boolean>,
    contactInbox: textView(stored.contactInbox, "RMI_CONTACT_INBOX"),
    pesapal: pay.shared
      ? { consumerKey: blankSecret, consumerSecret: blankSecret, env: blankText, ipnId: blankText }
      : {
          consumerKey: secretView(p.consumerKey, "PESAPAL_CONSUMER_KEY", payEnv),
          consumerSecret: secretView(p.consumerSecret, "PESAPAL_CONSUMER_SECRET", payEnv),
          env: textView(p.env, "PESAPAL_ENV", "sandbox", payEnv),
          ipnId: textView(p.ipnId, "PESAPAL_IPN_ID", "", payEnv),
        },
    openrouter: ai.shared
      ? { apiKey: blankSecret, draftModel: blankText, humanizerModel: blankText }
      : {
          apiKey: secretView(o.apiKey, "OPENROUTER_API_KEY", aiEnv),
          draftModel: textView(o.draftModel, "OPENROUTER_MODEL", DEFAULT_DRAFT_MODEL, aiEnv),
          humanizerModel: textView(
            o.humanizerModel,
            "OPENROUTER_HUMANIZER_MODEL",
            DEFAULT_HUMANIZER_MODEL,
            aiEnv,
          ),
        },
    managed: { openrouter: ai.shared, pesapal: pay.shared },
    creditsOut: Boolean(o.creditsOutAt),
    updatedAt: stored.updatedAt ?? null,
    updatedBy: stored.updatedBy ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* saving                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * For each field: undefined leaves it alone, null (or an empty string) clears
 * the dashboard value so the environment applies again, a string sets it.
 */
export type SettingsUpdate = {
  requirePayment?: boolean;
  emailEnabled?: boolean;
  emailKinds?: Partial<Record<EmailKind, boolean>>;
  contactInbox?: string | null;
  pesapal?: {
    consumerKey?: string | null;
    consumerSecret?: string | null;
    env?: "sandbox" | "live" | null;
    ipnId?: string | null;
  };
  openrouter?: {
    apiKey?: string | null;
    draftModel?: string | null;
    humanizerModel?: string | null;
  };
};

const blank = (v: string | null) => v === null || v.trim() === "";

function applyText<T extends object>(target: T, key: keyof T, value: string | null | undefined) {
  if (value === undefined) return;
  if (blank(value)) delete target[key];
  else (target[key] as unknown) = value!.trim();
}

function applySecret<T extends object>(target: T, key: keyof T, value: string | null | undefined) {
  if (value === undefined) return;
  if (blank(value)) delete target[key];
  else (target[key] as unknown) = encryptSecret(value!.trim());
}

/** A company tried to save keys of its own while it is on the installation's. */
export class SharedKeysError extends Error {
  constructor() {
    super(
      "This company is using the shared keys, which the administrator manages. Ask them to switch sharing off before adding your own.",
    );
  }
}

/** Throws SecretsUnavailableError before changing anything if a secret cannot be encrypted. */
export async function saveSettings(update: SettingsUpdate, by: string): Promise<void> {
  const settingASecret = [
    update.pesapal?.consumerKey,
    update.pesapal?.consumerSecret,
    update.openrouter?.apiKey,
  ].some((v) => typeof v === "string" && v.trim() !== "");
  if (settingASecret && !encryptionAvailable()) {
    throw new SecretsUnavailableError();
  }

  const company = await writeCompany();
  const touchesCompany =
    typeof update.requirePayment === "boolean" ||
    typeof update.emailEnabled === "boolean" ||
    update.emailKinds !== undefined ||
    update.contactInbox !== undefined;
  const touchesKeys = update.pesapal !== undefined || update.openrouter !== undefined;

  // The keys go on the row of the company being worked in, which is the
  // installation's row for the default company. A company that is borrowing
  // the installation's keys has nothing of its own to save.
  if (touchesKeys) {
    if (update.pesapal !== undefined && (await isShared(company, "pesapal"))) {
      throw new SharedKeysError();
    }
    if (update.openrouter !== undefined && (await isShared(company, "openrouter"))) {
      throw new SharedKeysError();
    }
  }

  if (touchesCompany) {
    await changeSettings((current): StoredSettings => {
      const next: StoredSettings = { ...current };

      if (typeof update.requirePayment === "boolean") next.requirePayment = update.requirePayment;
      if (typeof update.emailEnabled === "boolean") next.emailEnabled = update.emailEnabled;
      if (update.emailKinds) {
        next.emailKinds = { ...current.emailKinds, ...update.emailKinds };
      }
      applyText(next, "contactInbox", update.contactInbox);

      next.updatedAt = new Date().toISOString();
      next.updatedBy = by;
      return next;
    }, company);
  }

  if (touchesKeys) {
    await changeSettings((current): StoredSettings => {
      const next: StoredSettings = {
        ...current,
        pesapal: { ...current.pesapal },
        openrouter: { ...current.openrouter },
      };

      const p = next.pesapal!;
      applySecret(p, "consumerKey", update.pesapal?.consumerKey);
      applySecret(p, "consumerSecret", update.pesapal?.consumerSecret);
      applyText(p, "env", update.pesapal?.env);
      applyText(p, "ipnId", update.pesapal?.ipnId);

      const o = next.openrouter!;
      applySecret(o, "apiKey", update.openrouter?.apiKey);
      // A new or removed key starts with a clean slate about its credit.
      if (update.openrouter?.apiKey !== undefined) delete o.creditsOutAt;
      applyText(o, "draftModel", update.openrouter?.draftModel);
      applyText(o, "humanizerModel", update.openrouter?.humanizerModel);

      next.updatedAt = new Date().toISOString();
      next.updatedBy = by;
      return next;
    }, company);
  }
}

/**
 * Switch a company between the installation's keys and template and its own.
 *
 * Written to the company's row, but only ever called for a super admin: whether
 * a firm borrows or brings its own is the installation owner's decision.
 */
export async function saveSharing(
  companyId: string,
  patch: Partial<Record<SharedKind, boolean>>,
  by: string,
): Promise<void> {
  await changeSettings((current): StoredSettings => {
    const sharing = { ...current.sharing };
    for (const [kind, value] of Object.entries(patch) as [SharedKind, boolean][]) {
      // On is the default, so turning it back on removes the entry.
      if (value) delete sharing[kind];
      else sharing[kind] = false;
    }
    const next: StoredSettings = { ...current, updatedAt: new Date().toISOString(), updatedBy: by };
    if (Object.keys(sharing).length) next.sharing = sharing;
    else delete next.sharing;
    return next;
  }, companyId);
}

/** What a company's sharing looks like, every kind spelled out. */
export async function sharingFor(companyId: string): Promise<Record<SharedKind, boolean>> {
  const stored = await safeSettings(companyId);
  return {
    openrouter: stored.sharing?.openrouter !== false,
    pesapal: stored.sharing?.pesapal !== false,
    template: stored.sharing?.template !== false,
  };
}

/* -------------------------------------------------------------------------- */
/* the logo and the stamp                                                     */
/* -------------------------------------------------------------------------- */

export type BrandKind = "logo" | "stamp";

export async function brandAssets(companyId?: string): Promise<{
  logo?: BrandAsset;
  stamp?: BrandAsset;
  palette?: PaletteSeeds;
}> {
  const stored = companyId ? await safeSettings(companyId) : await scopedSettings();
  return {
    logo: stored.brand?.logo,
    stamp: stored.brand?.stamp,
    palette: stored.brand?.palette,
  };
}

/**
 * The company's colours as CSS, or null when they are using the house theme.
 *
 * Read by the dashboard shell on every request, so a company that has accepted
 * its own palette sees it everywhere rather than on the page that set it.
 */
export async function themeCss(): Promise<string | null> {
  const seeds = (await scopedSettings()).brand?.palette;
  if (!seeds) return null;
  return paletteCss(paletteFrom(seeds));
}

/** Record an uploaded logo or stamp. Returns what the previous one was, to delete. */
export async function saveBrandAsset(
  kind: BrandKind,
  asset: BrandAsset,
  by: string,
): Promise<BrandAsset | undefined> {
  let previous: BrandAsset | undefined;
  await changeSettings((current): StoredSettings => {
    previous = current.brand?.[kind];
    return {
      ...current,
      brand: { ...current.brand, [kind]: asset },
      updatedAt: new Date().toISOString(),
      updatedBy: by,
    };
  }, await writeCompany());
  return previous;
}

/** Remove a logo or stamp. Returns what was there, to delete from file storage. */
export async function clearBrandAsset(
  kind: BrandKind,
  by: string,
): Promise<BrandAsset | undefined> {
  let previous: BrandAsset | undefined;
  await changeSettings((current): StoredSettings => {
    previous = current.brand?.[kind];
    const brand = { ...current.brand };
    delete brand[kind];
    return {
      ...current,
      brand,
      updatedAt: new Date().toISOString(),
      updatedBy: by,
    };
  }, await writeCompany());
  return previous;
}

/* -------------------------------------------------------------------------- */
/* where the organisation is, and what it bills in                            */
/* -------------------------------------------------------------------------- */

export type Place = { country: string; currency: string; currencySource: Source };

/**
 * The country and the currency.
 *
 * The currency follows the country unless somebody has chosen otherwise, which
 * is why the source comes back too: the form can then say "following Kenya"
 * rather than pretending a shilling was picked by hand.
 */
export async function place(): Promise<Place> {
  const stored = await scopedSettings();
  const country = isCountryCode(stored.organisation?.country)
    ? stored.organisation!.country!
    : DEFAULT_COUNTRY;

  const chosen = stored.organisation?.currency;
  if (isCurrencyCode(chosen)) {
    return { country, currency: chosen!, currencySource: "dashboard" };
  }
  return { country, currency: defaultCurrencyFor(country), currencySource: "default" };
}

/* -------------------------------------------------------------------------- */
/* what the public site says                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Settings for the public pages, which must never fail to render.
 *
 * These are read while generating the marketing pages, sometimes at build time
 * on a machine with no database behind it. A storage problem there should leave
 * the site reading from the values in the code, not stop it being built.
 */
async function safeSettings(companyId: string = DEFAULT_COMPANY): Promise<StoredSettings> {
  try {
    return await readSettings(companyId);
  } catch (error) {
    console.warn(
      "[rmi:settings] could not read the saved settings, using the built-in values",
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

export type ContactDetails = {
  email: string;
  location: string;
  phones: string[];
  /** Always a full link by the time it leaves here, or empty. */
  whatsapp: string;
};

/** A bare number is turned into a link; anything that looks like one is kept. */
export function whatsappLink(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

/**
 * The contact details the site shows. Anything unset falls back to the values
 * in lib/site.ts, so the pages read properly on a fresh install.
 */
export async function contactDetails(): Promise<ContactDetails> {
  const stored = (await safeSettings()).contact ?? {};
  const phones = stored.phones?.map((p) => p.trim()).filter(Boolean);
  return {
    email: stored.email?.trim() || site.email,
    location: stored.location?.trim() || site.location,
    phones: phones?.length ? phones : [...site.phones],
    whatsapp: whatsappLink(stored.whatsapp) || site.whatsapp,
  };
}

export type SocialLink = { label: string; href: string };

/**
 * The social pages in the footer. An empty array saved from the dashboard means
 * show none, which is different from never having saved, so the fallback only
 * applies when the key is absent.
 */
export async function socialLinks(): Promise<SocialLink[]> {
  const stored = (await safeSettings()).socials;
  if (!stored) return site.socials.map((s) => ({ label: s.label, href: s.href }));
  return stored
    .filter((s) => s.label?.trim() && s.href?.trim())
    .map((s) => ({ label: s.label.trim(), href: s.href.trim() }));
}

/* -------------------------------------------------------------------------- */
/* the pricing tiers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The tiers as the site should show them: what the code defines, with whatever
 * an admin has changed laid over the top, in the organisation's currency.
 *
 * `price` is what gets printed and `amount` is what gets charged, so they are
 * worked out from the same number rather than kept in step by hand.
 */
export async function tiers(): Promise<Tier[]> {
  const stored = await safeSettings();
  const overrides = stored.tiers ?? {};
  const { currency } = await place();

  return pricing
    .filter((tier) => !overrides[tier.id]?.hidden)
    .map((tier): Tier => {
      const over = overrides[tier.id] ?? {};
      const amount = over.amount === undefined ? tier.amount : over.amount;
      return {
        ...tier,
        name: over.name?.trim() || tier.name,
        amount,
        currency: amount === null ? "" : currency,
        // Printed without the currency code, which sits beside it on the page.
        price:
          amount === null
            ? tier.price
            : amount.toLocaleString("en-GB", { maximumFractionDigits: 0 }),
        summary: over.summary?.trim() || tier.summary,
        includes: over.includes?.length ? over.includes : tier.includes,
      };
    });
}

/* -------------------------------------------------------------------------- */
/* sample data                                                                */
/* -------------------------------------------------------------------------- */

/** Whether sample rows are being kept out of the views. */
export async function samplesHidden(): Promise<boolean> {
  return (await scopedSettings()).samples?.hidden === true;
}

/* -------------------------------------------------------------------------- */
/* saving the above                                                           */
/* -------------------------------------------------------------------------- */

export type ProfileUpdate = {
  country?: string | null;
  currency?: string | null;
  contact?: {
    email?: string | null;
    location?: string | null;
    phones?: string[] | null;
    whatsapp?: string | null;
  };
  socials?: { label: string; href: string }[] | null;
  tiers?: StoredSettings["tiers"];
  samplesHidden?: boolean;
  /** null goes back to the house colours. */
  palette?: PaletteSeeds | null;
};

/**
 * Save the organisation, the public details, the tiers or the sample switch.
 *
 * Separate from saveSettings because none of this is a secret and none of it
 * needs the encryption key, so it keeps working on a server that has none.
 */
export async function saveProfile(update: ProfileUpdate, by: string): Promise<void> {
  const company = await writeCompany();
  await changeSettings((current): StoredSettings => {
    const next: StoredSettings = { ...current };

    if (update.country !== undefined || update.currency !== undefined) {
      const organisation = { ...next.organisation };
      if (update.country !== undefined) {
        if (update.country && isCountryCode(update.country)) organisation.country = update.country;
        else delete organisation.country;
      }
      if (update.currency !== undefined) {
        // Clearing it hands the choice back to the country.
        if (update.currency && isCurrencyCode(update.currency)) {
          organisation.currency = update.currency;
        } else {
          delete organisation.currency;
        }
      }
      next.organisation = organisation;
    }

    if (update.contact) {
      const contact = { ...next.contact };
      for (const key of ["email", "location", "whatsapp"] as const) {
        const value = update.contact[key];
        if (value === undefined) continue;
        if (value === null || !value.trim()) delete contact[key];
        else contact[key] = value.trim();
      }
      if (update.contact.phones !== undefined) {
        const phones = update.contact.phones?.map((p) => p.trim()).filter(Boolean) ?? [];
        if (phones.length) contact.phones = phones;
        else delete contact.phones;
      }
      next.contact = contact;
    }

    if (update.socials !== undefined) {
      if (update.socials === null) delete next.socials;
      else {
        next.socials = update.socials
          .filter((s) => s.label?.trim() && s.href?.trim())
          .map((s) => ({ label: s.label.trim().slice(0, 40), href: s.href.trim() }));
      }
    }

    if (update.tiers) {
      next.tiers = { ...next.tiers, ...update.tiers };
    }

    if (update.samplesHidden !== undefined) {
      next.samples = { ...next.samples, hidden: update.samplesHidden };
    }

    if (update.palette !== undefined) {
      const brand = { ...next.brand };
      if (update.palette === null) delete brand.palette;
      else brand.palette = update.palette;
      next.brand = brand;
    }

    next.updatedAt = new Date().toISOString();
    next.updatedBy = by;
    return next;
  }, company);
}
