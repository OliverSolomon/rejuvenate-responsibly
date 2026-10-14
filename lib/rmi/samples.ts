import { createHash } from "node:crypto";
import { questionsFor, SECTIONS, SECTION_ORDER } from "./questions";
import { scoreAssessment, type Answers } from "./scoring";
import type {
  Assessment,
  InviteDelivery,
  Payment,
  PaymentStatus,
  Profile,
  Report,
  ScoreSummary,
  Share,
  StakeholderResponse,
} from "./store";

/**
 * Sample submissions for trying the dashboard, the report flow and the edge
 * cases without waiting for real clients.
 *
 * Every record is flagged `sample`, so loading replaces the earlier set and
 * removing takes out only these. Nothing is random: the same call always builds
 * the same records, which makes a screenshot or a bug report reproducible. Names
 * are invented and every address is on example.org, which cannot receive mail.
 *
 * The cases below are chosen to cover each combination the dashboard has to
 * handle: every payment state, every tier, every stage of stakeholder
 * response, every report state, and the awkward inputs (blank fields, markup
 * characters, a very long name, a split vote).
 */

/**
 * A repeatable UUID for a sample record. The database's id columns are UUIDs, so
 * readable labels like "sample-share-6-1" are rejected there. Hashing the label
 * keeps every load identical while producing a valid UUID.
 */
