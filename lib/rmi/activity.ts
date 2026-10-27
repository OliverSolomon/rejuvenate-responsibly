import "server-only";

import { cache } from "react";
import { visibleAssessments } from "./dashboard";
import { creditsOut } from "./openrouter";
import { currentScope, settingsCompany, viewMode, type Scope } from "./scope";
import { openRouterConfig, resourceStates } from "./settings";
import { daysUntilExpiry, listCompanies, type Assessment, type SharedKind } from "./store";
import { recordVisit } from "./team";

/**
 * What has happened, and what needs doing.
 *
 * Two different things, kept apart on purpose. Activity is a log: something
 * came in, something went out, and it has a time. Attention is a state: a key
 * is missing, a report is waiting to be sent. Activity is derived from the
 * assessments themselves, so there is no second table to fall out of step with
 * the work; attention is worked out fresh on every request, so it disappears
 * the moment the cause does.
 */

export type ActivityTone = "good" | "warn" | "info";

export type ActivityEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  href?: string;
  tone: ActivityTone;
  /** The company the work belongs to, so an all-companies view can say whose it is. */
  companyId?: string;
};

export type AttentionItem = {
  id: string;
  /** Setup gaps are shown as a banner on every page; the rest only in the lists. */
  group: "setup" | "work";
  tone: "warn" | "info";
  title: string;
  detail: string;
  href?: string;
  /** What the link says. */
  action?: string;
};

export type Feed = {
  /** Newest first. */
  events: ActivityEvent[];
  /** Happened after this sign-in began. */
  sinceSignIn: ActivityEvent[];
  /** Happened between the last visit and this sign-in: what was missed. */
  catchUp: ActivityEvent[];
  attention: AttentionItem[];
  signedInAt: string | null;
  catchupFrom: string | null;
  /** When the feed was read, so times can be shown relative to it. */
  readAt: number;
};

const WINDOW_DAYS = 30;
const MAX_EVENTS = 60;

const KIND_NAME: Record<SharedKind, string> = {
  openrouter: "AI report writing",
  pesapal: "Card payments",
  template: "The report template",
};

const org = (a: Assessment) => a.profile.organisation || "An organisation";

function eventsFor(a: Assessment, since: number): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  const href = `/dashboard/responses/${a.id}`;
  const add = (
    kind: string,
    at: string | null | undefined,
    e: Omit<ActivityEvent, "id" | "at" | "href">,
    suffix = "",
  ) => {
    if (!at || Date.parse(at) < since) return;
    out.push({ id: `${kind}:${a.id}${suffix}`, at, href, ...e });
  };

  add("started", a.createdAt, { title: `${org(a)} started an assessment`, tone: "info" });
  add("submitted", a.submittedAt, { title: `${org(a)} submitted its assessment`, tone: "good" });

  if (a.payment.status === "paid") {
    add("paid", a.payment.updatedAt, {
      title: `Payment received from ${org(a)}`,
      detail: a.payment.amount
        ? `${a.payment.currency} ${a.payment.amount.toLocaleString("en-GB")}`
        : undefined,
      tone: "good",
    });
  } else if (a.payment.status === "failed") {
    add("payfail", a.payment.updatedAt, {
      title: `A payment from ${org(a)} failed`,
      tone: "warn",
    });
  }

  for (const share of a.shares) {
    add(
      "responded",
      share.respondedAt,
      { title: `${share.name || share.email} answered for ${org(a)}`, tone: "info" },
      `:${share.id}`,
    );
    if (share.delivery && share.delivery.status !== "sent" && !share.respondedAt) {
      add(
        "undelivered",
        share.delivery.at,
        {
          title: `The invitation to ${share.email} did not arrive`,
          detail: `For ${org(a)}`,
          tone: "warn",
        },
        `:${share.id}`,
      );
    }
  }

  if (a.report) {
    add("report", a.report.generatedAt, {
      title: `A report was written for ${org(a)}`,
      detail: "Ready to review",
      tone: "info",
    });
    add("sent", a.report.sentAt, { title: `The report was sent to ${org(a)}`, tone: "good" });
  }
  return out;
}

