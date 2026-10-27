import "server-only";

import { EMAIL_KIND_IDS, type EmailKind } from "./email-kinds";
import { changeSettings, readSettings, type BrandAsset, type StoredSettings } from "./store";
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
  const stored = await readSettings();
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
  const stored = await readSettings();
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
  const stored = await readSettings();
  if (typeof stored.emailEnabled === "boolean") {
    if (!stored.emailEnabled) return false;
  } else if (process.env.RMI_EMAIL_ENABLED?.trim().toLowerCase() === "false") {
    return false;
  }
  return stored.emailKinds?.[kind] !== false;
}

/** Dashboard value, then RMI_CONTACT_INBOX, then the caller's fallback. */
export async function contactInbox(fallback: string): Promise<string> {
  const stored = await readSettings();
  return text(stored.contactInbox, "RMI_CONTACT_INBOX", fallback).value!;
}

export type PesapalConfig = {
  consumerKey?: string;
  consumerSecret?: string;
  env: "sandbox" | "live";
  ipnId?: string;
};

export async function pesapalConfig(): Promise<PesapalConfig> {
  const s = (await readSettings()).pesapal ?? {};
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
  const s = (await readSettings()).openrouter ?? {};
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
  const stored = await readSettings();
  const p = stored.pesapal ?? {};
  const o = stored.openrouter ?? {};
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

  await changeSettings((current): StoredSettings => {
    const next: StoredSettings = {
      ...current,
      pesapal: { ...current.pesapal },
      openrouter: { ...current.openrouter },
    };

    if (typeof update.requirePayment === "boolean") next.requirePayment = update.requirePayment;

    if (typeof update.emailEnabled === "boolean") next.emailEnabled = update.emailEnabled;
    if (update.emailKinds) {
      next.emailKinds = { ...current.emailKinds, ...update.emailKinds };
    }
    applyText(next, "contactInbox", update.contactInbox);

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
  });
}

/* -------------------------------------------------------------------------- */
/* the logo and the stamp                                                     */
/* -------------------------------------------------------------------------- */

export type BrandKind = "logo" | "stamp";

export async function brandAssets(): Promise<{ logo?: BrandAsset; stamp?: BrandAsset }> {
  const stored = await readSettings();
  return { logo: stored.brand?.logo, stamp: stored.brand?.stamp };
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
  });
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
  });
  return previous;
}