function sampleUuid(label: string): string {
  const h = createHash("sha1").update(`rmi-sample:${label}`).digest("hex");
  // Shape it as a version 4 UUID (the variant bits are fixed, the rest is hash).
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/* -------------------------------------------------------------------------- */
/* answer generation                                                          */
/* -------------------------------------------------------------------------- */

type Rates = { base: number; depth: number };

/** Repeatable pseudo-random number in [0, 1). */
function unit(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function answersFor(
  audience: "client" | "stakeholder",
  rates: Rates,
  salt: number,
  opts: { first?: number; skipEvery?: number } = {},
): Answers {
  const out: Answers = {};
  questionsFor(audience).forEach((q, i) => {
    if (opts.first !== undefined && i >= opts.first) return;
    if (opts.skipEvery && i % opts.skipEvery === opts.skipEvery - 1) {
      out[q.id] = { base: null, followUp: null };
      return;
    }
    const base = unit(i, salt) < rates.base;
    out[q.id] = { base, followUp: base ? unit(i, salt + 17) < rates.depth : null };
  });
  return out;
}

function summary(answers: Answers, audience: "client" | "stakeholder"): ScoreSummary {
  const s = scoreAssessment(answers, audience);
  return {
    overall: s.overall,
    coverage: s.coverage,
    depth: s.depth,
    tier: s.tier.name,
    sections: s.sections.map((x) => ({ id: x.id, score: x.score })),
  };
}

/* -------------------------------------------------------------------------- */
/* the cases                                                                  */
/* -------------------------------------------------------------------------- */

type Person = { name: string; email: string; relationship: string };

type Case = {
  title: string;
  /** What this record exists to exercise. Shown in the dashboard. */
  covers: string;
  profile: Profile;
  daysAgo: number;
  status: "draft" | "submitted";
  payment: PaymentStatus;
  tier: "essential" | "professional" | null;
  answers: Answers;
  invited: Person[];
  /** One entry per stakeholder who has answered, in invitation order. */
  responses: Rates[];
  /**
   * Delivery result per invited address, in order. Omitted means every one was
   * delivered. "unrecorded" leaves the field off, as on invitations sent before
   * delivery was tracked.
   */
  deliveries?: (InviteDelivery["status"] | "unrecorded")[];
  /** Positions in `invited` whose failure the submitter has already been told about. */
  notified?: number[];
  report: "none" | "draft" | "issued" | "sent";
};

const person = (name: string, relationship: string, n: number): Person => ({
  name,
  relationship,
  email: `${(name || "stakeholder").toLowerCase().replace(/[^a-z]+/g, ".")}${n}@example.org`,
});

const SELF = {
  none: { base: 0, depth: 0 },
  low: { base: 0.35, depth: 0.2 },
  silver: { base: 0.8, depth: 0.5 },
  gold: { base: 0.97, depth: 0.8 },
  silverHigh: { base: 0.9, depth: 0.6 },
  all: { base: 1, depth: 1 },
  noEvidence: { base: 1, depth: 0 },
};

const cases: Case[] = [
  {
    title: "Not started",
    covers: "Assessment created, nothing answered, nothing paid. Empty states and zero scores.",
    profile: { organisation: "Mara Ridge Dairy Cooperative", contactName: "Wanjiru Kamau", email: "wanjiru.kamau@example.org", role: "Operations lead", sector: "Agriculture and food" },
    daysAgo: 2,
    status: "draft",
    payment: "unpaid",
    tier: null,
    answers: {},
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Partway, payment pending",
    covers: "Checkout opened and abandoned. Part answered, with some questions skipped (null answers).",
    profile: { organisation: "Kilifi Coast Logistics", contactName: "Omar Abdalla", email: "omar.abdalla@example.org", role: "Finance director", sector: "Transport and logistics" },
    daysAgo: 9,
    status: "draft",
    payment: "pending",
    tier: "essential",
    answers: answersFor("client", SELF.silver, 3, { first: 22, skipEvery: 6 }),
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Payment failed",
    covers: "Gateway declined the payment. Few answers, still in progress.",
    profile: { organisation: "Nyali Print Works", contactName: "Achieng Otieno", email: "achieng.otieno@example.org", role: "Owner", sector: "Manufacturing" },
    daysAgo: 14,
    status: "draft",
    payment: "failed",
    tier: "essential",
    answers: answersFor("client", SELF.low, 5, { first: 8 }),
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Test run, payment waived",
    covers: "Opened while the require-payment switch was off. Must not count as paid. Nearly finished.",
    profile: { organisation: "Lake Basin Water Services", contactName: "Peter Njoroge", email: "peter.njoroge@example.org", role: "Sustainability officer", sector: "Utilities" },
    daysAgo: 4,
    status: "draft",
    payment: "waived",
    tier: "professional",
    answers: answersFor("client", SELF.silver, 7, { first: 45 }),
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Everything answered no",
    covers: "Lowest possible score (0, Bronze). No stakeholders invited, so the report has no outside view to cite.",
    profile: { organisation: "Rift Valley Hardware", contactName: "Grace Mwangi", email: "grace.mwangi@example.org", role: "Manager", sector: "Retail" },
    daysAgo: 40,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.none, 11),
    invited: [],
    responses: [],
    report: "draft",
  },
  {
    title: "Submitted, waiting on stakeholders",
    covers: "Three invited, none answered yet, and two of the invitations did not arrive (one rejected, one never sent). Submitter not told yet. Shows the delivery alert on the overview, list and detail pages.",
    profile: { organisation: "Tsavo Safari Lodges", contactName: "Daniel Kiprop", email: "daniel.kiprop@example.org", role: "General manager", sector: "Hospitality and tourism" },
    daysAgo: 18,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.low, 13),
    invited: [person("Halima Said", "Supplier", 1), person("Brian Ochieng", "Employee", 2), person("Mercy Wambui", "Community partner", 3)],
    responses: [],
    deliveries: ["sent", "failed", "not_sent"],
    report: "none",
  },
  {
    title: "Some stakeholders in",
    covers: "Three invited, one answered, one invitation failed (submitter already told) and one with no delivery record, as before tracking. The admin sent the report anyway with two answers outstanding.",
    profile: { organisation: "Aberdare Tea Growers", contactName: "Esther Chebet", email: "esther.chebet@example.org", role: "Chief executive", sector: "Agriculture and food" },
    daysAgo: 25,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.silverHigh, 17),
    invited: [person("Samuel Mutua", "Customer", 1), person("Lucy Atieno", "Supplier", 2), person("Hassan Yusuf", "Investor", 3)],
    responses: [{ base: 0.5, depth: 0 }],
    deliveries: ["unrecorded", "sent", "failed"],
    notified: [2],
    report: "sent",
  },
  {
    title: "Overrates itself",
    covers: "Silver self-score, three stakeholders answered, report generated but not yet reviewed. Large positive perception gap.",
    profile: { organisation: "Highland Packaging Ltd", contactName: "Rose Wafula", email: "rose.wafula@example.org", role: "Head of quality", sector: "Manufacturing" },
    daysAgo: 52,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.silver, 19),
    invited: [person("Kevin Mbugua", "Supplier", 1), person("Naomi Jeptoo", "Employee", 2), person("Ibrahim Noor", "Customer", 3)],
    responses: [{ base: 0.3, depth: 0 }, { base: 0.35, depth: 0 }, { base: 0.25, depth: 0 }],
    report: "draft",
  },
  {
    title: "Gold, five stakeholders, report issued",
    covers: "Professional tier, every invitation answered, report edited and issued. The generated original is kept beside the edit.",
    profile: { organisation: "Savannah Renewable Energy", contactName: "Joseph Karanja", email: "joseph.karanja@example.org", role: "Chief sustainability officer", sector: "Energy" },
    daysAgo: 75,
    status: "submitted",
    payment: "paid",
    tier: "professional",
    answers: answersFor("client", SELF.gold, 23),
    invited: [person("Amina Hussein", "Investor", 1), person("Tom Odhiambo", "Regulator liaison", 2), person("Faith Njeri", "Employee", 3), person("Collins Kiplagat", "Supplier", 4), person("Sarah Muthoni", "Community partner", 5)],
    responses: [{ base: 0.75, depth: 0 }, { base: 0.8, depth: 0 }, { base: 0.7, depth: 0 }, { base: 0.78, depth: 0 }, { base: 0.72, depth: 0 }],
    report: "issued",
  },
  {
    title: "Everything yes, with evidence",
    covers: "Highest possible score (100, Platinum). Unanimous stakeholders. No gaps and no near misses to list.",
    profile: { organisation: "Baobab Impact Fund", contactName: "Zawadi Mohamed", email: "zawadi.mohamed@example.org", role: "Managing partner", sector: "Financial services" },
    daysAgo: 95,
    status: "submitted",
    payment: "paid",
    tier: "professional",
    answers: answersFor("client", SELF.all, 29),
    invited: [person("Peter Macharia", "Investor", 1), person("Linet Cherono", "Employee", 2), person("Abdi Warsame", "Customer", 3), person("Joyce Anyango", "Supplier", 4), person("Martin Rotich", "Regulator liaison", 5)],
    responses: [SELF.all, SELF.all, SELF.all, SELF.all, SELF.all],
    report: "issued",
  },
  {
    title: "Practices without evidence",
    covers: "Every practice exists but none can be evidenced: coverage 100, depth 0. Heavy near-miss list, and a Bronze tier despite full coverage.",
    profile: { organisation: "Karura Property Partners", contactName: "Caroline Wanjiku", email: "caroline.wanjiku@example.org", role: "Director", sector: "Real estate and construction" },
    daysAgo: 33,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.noEvidence, 31),
    invited: [person("Dennis Kimani", "Contractor", 1), person("Rehema Salim", "Tenant", 2)],
    responses: [{ base: 0.6, depth: 0 }, { base: 0.55, depth: 0 }],
    report: "draft",
  },
  {
    title: "Stakeholders split evenly",
    covers: "Two stakeholders disagree on everything: one says yes to all, one no to all. A 50/50 tie, which the consensus rule resolves as yes.",
    profile: { organisation: "Turkana Basin Mining Services", contactName: "Isaac Lokwang", email: "isaac.lokwang@example.org", role: "Compliance manager", sector: "Mining and extractives" },
    daysAgo: 21,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.low, 37),
    invited: [person("Pauline Ekai", "Community partner", 1), person("Stephen Lomuria", "Employee", 2)],
    responses: [SELF.all, SELF.none],
    report: "none",
  },
  {
    title: "Blank fields and markup characters",
    covers: "No contact name, role or sector; a stakeholder with no name or relationship; an organisation name with &, <>, quotes and accents. Escaping and fallbacks.",
    profile: { organisation: "Société d'Énergie Verte & Fils <Ltd> \"Nairobi/Mombasa\"", contactName: "", email: "info.blank@example.org", role: "", sector: "" },
    daysAgo: 12,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.silver, 41),
    invited: [{ name: "", email: "anonymous.respondent@example.org", relationship: "" }],
    responses: [{ base: 0.6, depth: 0 }],
    report: "draft",
  },
  {
    title: "Very long organisation name, waived",
    covers: "Layout under a 120+ character name in lists and headings. Submitted under a waived payment, no stakeholders.",
    profile: { organisation: "The Combined Association of Smallholder Horticultural Growers, Packers, Exporters and Allied Service Providers of the Greater Mount Kenya and Aberdare Region Ltd", contactName: "Beatrice Gathoni", email: "beatrice.gathoni@example.org", role: "Secretary to the board", sector: "Agriculture and food" },
    daysAgo: 6,
    status: "submitted",
    payment: "waived",
    tier: "professional",
    answers: answersFor("client", SELF.silver, 43),
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Submitted without paying",
    covers: "Came in through the free preview link and finished. Submitted but unpaid, which the public site currently allows.",
    profile: { organisation: "Ngong Hills Printers", contactName: "Victor Onyango", email: "victor.onyango@example.org", role: "Partner", sector: "Manufacturing" },
    daysAgo: 3,
    status: "submitted",
    payment: "unpaid",
    tier: null,
    answers: answersFor("client", SELF.low, 47),
    invited: [],
    responses: [],
    report: "none",
  },
  {
    title: "Underrates itself",
    covers: "Low self-score, stakeholders far more positive. Negative perception gap, report issued.",
    profile: { organisation: "Malindi Fishers Welfare Society", contactName: "Fatuma Bakari", email: "fatuma.bakari@example.org", role: "Chairperson", sector: "Foundation, NGO or trust" },
    daysAgo: 60,
    status: "submitted",
    payment: "paid",
    tier: "essential",
    answers: answersFor("client", SELF.low, 53),
    invited: [person("Hamisi Juma", "Beneficiary", 1), person("Zainab Ali", "Donor", 2), person("Robert Karisa", "Partner", 3)],
    responses: [{ base: 0.92, depth: 0 }, { base: 0.88, depth: 0 }, { base: 0.9, depth: 0 }],
    report: "issued",
  },
];

