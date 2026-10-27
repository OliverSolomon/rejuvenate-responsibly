import "server-only";

import { SECTION_ORDER, type SectionId } from "./questions";
import { scoreAssessment } from "./scoring";
import { samplesHidden } from "./settings";
import {
  isUndelivered,
  listAllStakeholderResponses,
  listAssessments,
  listStakeholderResponses,
  reportExpired,
  type Assessment,
  type StakeholderResponse,
} from "./store";

/**
 * Read models for the dashboard.
 *
 * These read the same store the public site writes to, so the dashboard shows
 * live work rather than a copy. When the store moves to Supabase, only the
 * calls in here change: the shapes below are what the views are built against.
 */

export type ReportState = "none" | "draft" | "issued" | "sent" | "expired";

export type OrganisationRow = {
  id: string;
  organisation: string;
  contactName: string;
  email: string;
  sector: string;
  status: Assessment["status"];
  paymentStatus: Assessment["payment"]["status"];
  overall: number | null;
  tier: string | null;
  invited: number;
  responded: number;
  /** Invitations that never arrived and are still unanswered. */
  undelivered: number;
  /** A mock submission loaded from Settings, not a real client. */
  sample: boolean;
  reportState: ReportState;
  createdAt: string;
  submittedAt: string | null;
};

function reportState(a: Assessment): ReportState {
  if (!a.report) return "none";
  // A year after it was sent it stops being current, which matters more to
  // anyone scanning this list than the fact that it went out.
  if (reportExpired(a.report)) return "expired";
  if (a.report.sentAt) return "sent";
  // A report counts as issued once an admin has been through it and saved. Until
  // then it is what the model wrote, which is a draft however good it reads.
  return a.report.editedAt ? "issued" : "draft";
}

/**
 * Every assessment the dashboard should show.
 *
 * One place, so hiding the samples takes them out of the list, the detail
 * views, the analytics and the delivery alerts together rather than from
 * whichever of them somebody remembered. Hiding never deletes: the rows are
 * still there and the switch can go back.
 */
async function visibleAssessments(): Promise<Assessment[]> {
  const [assessments, hidden] = await Promise.all([listAssessments(), samplesHidden()]);
  return hidden ? assessments.filter((a) => !a.sample) : assessments;
}

export async function organisationRows(): Promise<OrganisationRow[]> {
  const assessments = await visibleAssessments();
  return assessments.map((a) => ({
    id: a.id,
    organisation: a.profile.organisation || "Unnamed organisation",
    contactName: a.profile.contactName,
    email: a.profile.email,
    sector: a.profile.sector,
    status: a.status,
    paymentStatus: a.payment.status,
    overall: a.score?.overall ?? null,
    tier: a.score?.tier ?? null,
    invited: a.shares.length,
    responded: a.shares.filter((s) => s.respondedAt).length,
    undelivered: a.shares.filter(isUndelivered).length,
    sample: a.sample === true,
    reportState: reportState(a),
    createdAt: a.createdAt,
    submittedAt: a.submittedAt,
  }));
}

export type PartyRow = {
  name: string;
  email: string;
  relationship: string;
  invitedAt: string;
  respondedAt: string | null;
  overall: number | null;
  token: string;
  delivery: "sent" | "failed" | "not_sent" | "unknown";
  deliveryError: string | null;
  undelivered: boolean;
  notifiedAt: string | null;
  notifiedBy: string | null;
};

export type OrganisationDetail = {
  row: OrganisationRow;
  assessment: Assessment;
  parties: PartyRow[];
  /** Self-assessment score, recomputed so the detail view never shows a stale number. */
  selfScore: ReturnType<typeof scoreAssessment> | null;
  /** How the client's view compares with the stakeholder consensus, per pillar. */
  perception: { section: SectionId; title: string; self: number; others: number }[];
  responses: StakeholderResponse[];
};

