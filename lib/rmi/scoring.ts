import {
  SECTIONS,
  SECTION_ORDER,
  questionsFor,
  type Question,
  type SectionId,
} from "./questions";

export type Answer = {
  /** Answer to the primary yes/no question. */
  base: boolean | null;
  /** Answer to the follow-up. Only asked when `base` is true. */
  followUp: boolean | null;
};

export type Answers = Record<string, Answer>;

export type Tier = {
  name: "Bronze" | "Silver" | "Gold" | "Platinum";
  min: number;
  level: "Emerging" | "Adequate" | "Strategic" | "Excellent";
  blurb: string;
};

export const TIERS: Tier[] = [
  {
    name: "Bronze",
    min: 0,
    level: "Emerging",
    blurb:
      "Foundations are being laid. The priority is putting policy and ownership in place before chasing metrics.",
  },
  {
    name: "Silver",
    min: 55,
    level: "Adequate",
    blurb:
      "Practices exist and are working, but depth and assurance are uneven across pillars.",
  },
  {
    name: "Gold",
    min: 72,
    level: "Strategic",
    blurb:
      "Sustainability is integrated into strategy and governance, with credible disclosure behind it.",
  },
  {
    name: "Platinum",
    min: 87,
    level: "Excellent",
    blurb:
      "Sector-leading practice with independent assurance and disclosure that would survive external scrutiny.",
  },
];

export function tierFor(score: number): Tier {
  return [...TIERS].reverse().find((t) => score >= t.min) ?? TIERS[0];
}

export type SectionResult = {
  id: SectionId;
  title: string;
  short: string;
  /** 0 to 100. Share of that section's weight where the base practice exists. */
  coverage: number;
  /** 0 to 100. Share where the deeper follow-up practice also exists. */
  depth: number;
  /** 0 to 100. The blended pillar score. */
  score: number;
  level: Tier["level"];
  answered: number;
  total: number;
};

export type ScoreResult = {
  /** 0 to 100 overall, the average of coverage and depth. */
  overall: number;
  coverage: number;
  depth: number;
  tier: Tier;
  sections: SectionResult[];
  /** Topics answered "no" at the base question, heaviest first. */
  gaps: { topic: string; question: string; section: SectionId; weight: number }[];
  /** Topics answered "yes" but without the deeper practice. */
  nearMisses: { topic: string; followUp: string; section: SectionId; weight: number }[];
  answered: number;
  total: number;
};

function levelFor(score: number): Tier["level"] {
  if (score >= 87) return "Excellent";
  if (score >= 72) return "Strategic";
  if (score >= 55) return "Adequate";
  return "Emerging";
}

/**
 * Mirrors the workbook: each question carries a weight, the weights in each
 * sheet total 100. A "yes" on the primary question earns its full weight
 * (coverage); a "yes" on the follow-up earns the same weight again (depth).
 * The headline score is the mean of the two, so it always lands between 0 and 100.
 */
export function scoreAssessment(
  answers: Answers,
  audience: "client" | "stakeholder" = "client",
): ScoreResult {
  const questions = questionsFor(audience);

  let coverageEarned = 0;
  let depthEarned = 0;
  let totalWeight = 0;
  let answered = 0;

  const perSection = new Map<
    SectionId,
    { cov: number; dep: number; weight: number; answered: number; total: number }
  >();
  for (const id of SECTION_ORDER) {
    perSection.set(id, { cov: 0, dep: 0, weight: 0, answered: 0, total: 0 });
  }

  const gaps: ScoreResult["gaps"] = [];
  const nearMisses: ScoreResult["nearMisses"] = [];

  for (const q of questions) {
    const bucket = perSection.get(q.section)!;
    bucket.weight += q.weight;
    bucket.total += 1;
    totalWeight += q.weight;

    const a = answers[q.id];
    if (!a || a.base === null) continue;

    answered += 1;
    bucket.answered += 1;

    if (a.base) {
      coverageEarned += q.weight;
      bucket.cov += q.weight;
      if (a.followUp) {
        depthEarned += q.weight;
        bucket.dep += q.weight;
      } else if (q.followUp) {
        nearMisses.push({
          topic: q.topic,
          followUp: q.followUp,
          section: q.section,
          weight: q.weight,
        });
      }
    } else {
      gaps.push({
        topic: q.topic,
        question: q.question,
        section: q.section,
        weight: q.weight,
      });
    }
  }

  const pct = (earned: number, weight: number) =>
    weight > 0 ? Math.round((earned / weight) * 1000) / 10 : 0;

  const sections: SectionResult[] = SECTION_ORDER.map((id) => {
    const b = perSection.get(id)!;
    const coverage = pct(b.cov, b.weight);
    const depth = pct(b.dep, b.weight);
    const score = Math.round(((coverage + depth) / 2) * 10) / 10;
    const meta = SECTIONS.find((s) => s.id === id)!;
    return {
      id,
      title: meta.title,
      short: meta.short,
      coverage,
      depth,
      score,
      level: levelFor(score),
      answered: b.answered,
      total: b.total,
    };
  });

  const coverage = pct(coverageEarned, totalWeight);
  const depth = pct(depthEarned, totalWeight);
  const overall = Math.round(((coverage + depth) / 2) * 10) / 10;

  return {
    overall,
    coverage,
    depth,
    tier: tierFor(overall),
    sections,
    gaps: gaps.sort((a, b) => b.weight - a.weight),
    nearMisses: nearMisses.sort((a, b) => b.weight - a.weight),
    answered,
    total: questions.length,
  };
}

/** How far apart the client's self-view and the stakeholder consensus sit. */
export function perceptionGap(
  client: ScoreResult,
  stakeholder: ScoreResult,
): { section: SectionId; title: string; delta: number }[] {
  return client.sections.map((c) => {
    const s = stakeholder.sections.find((x) => x.id === c.id);
    return {
      section: c.id,
      title: c.title,
      delta: Math.round((c.score - (s?.score ?? 0)) * 10) / 10,
    };
  });
}

export function isComplete(answers: Answers, questions: Question[]): boolean {
  return questions.every((q) => answers[q.id]?.base !== undefined && answers[q.id]?.base !== null);
}
