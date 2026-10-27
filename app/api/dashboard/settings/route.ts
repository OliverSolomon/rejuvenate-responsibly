import { NextResponse } from "next/server";
import {
  SharedKeysError,
  saveSettings,
  settingsView,
  type SettingsUpdate,
} from "@/lib/rmi/settings";
import { canConfigureInstallation, currentScope, DEFAULT_COMPANY, settingsCompany } from "@/lib/rmi/scope";
import { isEmailKind, type EmailKind } from "@/lib/rmi/email-kinds";
import { SecretsUnavailableError } from "@/lib/rmi/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = /^[\w.~:/-]{1,100}$/;
const IPN = /^[\w-]{1,64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SECRET_MAX = 512;

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

/** undefined: leave alone. null: clear. string: set (checked by the caller). */
function field(source: Raw | undefined, key: string): string | null | undefined | "invalid" {
  if (!source || !(key in source)) return undefined;
  const v = source[key];
  if (v === null) return null;
  return typeof v === "string" ? v : "invalid";
}

function parse(body: unknown): { update: SettingsUpdate } | { error: string } {
  if (!isObject(body)) return { error: "The request body was not an object." };

  const update: SettingsUpdate = {};

  if ("requirePayment" in body) {
    if (typeof body.requirePayment !== "boolean") {
      return { error: "requirePayment must be true or false." };
    }
    update.requirePayment = body.requirePayment;
  }

  if ("emailEnabled" in body) {
    if (typeof body.emailEnabled !== "boolean") {
      return { error: "emailEnabled must be true or false." };
    }
    update.emailEnabled = body.emailEnabled;
  }

  if ("emailKinds" in body) {
    if (!isObject(body.emailKinds)) return { error: "emailKinds must be an object." };
    const kinds: Partial<Record<EmailKind, boolean>> = {};
    for (const [key, value] of Object.entries(body.emailKinds)) {
      if (!isEmailKind(key) || typeof value !== "boolean") {
        return { error: `${key} is not a switch that can be set.` };
      }
      kinds[key] = value;
    }
    update.emailKinds = kinds;
  }

  const contactInbox = field(body, "contactInbox");
  if (
    contactInbox === "invalid" ||
    (typeof contactInbox === "string" && contactInbox.trim() && !EMAIL.test(contactInbox.trim()))
  ) {
    return { error: "That does not look like an email address." };
  }
  if (contactInbox !== undefined) update.contactInbox = contactInbox;

  const pesapal = isObject(body.pesapal) ? body.pesapal : undefined;
  const openrouter = isObject(body.openrouter) ? body.openrouter : undefined;

  const secret = (v: ReturnType<typeof field>, label: string): string | null | undefined | Error => {
    if (v === "invalid") return new Error(`${label} must be text.`);
    if (typeof v === "string" && v.length > SECRET_MAX) return new Error(`${label} is too long.`);
    return v;
  };

  const consumerKey = secret(field(pesapal, "consumerKey"), "The Pesapal consumer key");
  const consumerSecret = secret(field(pesapal, "consumerSecret"), "The Pesapal consumer secret");
  const apiKey = secret(field(openrouter, "apiKey"), "The OpenRouter key");
  for (const v of [consumerKey, consumerSecret, apiKey]) {
    if (v instanceof Error) return { error: v.message };
  }

  const env = field(pesapal, "env");
  if (env === "invalid" || (typeof env === "string" && env !== "sandbox" && env !== "live")) {
    return { error: "The Pesapal environment must be sandbox or live." };
  }

  const ipnId = field(pesapal, "ipnId");
  if (ipnId === "invalid" || (typeof ipnId === "string" && ipnId.trim() && !IPN.test(ipnId.trim()))) {
    return { error: "That does not look like a Pesapal IPN id." };
  }

  const draftModel = field(openrouter, "draftModel");
  const humanizerModel = field(openrouter, "humanizerModel");
  for (const m of [draftModel, humanizerModel]) {
    if (m === "invalid" || (typeof m === "string" && m.trim() && !MODEL.test(m.trim()))) {
      return { error: "Model names look like provider/model-name." };
    }
  }

  if (pesapal) {
    update.pesapal = {
      consumerKey: consumerKey as string | null | undefined,
      consumerSecret: consumerSecret as string | null | undefined,
      env: env as "sandbox" | "live" | null | undefined,
      ipnId: ipnId as string | null | undefined,
    };
  }
  if (openrouter) {
    update.openrouter = {
      apiKey: apiKey as string | null | undefined,
      draftModel: draftModel as string | null | undefined,
      humanizerModel: humanizerModel as string | null | undefined,
    };
  }
  return { update };
}

/**
 * Save settings. The proxy keeps strangers off /dashboard, but an API route is
 * reachable on its own, so this checks the admin list again.
 */
export async function PUT(request: Request) {
  const scope = await currentScope();
  if (!scope) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }
  const user = scope.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const parsed = parse(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Changing, rotating or clearing a payment or AI key, or the Pesapal
  // environment, affects live money and spend. The form makes the admin tick an
  // acknowledgement; this makes sure a direct API call cannot skip it.
  const { pesapal, openrouter } = parsed.update;
  const sensitive =
    pesapal?.consumerKey !== undefined ||
    pesapal?.consumerSecret !== undefined ||
    pesapal?.env !== undefined ||
    openrouter?.apiKey !== undefined;
  if (sensitive && !(isObject(body) && body.acknowledged === true)) {
    return NextResponse.json(
      { error: "Confirm that you understand this change before saving a key or the payment environment." },
      { status: 400 },
    );
  }

  // The default company's keys are the ones every other company may borrow, so
  // only a super admin changes them. Any other company's keys are its own to
  // set, and saveSettings refuses if it is still on the shared ones.
  if (
    (pesapal || openrouter) &&
    settingsCompany(scope) === DEFAULT_COMPANY &&
    !canConfigureInstallation(scope)
  ) {
    return NextResponse.json(
      { error: "Only the super admin can change the keys the installation shares." },
      { status: 403 },
    );
  }

  try {
    await saveSettings(parsed.update, user.email);
  } catch (err) {
    if (err instanceof SharedKeysError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof SecretsUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[rmi:settings] could not save", err);
    return NextResponse.json({ error: "The settings could not be saved." }, { status: 500 });
  }

  // Never echo a secret back: the view carries only where each value comes from.
  return NextResponse.json({ settings: await settingsView() });
}
