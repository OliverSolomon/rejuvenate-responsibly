import "server-only";

import ExcelJS from "exceljs";
import { SECTIONS, questionsFor } from "./questions";
import { daysUntilExpiry, reportExpiry, type Assessment, type StakeholderResponse } from "./store";

/**
 * Everything people have entered, as a spreadsheet.
 *
 * Written with ExcelJS rather than the usual Python route because this runs on
 * the production server, which has Node and nothing else.
 *
 * The shape is the point. A single sheet of rows with a blob of answers in one
 * cell would be a backup, not something anyone can work with, so every question
 * answered gets its own row, with the question text beside the answer. That
 * makes the answers sheet long and useful: filter it, pivot it, count how many
 * organisations have no whistleblowing line.
 *
 * No formulas anywhere. This is a record of what was entered, and a formula
 * here would be a derived number pretending to be data.
 */

const FONT = "Arial";

/** The look of a header row: bold on the brand green, frozen so it stays put. */
const HEADER_FILL = "FF1A8656";

type Column = { header: string; key: string; width: number };

function sheet(book: ExcelJS.Workbook, name: string, columns: Column[]): ExcelJS.Worksheet {
  const ws = book.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const header = ws.getRow(1);
  header.font = { name: FONT, bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 28;

  // Filters on every sheet: the first thing anyone wants is one sector or one
  // organisation, and finding that by eye in a few thousand rows is nobody's
  // idea of a good time.
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  return ws;
}

const DATE_FORMAT = "yyyy-mm-dd hh:mm";

/** A date Excel understands, or nothing. Strings here would not sort. */
const when = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** How a yes or no answer reads in a cell. Blank means they never answered. */
const answer = (value: boolean | null | undefined): string =>
  value === true ? "Yes" : value === false ? "No" : "";

function finish(ws: ExcelJS.Worksheet, dateColumns: string[]) {
  ws.eachRow({ includeEmpty: false }, (row, number) => {
    if (number === 1) return;
    row.font = { name: FONT, size: 10 };
    row.alignment = { vertical: "top", wrapText: false };
  });
  for (const key of dateColumns) {
    ws.getColumn(key).numFmt = DATE_FORMAT;
  }
}

export type WorkbookInput = {
  assessments: Assessment[];
  responses: StakeholderResponse[];
  /** Who asked for it and when, which goes on the first sheet. */
  exportedBy: string;
  /** Said plainly on the first sheet, since it changes what is in here. */
  samplesIncluded: boolean;
};

export async function buildWorkbook(input: WorkbookInput): Promise<Uint8Array> {
  const { assessments, responses } = input;
  const book = new ExcelJS.Workbook();
  book.creator = "Rate My Impact";
  book.created = new Date();

  const clientQuestions = questionsFor("client");
  const stakeholderQuestions = questionsFor("stakeholder");
  const sectionTitle = new Map(SECTIONS.map((s) => [s.id, s.title]));

  /* ---------------------------------------------------------------------- */
  /* what this is                                                           */
  /* ---------------------------------------------------------------------- */

  const readme = book.addWorksheet("Read me");
  readme.columns = [{ width: 24 }, { width: 86 }];
  const lines: [string, string][] = [
    ["Rate My Impact", "Everything organisations and their stakeholders have entered."],
    ["Exported", new Date().toLocaleString("en-GB")],
    ["Exported by", input.exportedBy],
    [
      "Sample data",
      input.samplesIncluded
        ? "Included. Rows loaded from the dashboard's sample panel carry Yes in the Sample column."
        : "Left out, because sample data is hidden in the dashboard. Turn that off in Settings to include it.",
    ],
    ["", ""],
    ["Organisations", "One row per assessment: who they are, their score, and where the report got to."],
    [
      "Answers",
      "One row per question answered, with the question text beside it. The long sheet, and the useful one.",
    ],
    ["Stakeholders", "One row per person invited to give an outside view, and whether they did."],
    ["Stakeholder answers", "One row per question answered by a stakeholder."],
    ["Reports", "One row per report written: when, by which model, and whether it was sent."],
    ["", ""],
    [
      "A note on scores",
      "Coverage is the share of weighted questions where a practice exists. Depth is the share where the deeper follow-up practice also exists. The overall score is the mean of the two.",
    ],
    [
      "A note on blanks",
      "An empty answer cell means the question was never answered, which is different from No.",
    ],
  ];
  for (const [label, value] of lines) {
    const row = readme.addRow([label, value]);
    row.font = { name: FONT, size: 10 };
    row.getCell(1).font = { name: FONT, size: 10, bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }
  readme.getRow(1).font = { name: FONT, size: 13, bold: true };

  /* ---------------------------------------------------------------------- */
  /* organisations                                                          */
  /* ---------------------------------------------------------------------- */

  const orgs = sheet(book, "Organisations", [
    { header: "Reference", key: "id", width: 14 },
    { header: "Organisation", key: "organisation", width: 30 },
    { header: "Contact", key: "contact", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Role", key: "role", width: 22 },
    { header: "Sector", key: "sector", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Payment", key: "payment", width: 12 },
    { header: "Tier paid", key: "paidTier", width: 14 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Overall", key: "overall", width: 9 },
    { header: "Coverage", key: "coverage", width: 10 },
    { header: "Depth", key: "depth", width: 9 },
    { header: "Band", key: "band", width: 11 },
    { header: "Questions answered", key: "answered", width: 11 },
    { header: "Stakeholders invited", key: "invited", width: 11 },
    { header: "Stakeholders answered", key: "responded", width: 11 },
    { header: "Report", key: "report", width: 13 },
    { header: "Own logo", key: "logo", width: 10 },
    { header: "Created", key: "created", width: 18 },
    { header: "Submitted", key: "submitted", width: 18 },
    { header: "Sample", key: "sample", width: 9 },
  ]);

  for (const a of assessments) {
    const answered = Object.values(a.answers).filter((v) => v?.base !== null).length;
    orgs.addRow({
      id: a.id,
      organisation: a.profile.organisation,
      contact: a.profile.contactName,
      email: a.profile.email,
      role: a.profile.role,
      sector: a.profile.sector,
      status: a.status,
      payment: a.payment.status,
      paidTier: a.payment.tier ?? "",
      amount: a.payment.amount ?? "",
      currency: a.payment.currency,
      overall: a.score?.overall ?? "",
      coverage: a.score?.coverage ?? "",
      depth: a.score?.depth ?? "",
      band: a.score?.tier ?? "",
      answered,
      invited: a.shares.length,
      responded: a.shares.filter((s) => s.respondedAt).length,
      report: a.report ? (a.report.sentAt ? "Sent" : "Written") : "None",
      logo: a.clientLogo ? "Yes" : "",
      created: when(a.createdAt),
      submitted: when(a.submittedAt),
      sample: a.sample ? "Yes" : "",
    });
  }
  finish(orgs, ["created", "submitted"]);

  /* ---------------------------------------------------------------------- */
  /* their answers, one question per row                                    */
  /* ---------------------------------------------------------------------- */

  const answers = sheet(book, "Answers", [
    { header: "Reference", key: "id", width: 14 },
    { header: "Organisation", key: "organisation", width: 30 },
    { header: "Pillar", key: "pillar", width: 24 },
    { header: "Topic", key: "topic", width: 30 },
    { header: "Question", key: "question", width: 70 },
    { header: "Answer", key: "base", width: 9 },
    { header: "Follow-up question", key: "followUpQuestion", width: 70 },
    { header: "Follow-up answer", key: "followUp", width: 12 },
    { header: "Weight", key: "weight", width: 9 },
    { header: "SDG", key: "sdg", width: 12 },
    { header: "GRI", key: "gri", width: 20 },
    { header: "Sample", key: "sample", width: 9 },
  ]);

  for (const a of assessments) {
    // In question order, not whatever order the answers happen to be stored in,
    // so the sheet reads like the form people filled in.
    for (const q of clientQuestions) {
      const given = a.answers[q.id];
      if (!given || (given.base === null && given.followUp === null)) continue;
      answers.addRow({
        id: a.id,
        organisation: a.profile.organisation,
        pillar: sectionTitle.get(q.section) ?? q.section,
        topic: q.topic,
        question: q.question,
        base: answer(given.base),
        followUpQuestion: q.followUp ?? "",
        followUp: answer(given.followUp),
        weight: Math.round(q.weight * 10000) / 10000,
        sdg: q.sdg ?? "",
        gri: q.gri ?? "",
        sample: a.sample ? "Yes" : "",
      });
    }
  }
  finish(answers, []);

  /* ---------------------------------------------------------------------- */
  /* the people invited                                                     */
  /* ---------------------------------------------------------------------- */

  const parties = sheet(book, "Stakeholders", [
    { header: "Reference", key: "id", width: 14 },
    { header: "Organisation", key: "organisation", width: 30 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 28 },
    { header: "Relationship", key: "relationship", width: 22 },
    { header: "Invited", key: "invited", width: 18 },
    { header: "Answered", key: "answered", width: 18 },
    { header: "Invitation", key: "delivery", width: 13 },
    { header: "Delivery problem", key: "error", width: 40 },
    { header: "Submitter told", key: "notified", width: 18 },
  ]);

  const orgName = new Map(assessments.map((a) => [a.id, a.profile.organisation]));

  for (const a of assessments) {
    for (const s of a.shares) {
      parties.addRow({
        id: a.id,
        organisation: a.profile.organisation,
        name: s.name,
        email: s.email,
        relationship: s.relationship,
        invited: when(s.invitedAt),
        answered: when(s.respondedAt),
        delivery: s.delivery?.status ?? "unknown",
        error: s.delivery?.error ?? "",
        notified: when(s.notifiedAt),
      });
    }
  }
  finish(parties, ["invited", "answered", "notified"]);

  /* ---------------------------------------------------------------------- */
  /* what the stakeholders answered                                         */
  /* ---------------------------------------------------------------------- */

  const theirs = sheet(book, "Stakeholder answers", [
    { header: "Reference", key: "id", width: 14 },
    { header: "Organisation", key: "organisation", width: 30 },
    { header: "Stakeholder", key: "stakeholder", width: 24 },
    { header: "Relationship", key: "relationship", width: 22 },
    { header: "Pillar", key: "pillar", width: 24 },
    { header: "Topic", key: "topic", width: 30 },
    { header: "Question", key: "question", width: 70 },
    { header: "Answer", key: "base", width: 9 },
    { header: "Follow-up answer", key: "followUp", width: 12 },
    { header: "Answered", key: "answered", width: 18 },
  ]);

  for (const r of responses) {
    for (const q of stakeholderQuestions) {
      const given = r.answers[q.id];
      if (!given || (given.base === null && given.followUp === null)) continue;
      theirs.addRow({
        id: r.assessmentId,
        organisation: orgName.get(r.assessmentId) ?? "",
        stakeholder: r.name || r.email,
        relationship: r.relationship,
        pillar: sectionTitle.get(q.section) ?? q.section,
        topic: q.topic,
        question: q.question,
        base: answer(given.base),
        followUp: answer(given.followUp),
        answered: when(r.createdAt),
      });
    }
  }
  finish(theirs, ["answered"]);

  /* ---------------------------------------------------------------------- */
  /* the reports                                                            */
  /* ---------------------------------------------------------------------- */

  const reports = sheet(book, "Reports", [
    { header: "Reference", key: "id", width: 14 },
    { header: "Organisation", key: "organisation", width: 30 },
    { header: "Drafting model", key: "model", width: 30 },
    { header: "Humanised", key: "humanized", width: 11 },
    { header: "Written", key: "generated", width: 18 },
    { header: "Edited", key: "edited", width: 18 },
    { header: "Edited by", key: "editedBy", width: 26 },
    { header: "Sent", key: "sent", width: 18 },
    { header: "Sent by", key: "sentBy", width: 26 },
    { header: "Answers outstanding when sent", key: "outstanding", width: 14 },
    { header: "Valid until", key: "expires", width: 18 },
    { header: "Days left", key: "daysLeft", width: 10 },
    { header: "PDF issued", key: "pdf", width: 11 },
    { header: "Words", key: "words", width: 9 },
    { header: "Sample", key: "sample", width: 9 },
  ]);

  for (const a of assessments) {
    const r = a.report;
    if (!r) continue;
    const left = daysUntilExpiry(r);
    reports.addRow({
      id: a.id,
      organisation: a.profile.organisation,
      model: r.model,
      humanized: r.humanized ? "Yes" : "",
      generated: when(r.generatedAt),
      edited: when(r.editedAt),
      editedBy: r.editedBy ?? "",
      sent: when(r.sentAt),
      sentBy: r.sentBy ?? "",
      outstanding: r.sentOutstanding ?? "",
      expires: when(reportExpiry(r)?.toISOString()),
      daysLeft: left === null ? "" : left,
      pdf: r.pdfPath ? "Yes" : "",
      words: r.markdown.trim().split(/\s+/).filter(Boolean).length,
      sample: a.sample ? "Yes" : "",
    });
  }
  finish(reports, ["generated", "edited", "sent", "expires"]);

  const buffer = await book.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/** What the download is called, dated so two exports do not collide. */
export function workbookFilename(now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `rate-my-impact-${date}.xlsx`;
}