export async function organisationDetail(
  id: string,
): Promise<OrganisationDetail | null> {
  // Not filtered: a hidden sample opened by its own link should still read, so
  // the switch does not turn a working page into a dead one.
  const assessments = await listAssessments();
  const assessment = assessments.find((a) => a.id === id);
  if (!assessment) return null;

  const responses = await listStakeholderResponses(id);
  const rows = await organisationRows();
  const row = rows.find((r) => r.id === id)!;

  const parties: PartyRow[] = assessment.shares.map((share) => {
    const response = responses.find((r) => r.shareToken === share.token);
    return {
      name: share.name || share.email,
      email: share.email,
      relationship: share.relationship,
      invitedAt: share.invitedAt,
      respondedAt: share.respondedAt,
      overall: response?.score.overall ?? null,
      token: share.token,
      delivery: share.delivery?.status ?? "unknown",
      deliveryError: share.delivery?.error ?? null,
      undelivered: isUndelivered(share),
      notifiedAt: share.notifiedAt ?? null,
      notifiedBy: share.notifiedBy ?? null,
    };
  });

  const selfScore =
    Object.keys(assessment.answers).length > 0
      ? scoreAssessment(assessment.answers, "client")
      : null;

  const perception = selfScore
    ? SECTION_ORDER.map((section) => {
        const self = selfScore.sections.find((s) => s.id === section);
        const theirs = responses
          .map((r) => r.score.sections.find((s) => s.id === section)?.score)
          .filter((n): n is number => typeof n === "number");
        return {
          section,
          title: self?.title ?? section,
          self: Math.round(self?.score ?? 0),
          others: theirs.length
            ? Math.round(theirs.reduce((a, b) => a + b, 0) / theirs.length)
            : 0,
        };
      })
    : [];

  return { row, assessment, parties, selfScore, perception, responses };
}

export type Analytics = {
  totals: {
    assessments: number;
    submitted: number;
    reports: number;
    stakeholders: number;
    responded: number;
    paid: number;
  };
  /** Organisations with at least one invitation that did not arrive. */
  deliveryProblems: {
    id: string;
    organisation: string;
    addresses: number;
    notified: number;
    sample: boolean;
  }[];
  /** Mean pillar score across every submitted assessment. */
  pillars: { section: SectionId; title: string; score: number }[];
  /** How many organisations sit in each tier. */
  tiers: { tier: string; count: number }[];
  /** Assessments started per month, oldest first. */
  activity: { month: string; started: number; submitted: number }[];
  /** Topics answered no most often, heaviest first. */
  commonGaps: { topic: string; count: number }[];
};

export async function analytics(): Promise<Analytics> {
  const assessments = await visibleAssessments();
  const allResponses = await listAllStakeholderResponses();
  const hidden = await samplesHidden();
  const responses = hidden
    ? allResponses.filter((r) => assessments.some((a) => a.id === r.assessmentId))
    : allResponses;

  const submitted = assessments.filter((a) => a.status === "submitted");

  const pillarTotals = new Map<SectionId, { sum: number; n: number; title: string }>();
  const tierCounts = new Map<string, number>();
  const gapCounts = new Map<string, number>();

  for (const a of submitted) {
    if (Object.keys(a.answers).length === 0) continue;
    const scored = scoreAssessment(a.answers, "client");

    for (const s of scored.sections) {
      const row = pillarTotals.get(s.id) ?? { sum: 0, n: 0, title: s.title };
      row.sum += s.score;
      row.n += 1;
      pillarTotals.set(s.id, row);
    }
    tierCounts.set(scored.tier.name, (tierCounts.get(scored.tier.name) ?? 0) + 1);
    for (const gap of scored.gaps) {
      gapCounts.set(gap.topic, (gapCounts.get(gap.topic) ?? 0) + 1);
    }
  }

  const byMonth = new Map<string, { started: number; submitted: number }>();
  for (const a of assessments) {
    const key = a.createdAt.slice(0, 7);
    const row = byMonth.get(key) ?? { started: 0, submitted: 0 };
    row.started += 1;
    if (a.status === "submitted") row.submitted += 1;
    byMonth.set(key, row);
  }

  return {
    totals: {
      assessments: assessments.length,
      submitted: submitted.length,
      reports: assessments.filter((a) => a.report).length,
      stakeholders: assessments.reduce((n, a) => n + a.shares.length, 0),
      responded: responses.length,
      paid: assessments.filter((a) => a.payment.status === "paid").length,
    },
    deliveryProblems: assessments
      .map((a) => {
        const bad = a.shares.filter(isUndelivered);
        return {
          id: a.id,
          organisation: a.profile.organisation || "Unnamed organisation",
          addresses: bad.length,
          notified: bad.filter((s) => s.notifiedAt).length,
          sample: a.sample === true,
        };
      })
      .filter((p) => p.addresses > 0),
    pillars: SECTION_ORDER.map((id) => {
      const row = pillarTotals.get(id);
      return {
        section: id,
        title: row?.title ?? id,
        score: row && row.n ? Math.round((row.sum / row.n) * 10) / 10 : 0,
      };
    }),
    tiers: ["Bronze", "Silver", "Gold", "Platinum"].map((tier) => ({
      tier,
      count: tierCounts.get(tier) ?? 0,
    })),
    activity: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
    commonGaps: [...gapCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count })),
  };
}
