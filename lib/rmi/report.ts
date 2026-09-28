import { SECTIONS, questionsFor } from "./questions";
import { perceptionGap, scoreAssessment, type Answers } from "./scoring";
import type { Assessment, StakeholderResponse } from "./store";

/**
 * Builds the consolidated report through OpenRouter. The model gets the scored
 * result and the answer-level detail, never a free hand: the structure below
 * matches the sample reports we publish, so the output drops straight onto
 * letterhead.
 */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export function reportConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function answerDigest(answers: Answers, audience: "client" | "stakeholder"): string {
  const questions = questionsFor(audience);
  return SECTIONS.map((section) => {
    const rows = questions
      .filter((q) => q.section === section.id)
      .map((q) => {
        const a = answers[q.id];
        const base = a?.base === true ? "yes" : a?.base === false ? "no" : "unanswered";
        const depth =
          a?.base === true && q.followUp
            ? a.followUp === true
              ? "yes"
              : a.followUp === false
                ? "no"
                : "unanswered"
            : "n/a";
        return `- ${q.topic} | practice: ${base} | evidence: ${depth} | ${q.sdg ?? ""} ${q.gri ?? ""}`.trim();
      })
      .join("\n");
    return `### ${section.title}\n${rows}`;
  }).join("\n\n");
}

function stakeholderDigest(responses: StakeholderResponse[]): string {
  if (responses.length === 0) {
    return "No stakeholder responses were returned. Say so plainly in the report and treat the self-assessment as unverified.";
  }
  const consolidated: Answers = {};
  const tally = new Map<string, { yes: number; total: number }>();
  for (const r of responses) {
    for (const [qid, a] of Object.entries(r.answers)) {
      if (a.base == null) continue;
      const row = tally.get(qid) ?? { yes: 0, total: 0 };
      row.total += 1;
      if (a.base) row.yes += 1;
      tally.set(qid, row);
    }
  }
  // Majority view across the stakeholders, so the gap comparison is like for like.
  for (const [qid, row] of tally) {
    consolidated[qid] = { base: row.yes * 2 >= row.total, followUp: null };
  }

  const scored = scoreAssessment(consolidated, "stakeholder");
  const lines = scored.sections
    .map((s) => `- ${s.title}: ${Math.round(s.score)}/100 (${s.level})`)
    .join("\n");

  return [
    `${responses.length} stakeholder ${responses.length === 1 ? "response" : "responses"} received.`,
    `Relationships: ${responses.map((r) => r.relationship || "unspecified").join(", ")}.`,
    `Stakeholder consensus score: ${Math.round(scored.overall)}/100.`,
    lines,
  ].join("\n");
}

export type GeneratedReport = { markdown: string; model: string };

export type Message = { role: "system" | "user"; content: string };

/**
 * Exported so the prompt can be inspected and exercised without spending a
 * call, and so the wording lives in one place.
 */