/** The companies whose set-up the viewer ought to hear about. */
async function companiesToCheck(scope: Scope): Promise<{ id: string; name: string }[]> {
  const all = await listCompanies().catch(() => []);
  const names = new Map(all.map((c) => [c.id, c.name]));
  if (scope.isSuper && scope.companyId === null) {
    // Every company: a super admin wants to know who has not got going.
    return all.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }));
  }
  const id = settingsCompany(scope);
  return [{ id, name: names.get(id) ?? "Your company" }];
}

async function setupItems(scope: Scope): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];
  const companies = await companiesToCheck(scope);
  const watchingAll = scope.isSuper && scope.companyId === null;

  for (const company of companies) {
    const mine = company.id === settingsCompany(scope);
    const states = await resourceStates(company.id);
    const lead = watchingAll || (scope.isSuper && !mine) ? `${company.name}: ` : "";

    for (const state of states) {
      if (state.ready) continue;

      const name = KIND_NAME[state.kind];
      const canFix = scope.isSuper || mine;

      if (state.shared) {
        // On the installation's keys, which are themselves missing. In the global
        // view the default company's own row already says so.
        if (state.kind === "template" || watchingAll) continue;
        items.push({
          id: `setup:${company.id}:${state.kind}`,
          group: "setup",
          tone: "warn",
          title: `${lead}${name} is not available`,
          detail:
            "This company uses the platform's shared account, and the administrator has not set it up yet. Contact the administrator.",
        });
        continue;
      }

      if (state.kind === "template") {
        // Reports still go out on the built-in letterhead, so this is a nudge
        // rather than a breakage.
        items.push({
          id: `setup:${company.id}:template`,
          group: "setup",
          tone: "info",
          title: `${lead}No report template has been published`,
          detail:
            "Reports are using the built-in letterhead. Design and publish your own, or contact the administrator about using the shared one.",
          href: canFix ? "/dashboard/settings/report-template" : undefined,
          action: "Open the editor",
        });
        continue;
      }

      items.push({
        id: `setup:${company.id}:${state.kind}`,
        group: "setup",
        tone: "warn",
        title: `${lead}${name} is not set up`,
        detail:
          state.kind === "openrouter"
            ? "Reports cannot be written until an OpenRouter key is added. Configure it in Settings, or contact the administrator."
            : "Clients cannot pay by card until Pesapal is connected. Configure it in Settings, or contact the administrator.",
        href: canFix ? "/dashboard/settings" : undefined,
        action: "Configure it",
      });
    }

    // Credit. The recorded flag is the sure sign; the live check catches it
    // before a client's report is what finds out. Asked only for the company
    // being worked in, so a super admin's global view does not query
    // OpenRouter once per firm.
    const ai = states.find((s) => s.kind === "openrouter")!;
    let out = ai.creditsOut;
    if (!out && ai.ready && mine) {
      const key = (await openRouterConfig(company.id)).apiKey;
      if (key) out = (await creditsOut(key)) === true;
    }

    // On the shared key the problem belongs to the installation, so in the
    // global view it is raised once on the default company rather than per firm.
    if (out && !(ai.shared && watchingAll)) {
      items.push({
        id: `credits:${company.id}`,
        group: "setup",
        tone: "warn",
        title: `${lead}OpenRouter credit has run out`,
        detail: !ai.shared
          ? "Reports cannot be written until credit is added to the OpenRouter account, or a new key is saved."
          : scope.isSuper
            ? "The shared OpenRouter account is out of credit, so every company on it is blocked from writing reports."
            : "Reports are paused because the shared OpenRouter credit has run out. Contact the administrator.",
        href: !ai.shared || scope.isSuper ? "/dashboard/settings" : undefined,
        action: "Open settings",
      });
    }
  }
  return items;
}

