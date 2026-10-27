import "server-only";

import { EMAIL_KIND_IDS, type EmailKind } from "./email-kinds";
import { changeSettings, readSettings, type BrandAsset, type StoredSettings } from "./store";
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

function secret(stored: string | undefined, envName: string): { value?: string; source: Source; unreadable: boolean } {
  if (stored) {
    const plain = decryptSecret(stored);
    if (plain) return { value: plain, source: "dashboard", unreadable: false };
    // Saved, but the key changed or went missing. Fall back rather than break.
    const fromEnv = process.env[envName]?.trim();
    return fromEnv
      ? { value: fromEnv, source: "env", unreadable: true }
      : { source: "none", unreadable: true };
  }
  const fromEnv = process.env[envName]?.trim();
  return fromEnv ? { value: fromEnv, source: "env", unreadable: false } : { source: "none", unreadable: false };
}

function text(stored: string | undefined, envName: string, fallback?: string): { value?: string; source: Source } {
  if (stored?.trim()) return { value: stored.trim(), source: "dashboard" };
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return { value: fromEnv, source: "env" };
  return fallback ? { value: fallback, source: "default" } : { source: "none" };
}

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

export async function pesapalConfig(): Promise<PesapalConfig> {
  const s = (await installationSettings()).pesapal ?? {};
  const env = text(s.env, "PESAPAL_ENV");
  return {
    consumerKey: secret(s.consumerKey, "PESAPAL_CONSUMER_KEY").value,
    consumerSecret: secret(s.consumerSecret, "PESAPAL_CONSUMER_SECRET").value,
    env: env.value === "live" ? "live" : "sandbox",
    ipnId: text(s.ipnId, "PESAPAL_IPN_ID").value,
  };
}

export type OpenRouterConfig = {
  apiKey?: string;
  draftModel: string;
  humanizerModel: string;
};

export async function openRouterConfig(): Promise<OpenRouterConfig> {
  const s = (await installationSettings()).openrouter ?? {};
  return {
    apiKey: secret(s.apiKey, "OPENROUTER_API_KEY").value,
    draftModel: text(s.draftModel, "OPENROUTER_MODEL", DEFAULT_DRAFT_MODEL).value!,
    humanizerModel: text(s.humanizerModel, "OPENROUTER_HUMANIZER_MODEL", DEFAULT_HUMANIZER_MODEL)
      .value!,
  };
}

export async function pesapalConfigured(): Promise<boolean> {
  const c = await pesapalConfig();
  return Boolean(c.consumerKey && c.consumerSecret);
}

export async function reportConfigured(): Promise<boolean> {
  return Boolean((await openRouterConfig()).apiKey);
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
  updatedAt: string | null;
  updatedBy: string | null;
};

function secretView(stored: string | undefined, envName: string): SecretView {
  const s = secret(stored, envName);
  return {
    source: s.source,
    last4: s.value ? s.value.slice(-4) : null,
    unreadable: s.unreadable,
  };
}

function textView(stored: string | undefined, envName: string, fallback = ""): TextView {
  const t = text(stored, envName, fallback || undefined);
  return { value: t.value ?? "", source: t.source };
}

export async function settingsView(): Promise<SettingsView> {
  // The switches belong to the company; the keys belong to the installation.
  const [stored, shared] = await Promise.all([scopedSettings(), installationSettings()]);
  const p = shared.pesapal ?? {};
  const o = shared.openrouter ?? {};
  return {
    encryption: encryptionAvailable(),
    requirePayment: await requirePayment(),
    emailEnabled: await emailEnabled(),
    emailKinds: Object.fromEntries(
      EMAIL_KIND_IDS.map((k) => [k, stored.emailKinds?.[k] !== false]),
    ) as Record<EmailKind, boolean>,
    contactInbox: textView(stored.contactInbox, "RMI_CONTACT_INBOX"),
    pesapal: {
      consumerKey: secretView(p.consumerKey, "PESAPAL_CONSUMER_KEY"),
      consumerSecret: secretView(p.consumerSecret, "PESAPAL_CONSUMER_SECRET"),
      env: textView(p.env, "PESAPAL_ENV", "sandbox"),
      ipnId: textView(p.ipnId, "PESAPAL_IPN_ID"),
    },
    openrouter: {
      apiKey: secretView(o.apiKey, "OPENROUTER_API_KEY"),
      draftModel: textView(o.draftModel, "OPENROUTER_MODEL", DEFAULT_DRAFT_MODEL),
      humanizerModel: textView(o.humanizerModel, "OPENROUTER_HUMANIZER_MODEL", DEFAULT_HUMANIZER_MODEL),
    },
    updatedAt: stored.updatedAt ?? shared.updatedAt ?? null,
    updatedBy: stored.updatedBy ?? shared.updatedBy ?? null,
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
  const touchesInstallation = update.pesapal !== undefined || update.openrouter !== undefined;

  // Two rows, because the two halves answer to different people: the switches
  // are the company's to set, the keys are one set the installation shares.
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

  if (touchesInstallation) {
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
      applyText(o, "draftModel", update.openrouter?.draftModel);
      applyText(o, "humanizerModel", update.openrouter?.humanizerModel);

      next.updatedAt = new Date().toISOString();
      next.updatedBy = by;
      return next;
    }, DEFAULT_COMPANY);
  }
}

/* -------------------------------------------------------------------------- */
/* the logo and the stamp                                                     */
/* -------------------------------------------------------------------------- */

export type BrandKind = "logo" | "stamp";

export async function brandAssets(): Promise<{
  logo?: BrandAsset;
  stamp?: BrandAsset;
  palette?: PaletteSeeds;
}> {
  const stored = await scopedSettings();
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
