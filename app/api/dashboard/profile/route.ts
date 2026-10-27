import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { saveProfile, type ProfileUpdate } from "@/lib/rmi/settings";
import { parseHex } from "@/lib/rmi/palette";
import { isCountryCode, isCurrencyCode } from "@/lib/rmi/regions";
import { pricing } from "@/lib/rmi/pricing";
import { getDashboardUser } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The settings that are nobody's secret: where the organisation is, what it
 * bills in, what the public site says, what the tiers cost and whether sample
 * data is showing.
 *
 * Kept apart from /api/dashboard/settings because none of this needs the
 * encryption key, so it keeps working on a server that has none.
 */

const TIER_IDS = new Set(pricing.map((t) => t.id));
const MAX_TEXT = 300;
const MAX_LIST = 12;

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A trimmed string, or null to clear it. Anything else is a refusal. */
function text(value: unknown, label: string): string | null | "bad" {
  if (value === null) return null;
  if (typeof value !== "string") return "bad";
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT) {
    console.warn(`[rmi:profile] ${label} was too long and was refused`);
    return "bad";
  }
  return trimmed === "" ? null : trimmed;
}

function strings(value: unknown): string[] | null | "bad" {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length > MAX_LIST) return "bad";
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return "bad";
    const trimmed = item.trim();
    if (trimmed.length > MAX_TEXT) return "bad";
    if (trimmed) out.push(trimmed);
  }
  return out;
}

function parse(body: unknown): { update: ProfileUpdate } | { error: string } {
  if (!isObject(body)) return { error: "The request body was not an object." };
  const update: ProfileUpdate = {};

  if ("country" in body) {
    if (body.country === null || body.country === "") update.country = null;
    else if (isCountryCode(body.country)) update.country = body.country as string;
    else return { error: "That country is not one of the EAC or SADC countries." };
  }

  if ("currency" in body) {
    // Clearing it hands the choice back to the country.
    if (body.currency === null || body.currency === "") update.currency = null;
    else if (isCurrencyCode(body.currency)) update.currency = body.currency as string;
    else return { error: "That is not a currency this supports." };
  }

  if ("contact" in body) {
    if (!isObject(body.contact)) return { error: "contact has to be an object." };
    const contact: NonNullable<ProfileUpdate["contact"]> = {};
    for (const key of ["email", "location", "whatsapp"] as const) {
      if (!(key in body.contact)) continue;
      const value = text(body.contact[key], key);
      if (value === "bad") return { error: `That ${key} is not something we can save.` };
      contact[key] = value;
    }
    if ("phones" in body.contact) {
      const phones = strings(body.contact.phones);
      if (phones === "bad") return { error: "Those phone numbers are not something we can save." };
      contact.phones = phones;
    }
    update.contact = contact;
  }

  if ("socials" in body) {
    if (body.socials === null) update.socials = null;
    else if (!Array.isArray(body.socials) || body.socials.length > MAX_LIST) {
      return { error: "That list of social pages is not something we can save." };
    } else {
      const socials: { label: string; href: string }[] = [];
      for (const item of body.socials) {
        if (!isObject(item)) return { error: "Each social page needs a label and a link." };
        const label = text(item.label, "label");
        const href = text(item.href, "href");
        if (label === "bad" || href === "bad") {
          return { error: "Each social page needs a label and a link." };
        }
        if (!label || !href) continue;
        if (!/^https?:\/\//i.test(href)) {
          return { error: `The link for ${label} has to start with http or https.` };
        }
        socials.push({ label, href });
      }
      update.socials = socials;
    }
  }

  if ("tiers" in body) {
    if (!isObject(body.tiers)) return { error: "tiers has to be an object." };
    const tiers: NonNullable<ProfileUpdate["tiers"]> = {};
    for (const [id, raw] of Object.entries(body.tiers)) {
      if (!TIER_IDS.has(id)) return { error: `There is no ${id} tier.` };
      if (!isObject(raw)) return { error: `The ${id} tier has to be an object.` };

      const tier: NonNullable<ProfileUpdate["tiers"]>[string] = {};

      if ("name" in raw) {
        const name = text(raw.name, "name");
        if (name === "bad") return { error: `That name for ${id} is not something we can save.` };
        if (name) tier.name = name;
      }
      if ("amount" in raw) {
        if (raw.amount === null) tier.amount = null;
        else if (
          typeof raw.amount === "number" &&
          Number.isFinite(raw.amount) &&
          raw.amount >= 0 &&
          raw.amount <= 1_000_000_000
        ) {
          tier.amount = Math.round(raw.amount);
        } else {
          return { error: `The price for ${id} has to be a number, or empty to quote it.` };
        }
      }
      if ("summary" in raw) {
        const summary = text(raw.summary, "summary");
        if (summary === "bad") return { error: `That summary for ${id} is too long.` };
        if (summary) tier.summary = summary;
      }
      if ("includes" in raw) {
        const includes = strings(raw.includes);
        if (includes === "bad") return { error: `That list for ${id} is not something we can save.` };
        if (includes) tier.includes = includes;
      }
      if ("hidden" in raw) {
        if (typeof raw.hidden !== "boolean") return { error: `hidden for ${id} has to be true or false.` };
        tier.hidden = raw.hidden;
      }

      tiers[id] = tier;
    }
    update.tiers = tiers;
  }

  if ("palette" in body) {
    if (body.palette === null) update.palette = null;
    else if (!isObject(body.palette)) {
      return { error: "palette has to be an object, or null for the house colours." };
    } else {
      const seeds: Record<string, string> = {};
      for (const key of ["ink", "accent", "paper"] as const) {
        const value = body.palette[key];
        if (typeof value !== "string" || !parseHex(value)) {
          return { error: `The ${key} colour is not a hex colour.` };
        }
        seeds[key] = value.trim().toLowerCase();
      }
      update.palette = seeds as NonNullable<ProfileUpdate["palette"]>;
    }
  }

  if ("samplesHidden" in body) {
    if (typeof body.samplesHidden !== "boolean") {
      return { error: "samplesHidden has to be true or false." };
    }
    update.samplesHidden = body.samplesHidden;
  }

  if (Object.keys(update).length === 0) return { error: "There was nothing to change." };
  return { update };
}

export async function PUT(request: Request) {
  const user = await getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  const parsed = parse(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await saveProfile(parsed.update, user.email);

    // The public pages are regenerated every few minutes, which would mean
    // waiting to see your own change. Clearing the whole tree is right here:
    // the footer is in the root layout, so a contact detail touches every page.
    revalidatePath("/", "layout");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That did not save." },
      { status: 500 },
    );
  }
}