function workItems(assessments: Assessment[], now: number): AttentionItem[] {
  const items: AttentionItem[] = [];

  const toSend = assessments.filter((a) => a.report && !a.report.sentAt);
  if (toSend.length) {
    items.push({
      id: "work:to-send",
      group: "work",
      tone: "info",
      title: `${toSend.length} ${toSend.length === 1 ? "report is" : "reports are"} waiting to be reviewed and sent`,
      detail: toSend.slice(0, 3).map(org).join(", ") + (toSend.length > 3 ? " and more" : ""),
      href: "/dashboard/responses",
      action: "Open responses",
    });
  }

  const unwritten = assessments.filter((a) => a.status === "submitted" && !a.report);
  if (unwritten.length) {
    items.push({
      id: "work:unwritten",
      group: "work",
      tone: "info",
      title: `${unwritten.length} submitted ${unwritten.length === 1 ? "assessment has" : "assessments have"} no report yet`,
      detail: "Usually waiting on stakeholders. You can write the report from what has come in.",
      href: "/dashboard/responses",
      action: "Open responses",
    });
  }

  const undelivered = assessments.reduce(
    (n, a) =>
      n + a.shares.filter((s) => s.delivery && s.delivery.status !== "sent" && !s.respondedAt).length,
    0,
  );
  if (undelivered) {
    items.push({
      id: "work:undelivered",
      group: "work",
      tone: "warn",
      title: `${undelivered} survey ${undelivered === 1 ? "invitation" : "invitations"} did not arrive`,
      detail: "Let the submitter know, so they can send it another way.",
      href: "/dashboard",
      action: "See which",
    });
  }

  const expiring = assessments.filter((a) => {
    const days = daysUntilExpiry(a.report, new Date(now));
    return days !== null && days >= 0 && days <= 30;
  });
  if (expiring.length) {
    items.push({
      id: "work:expiring",
      group: "work",
      tone: "info",
      title: `${expiring.length} ${expiring.length === 1 ? "report expires" : "reports expire"} within 30 days`,
      detail: expiring.slice(0, 3).map(org).join(", "),
      href: "/dashboard/responses",
      action: "Open responses",
    });
  }
  return items;
}

/**
 * The feed for this request. Cached for the request so the layout's bell and
 * banner and the dashboard's card share one read of the data.
 */
export const getFeed = cache(async (): Promise<Feed | null> => {
  const scope = await currentScope();
  if (!scope) return null;

  const [assessments, visit] = await Promise.all([
    visibleAssessments().catch(() => [] as Assessment[]),
    recordVisit(scope.user.id, scope.user.signedInAt),
  ]);

  const now = Date.now();
  const since = now - WINDOW_DAYS * 86_400_000;
  const events = assessments
    .flatMap((a) =>
      eventsFor(a, since).map((e) => ({ ...e, companyId: a.companyId || "default" })),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_EVENTS);

  const signedIn = scope.user.signedInAt ? Date.parse(scope.user.signedInAt) : null;
  const from = visit.catchupSince ? Date.parse(visit.catchupSince) : null;

  const sinceSignIn = signedIn === null ? [] : events.filter((e) => Date.parse(e.at) > signedIn);
  const catchUp =
    from === null
      ? []
      : events.filter((e) => {
          const t = Date.parse(e.at);
          return t > from && (signedIn === null || t <= signedIn);
        });

  // Demo has no setup banners: a missing key is a fact about the live platform,
  // not something to show somebody who is being walked through it.
  const demo = (await viewMode()) === "demo";
  const attention = [
    ...(demo ? [] : await setupItems(scope).catch(() => [])),
    ...workItems(assessments, now),
  ];

  return {
    events,
    sinceSignIn,
    catchUp,
    attention,
    signedInAt: scope.user.signedInAt,
    catchupFrom: visit.catchupSince,
    readAt: now,
  };
});