export function buildMessages(
  assessment: Assessment,
  stakeholders: StakeholderResponse[],
): Message[] {
  const scored = scoreAssessment(assessment.answers, "client");

  let gapNote = "";
  if (stakeholders.length > 0) {
    const consolidated: Answers = {};
    const tally = new Map<string, { yes: number; total: number }>();
    for (const r of stakeholders) {
      for (const [qid, a] of Object.entries(r.answers)) {
        if (a.base == null) continue;
        const row = tally.get(qid) ?? { yes: 0, total: 0 };
        row.total += 1;
        if (a.base) row.yes += 1;
        tally.set(qid, row);
      }
    }
    for (const [qid, row] of tally) {
      consolidated[qid] = { base: row.yes * 2 >= row.total, followUp: null };
    }
    const theirs = scoreAssessment(consolidated, "stakeholder");
    gapNote = perceptionGap(scored, theirs)
      .map(
        (g) =>
          `- ${g.title}: self ${Math.round(
            scored.sections.find((s) => s.id === g.section)?.score ?? 0,
          )}, stakeholders ${Math.round(
            theirs.sections.find((s) => s.id === g.section)?.score ?? 0,
          )}, gap ${g.delta > 0 ? "+" : ""}${g.delta}`,
      )
      .join("\n");
  }

  const system = [
    "You write sustainability assessment reports for Rejuvenate Responsibly, an ESG and CSR advisory firm in Nairobi.",
    "You are given a scored self-assessment and, where available, the stakeholder view. Write the report from that evidence only. Never invent a figure, a project, a partner or a certification that is not in the data.",
    "Where the evidence is thin, say so. A short honest report beats a padded one.",
    "House style: plain British English. No em dashes, no en dashes, no curly quotes, no emoji, no bold-header bullet lists.",
    "Do not open sentences with Additionally or Moreover. Do not call anything pivotal, vibrant, robust, holistic or a testament. Never use the word journey. Do not write 'not just X but Y'. Avoid forcing points into groups of three.",
    "Do not tack participle clauses onto sentences to add weight: no 'indicating that', 'reflecting a', 'highlighting the', 'underscoring its'. State the finding, then stop.",
    "Use 'is' and 'has' rather than 'serves as' and 'boasts'. Sentence case for headings.",
    "Do not address the reader as an assistant would. No preamble, no sign-off offering further help. Output the report and nothing else.",
  ].join(" ");

  const user = `Write the consolidated report in Markdown, using exactly this structure:

# ${assessment.profile.organisation}: ${new Date().getFullYear()} Sustainability Impact Report

### A subtitle of six words or fewer

## 1. Executive summary
Two or three short paragraphs. State the overall score and tier in the body. Say what the organisation is clearly good at and where it is exposed.

## 2. Pillar I: Governance and ethics
A one line framing, then a markdown table with the columns: Assessment metric | Performance level | KPI or disclosure. Four rows, drawn from the strongest and weakest governance topics in the data. Performance level is one of Emerging, Adequate, Strategic, Excellent. Then a short "Management approach" paragraph.

## 3. Pillar II: Economic viability
Same shape as above.

## 4. Pillar III: Environmental stewardship
Same shape as above.

## 5. Pillar IV: Social responsibility
Same shape as above.

## 6. Gap analysis and strategic roadmap
Three numbered gaps, heaviest first, each with what it is and what to do about it. Then one opportunity specific to this organisation's sector.

## 7. Conclusion and commitment
One paragraph. Then a short "Next steps" list of two phases.

---
Report generated by: Rejuvenate Responsibly Strategy Consultants
Framework: NSE Kenya ESG Disclosure Manual and GRI Standards
Assessment reference: ${assessment.id}

Here is the evidence.

ORGANISATION
Name: ${assessment.profile.organisation}
Sector: ${assessment.profile.sector || "not given"}
Completed by: ${assessment.profile.contactName}, ${assessment.profile.role || "role not given"}

SCORES
Overall: ${Math.round(scored.overall)}/100, ${scored.tier.name} tier (${scored.tier.level})
Coverage (practice exists): ${Math.round(scored.coverage)}/100
Depth (evidence behind it): ${Math.round(scored.depth)}/100
${scored.sections.map((s) => `${s.title}: ${Math.round(s.score)}/100, ${s.level}`).join("\n")}

HEAVIEST GAPS (answered no, ranked by weight)
${scored.gaps.slice(0, 10).map((g) => `- ${g.topic}: ${g.question}`).join("\n") || "- none"}

PRACTICES WITHOUT EVIDENCE (answered yes, follow-up no)
${scored.nearMisses.slice(0, 10).map((g) => `- ${g.topic}: ${g.followUp}`).join("\n") || "- none"}

STAKEHOLDER VIEW
${stakeholderDigest(stakeholders)}
${gapNote ? `\nPERCEPTION GAP BY PILLAR\n${gapNote}` : ""}

FULL ANSWER DETAIL
${answerDigest(assessment.answers, "client")}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export async function generateReport(
  assessment: Assessment,
  stakeholders: StakeholderResponse[],
): Promise<GeneratedReport> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set.");

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://rejuvenateresponsibly.com",
      "X-Title": "Rejuvenate Responsibly RMI",
    },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      temperature: 0.4,
      messages: buildMessages(assessment, stakeholders),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  const markdown = data.choices?.[0]?.message?.content?.trim();
  if (!markdown) {
    throw new Error(data.error?.message ?? "OpenRouter returned an empty report.");
  }

  return { markdown: scrub(markdown), model };
}

/** Last line of defence against the tells the prompt already asks it to avoid. */
function scrub(text: string): string {
  return text
    .replace(/—/g, ", ")
    .replace(/–/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[…]/g, "...")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, "")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