/* -------------------------------------------------------------------------- */
/* report text                                                                */
/* -------------------------------------------------------------------------- */

function level(topicAnswer: { base: boolean | null; followUp: boolean | null } | undefined) {
  if (!topicAnswer?.base) return "Emerging";
  return topicAnswer.followUp ? "Strategic" : "Adequate";
}

function pillarRows(answers: Answers, section: (typeof SECTION_ORDER)[number]): string {
  const qs = questionsFor("client").filter((q) => q.section === section);
  const byWeight = [...qs].sort((a, b) => b.weight - a.weight);
  const weak = byWeight.filter((q) => answers[q.id]?.base === false).slice(0, 2);
  const strong = byWeight.filter((q) => answers[q.id]?.base && answers[q.id]?.followUp).slice(0, 2);
  const chosen = [...strong, ...weak];
  for (const q of byWeight) {
    if (chosen.length >= 4) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen
    .slice(0, 4)
    .map((q) => {
      const kpi = [q.sdg, q.gri].filter(Boolean).join("; ") || "No disclosure mapped";
      return `| ${q.topic} | ${level(answers[q.id])} | ${kpi} |`;
    })
    .join("\n");
}

function sampleReport(a: Assessment, responded: number, consensus: number | null): string {
  const s = scoreAssessment(a.answers, "client");
  const org = a.profile.organisation;
  const best = [...s.sections].sort((x, y) => y.score - x.score)[0];
  const worst = [...s.sections].sort((x, y) => x.score - y.score)[0];

  const outside =
    responded === 0
      ? "No stakeholder responses were returned, so this self-assessment has not been checked against an outside view."
      : `${responded} ${responded === 1 ? "stakeholder" : "stakeholders"} answered. Their consensus score is ${Math.round(consensus ?? 0)}/100.`;

  const pillar = (n: number, id: (typeof SECTION_ORDER)[number], name: string) => {
    const r = s.sections.find((x) => x.id === id)!;
    return `## ${n}. Pillar ${["I", "II", "III", "IV"][n - 2]}: ${name}
${SECTIONS.find((x) => x.id === id)!.short} scored ${Math.round(r.score)}/100, which is ${r.level.toLowerCase()}.

| Assessment metric | Performance level | KPI or disclosure |
| --- | --- | --- |
${pillarRows(a.answers, id)}

Management approach: ${r.answered} of ${r.total} questions were answered in this pillar. Coverage is ${Math.round(r.coverage)}/100 and depth is ${Math.round(r.depth)}/100.
`;
  };

  const gaps = (s.gaps.length ? s.gaps : s.nearMisses.map((g) => ({ topic: g.topic, question: g.followUp })))
    .slice(0, 3)
    .map((g, i) => `${i + 1}. ${g.topic}: ${g.question}`)
    .join("\n");

  return `# ${org}: ${new Date(a.submittedAt ?? a.createdAt).getFullYear()} Sustainability Impact Report

### Sample report for dashboard testing

## 1. Executive summary
${org} scored ${Math.round(s.overall)}/100 and sits in the ${s.tier.name} tier (${s.tier.level}). Coverage is ${Math.round(s.coverage)}/100 and depth is ${Math.round(s.depth)}/100.

${best.short} is the strongest pillar at ${Math.round(best.score)}/100. ${worst.short} is the most exposed at ${Math.round(worst.score)}/100. ${outside}

${pillar(2, "governance", "Governance and ethics")}
${pillar(3, "economic", "Economic viability")}
${pillar(4, "environmental", "Environmental stewardship")}
${pillar(5, "social", "Social responsibility")}
## 6. Gap analysis and strategic roadmap
${gaps || "No gaps were recorded."}

The sector opportunity for ${a.profile.sector || "this organisation"} is to turn the practices it already runs into measured, published figures.

## 7. Conclusion and commitment
${org} has a clear starting position in the ${s.tier.name} tier. The first phase is to close the heaviest gap above. The second is to evidence the practices that already exist.

Next steps:
1. Within 90 days: assign an owner to each gap and agree the measures.
2. Within 12 months: re-assess and compare against this baseline.

---
Report generated by: Rejuvenate Responsibly Strategy Consultants
Framework: NSE Kenya ESG Disclosure Manual and GRI Standards
Assessment reference: ${a.id}
`;
}

/* -------------------------------------------------------------------------- */
/* assembly                                                                   */
/* -------------------------------------------------------------------------- */

const DAY = 86_400_000;
const AMOUNT = { essential: 35000, professional: 85000 } as const;

function paymentFor(c: Case, id: string, at: string): Payment {
  const base: Payment = {
    status: c.payment,
    tier: c.tier,
    amount: null,
    currency: "KES",
    merchantReference: null,
    orderTrackingId: null,
    method: null,
    updatedAt: c.payment === "unpaid" ? null : at,
  };
  if (c.payment === "waived" || c.payment === "unpaid" || !c.tier) return base;
  return {
    ...base,
    amount: AMOUNT[c.tier],
    merchantReference: `${id}-SAMPLE`,
    orderTrackingId: `sample-track-${id.slice(-3)}`,
    method: c.payment === "paid" ? (id.endsWith("9") ? "VISA" : "MPESA") : null,
  };
}

export function sampleId(n: number): string {
  // Real codes never contain 0 or 1, so a sample id can never collide with one.
  return `RMI-SMP${String(n).padStart(3, "0")}`;
}

export type SampleCase = { id: string; title: string; covers: string };

export const SAMPLE_CASES: SampleCase[] = cases.map((c, i) => ({
  id: sampleId(i + 1),
  title: c.title,
  covers: c.covers,
}));

export function buildSamples(now: Date = new Date()): {
  assessments: Assessment[];
  responses: StakeholderResponse[];
} {
  const assessments: Assessment[] = [];
  const responses: StakeholderResponse[] = [];

  cases.forEach((c, index) => {
    const n = index + 1;
    const id = sampleId(n);
    const created = new Date(now.getTime() - c.daysAgo * DAY);
    const submitted = c.status === "submitted" ? new Date(created.getTime() + 2 * DAY) : null;
    const invitedAt = submitted ? new Date(submitted.getTime() + DAY) : null;

    const shares: Share[] = c.invited.map((p, k) => ({
      id: sampleUuid(`share-${n}-${k + 1}`),
      name: p.name,
      email: p.email,
      relationship: p.relationship,
      token: `sample-share-token-${n}-${k + 1}`,
      invitedAt: (invitedAt ?? created).toISOString(),
      respondedAt:
        k < c.responses.length
          ? new Date(Math.min(now.getTime(), (invitedAt ?? created).getTime() + (k + 2) * DAY)).toISOString()
          : null,
    }));

    shares.forEach((share, k) => {
      const status = c.deliveries?.[k] ?? "sent";
      if (status !== "unrecorded") {
        share.delivery = {
          status,
          ...(status === "failed" ? { error: "Mailtrap returned 422" } : {}),
          at: share.invitedAt,
        };
      }
      if (c.notified?.includes(k)) {
        share.notifiedAt = new Date(
          Math.min(now.getTime(), new Date(share.invitedAt).getTime() + DAY),
        ).toISOString();
        share.notifiedBy = "sample data";
      }
    });

    const record: Assessment = {
      id,
      token: `sample-token-${n}`,
      status: c.status,
      profile: c.profile,
      answers: c.answers,
      score: c.status === "submitted" ? summary(c.answers, "client") : null,
      payment: paymentFor(c, id, created.toISOString()),
      shares,
      report: null,
      createdAt: created.toISOString(),
      updatedAt: (submitted ?? created).toISOString(),
      submittedAt: submitted ? submitted.toISOString() : null,
      sample: true,
    };

    const answered: StakeholderResponse[] = c.responses.map((rates, k) => {
      const ans = answersFor("stakeholder", rates, 100 + n * 10 + k);
      return {
        id: sampleUuid(`response-${n}-${k + 1}`),
        assessmentId: id,
        shareToken: shares[k].token,
        name: shares[k].name,
        email: shares[k].email,
        relationship: shares[k].relationship,
        answers: ans,
        score: summary(ans, "stakeholder"),
        createdAt: shares[k].respondedAt!,
      };
    });
    responses.push(...answered.map((r) => ({ ...r, sample: true as const })));

    if (c.report !== "none") {
      // Same majority rule the real report prompt uses, so the sample's numbers
      // agree with what generation would compute for these answers.
      const tally = new Map<string, { yes: number; total: number }>();
      for (const r of answered) {
        for (const [qid, a] of Object.entries(r.answers)) {
          if (a.base == null) continue;
          const row = tally.get(qid) ?? { yes: 0, total: 0 };
          row.total += 1;
          if (a.base) row.yes += 1;
          tally.set(qid, row);
        }
      }
      const consolidated: Answers = {};
      for (const [qid, row] of tally) {
        consolidated[qid] = { base: row.yes * 2 >= row.total, followUp: null };
      }
      const consensus =
        answered.length > 0 ? scoreAssessment(consolidated, "stakeholder").overall : null;

      const generatedAt = new Date(
        Math.min(now.getTime(), (invitedAt ?? created).getTime() + 6 * DAY),
      ).toISOString();
      const markdown = sampleReport(record, answered.length, consensus);

      const report: Report = { markdown, model: "sample data", generatedAt };
      if (c.report === "issued" || c.report === "sent") {
        report.generatedMarkdown = markdown;
        report.markdown = markdown.replace(
          "## 1. Executive summary\n",
          "## 1. Executive summary\nThis report was reviewed by the Rejuvenate Responsibly team before issue.\n\n",
        );
        report.editedAt = new Date(
          Math.min(now.getTime(), new Date(generatedAt).getTime() + DAY),
        ).toISOString();
        report.editedBy = "sample data";
      }
      if (c.report === "sent") {
        report.sentAt = new Date(
          Math.min(now.getTime(), new Date(report.editedAt!).getTime() + DAY),
        ).toISOString();
        report.sentBy = "sample data";
        report.sentOutstanding = c.invited.length - answered.length;
      }
      record.report = report;
    }

    assessments.push(record);
  });

  return { assessments, responses };
}
