import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Answers } from "./scoring";
import {
  newSecret,
  shortCode,
  type Assessment,
  type ScoreSummary,
  type InviteDelivery,
  type Payment,
  type Profile,
  type Report,
  type Share,
  type StakeholderResponse,
  type StoredSettings,
} from "./store-types";

/**
 * File backed storage: one JSON file. It is the fallback when Supabase is not
 * configured, and the source for the one-off import into Supabase. See
 * store.ts for which backend is live.
 *
 * Serverless filesystems are wiped between invocations, so on such a host this
 * is only suitable with RMI_DATA_DIR on a mounted volume.
 */

const DATA_DIR = process.env.RMI_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rmi.json");

type Db = {
  assessments: Assessment[];
  stakeholderResponses: StakeholderResponse[];
  settings: StoredSettings;
};

async function read(): Promise<Db> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      assessments: parsed.assessments ?? [],
      stakeholderResponses: parsed.stakeholderResponses ?? [],
      settings: parsed.settings ?? {},
    };
  } catch {
    return { assessments: [], stakeholderResponses: [], settings: {} };
  }
}

async function persist(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write beside the real file and move it into place, so a crash mid-write
  // cannot leave a half-written database behind.
  const tmp = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, FILE);
}

/**
 * Serialises every mutation through one promise chain. Two requests landing at
 * the same moment would otherwise each read, then each write, and the second
 * would silently drop the first one's changes.
 */
let queue: Promise<unknown> = Promise.resolve();

function transact<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const out = await fn(db);
    await persist(db);
    return out;
  });
  queue = run.catch(() => undefined);
  return run;
}

/* -------------------------------------------------------------------------- */
/* assessments                                                                */
/* -------------------------------------------------------------------------- */

export async function createAssessment(profile: Profile): Promise<Assessment> {
  return transact((db) => {
    let id = shortCode();
    while (db.assessments.some((x) => x.id === id)) id = shortCode();

    const now = new Date().toISOString();
    const record: Assessment = {
      id,
      token: newSecret(),
      status: "draft",
      profile,
      answers: {},
      score: null,
      payment: {
        status: "unpaid",
        tier: null,
        amount: null,
        currency: "KES",
        merchantReference: null,
        orderTrackingId: null,
        method: null,
        updatedAt: null,
      },
      shares: [],
      report: null,
      createdAt: now,
      updatedAt: now,
      submittedAt: null,
    };
    db.assessments.push(record);
    return record;
  });
}

export async function getAssessment(
  id: string,
  token?: string,
): Promise<Assessment | undefined> {
  const db = await read();
  const found = db.assessments.find((x) => x.id === id);
  if (!found) return undefined;
  if (token !== undefined && found.token !== token) return undefined;
  return found;
}

export async function updateAssessment(
  id: string,
  token: string,
  patch: Partial<Pick<Assessment, "profile" | "answers" | "score" | "status" | "submittedAt">>,
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id && x.token === token);
    if (!found) return undefined;
    Object.assign(found, patch, { updatedAt: new Date().toISOString() });
    return found;
  });
}

export async function clearAnswers(id: string, token: string): Promise<boolean> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id && x.token === token);
    if (!found) return false;
    found.answers = {};
    found.score = null;
    found.status = "draft";
    found.submittedAt = null;
    found.report = null;
    found.updatedAt = new Date().toISOString();
    return true;
  });
}

export async function setPayment(
  id: string,
  patch: Partial<Payment>,
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found) return undefined;
    found.payment = {
      ...found.payment,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    found.updatedAt = new Date().toISOString();
    return found;
  });
}

export async function findByMerchantReference(
  reference: string,
): Promise<Assessment | undefined> {
  const db = await read();
  return db.assessments.find((x) => x.payment.merchantReference === reference);
}

export async function setReport(id: string, report: Report): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found) return undefined;
    found.report = report;
    found.updatedAt = new Date().toISOString();
    return found;
  });
}

export async function markReportSent(
  id: string,
  by: string,
  outstanding: number,
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found?.report) return undefined;
    const now = new Date().toISOString();
    found.report = { ...found.report, sentAt: now, sentBy: by, sentOutstanding: outstanding };
    found.updatedAt = now;
    return found;
  });
}

/**
 * Replace the wording of a report an admin has edited. The model's original
 * text is moved aside on the first edit and never overwritten after that, so
 * there is always a way back to what was actually generated.
 */
export async function editReport(
  id: string,
  markdown: string,
  editedBy: string,
  // Only the Supabase backend records the editor's user id.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _editedById?: string,
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found?.report) return undefined;
    const now = new Date().toISOString();
    found.report = {
      ...found.report,
      generatedMarkdown: found.report.generatedMarkdown ?? found.report.markdown,
      markdown,
      editedAt: now,
      editedBy,
    };
    found.updatedAt = now;
    return found;
  });
}

/* -------------------------------------------------------------------------- */
/* sharing                                                                    */
/* -------------------------------------------------------------------------- */

export async function addShares(
  id: string,
  token: string,
  people: { name: string; email: string; relationship: string }[],
): Promise<Share[] | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id && x.token === token);
    if (!found) return undefined;

    const now = new Date().toISOString();
    const existing = new Set(found.shares.map((s) => s.email.toLowerCase()));
    const created: Share[] = [];

    for (const person of people) {
      const email = person.email.trim().toLowerCase();
      if (existing.has(email)) continue;
      existing.add(email);
      const share: Share = {
        id: randomUUID(),
        name: person.name.trim(),
        email,
        relationship: person.relationship.trim(),
        token: newSecret(),
        invitedAt: now,
        respondedAt: null,
      };
      found.shares.push(share);
      created.push(share);
    }

    found.updatedAt = now;
    return created;
  });
}

export async function recordDeliveries(
  id: string,
  results: { token: string; delivery: InviteDelivery }[],
): Promise<void> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found) return;
    for (const r of results) {
      const share = found.shares.find((s) => s.token === r.token);
      if (share) share.delivery = r.delivery;
    }
  });
}

export async function markSharesNotified(
  id: string,
  tokens: string[],
  by: string,
): Promise<void> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found) return;
    const now = new Date().toISOString();
    for (const share of found.shares) {
      if (tokens.includes(share.token)) {
        share.notifiedAt = now;
        share.notifiedBy = by;
      }
    }
  });
}

export async function findShare(
  token: string,
): Promise<{ assessment: Assessment; share: Share } | undefined> {
  const db = await read();
  for (const assessment of db.assessments) {
    const share = assessment.shares.find((s) => s.token === token);
    if (share) return { assessment, share };
  }
  return undefined;
}

export async function saveStakeholderResponse(input: {
  assessmentId: string;
  shareToken: string;
  name: string;
  email: string;
  relationship: string;
  answers: Answers;
  score: ScoreSummary;
}): Promise<StakeholderResponse> {
  return transact((db) => {
    const record: StakeholderResponse = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    db.stakeholderResponses.push(record);

    const assessment = db.assessments.find((x) => x.id === input.assessmentId);
    const share = assessment?.shares.find((s) => s.token === input.shareToken);
    if (share) share.respondedAt = record.createdAt;

    return record;
  });
}

/* -------------------------------------------------------------------------- */
/* settings and sample data                                                   */
/* -------------------------------------------------------------------------- */

export async function readSettings(): Promise<StoredSettings> {
  return (await read()).settings;
}

/** Apply a change to the stored settings and return what is saved. */
export async function changeSettings(
  fn: (current: StoredSettings) => StoredSettings,
): Promise<StoredSettings> {
  return transact((db) => {
    db.settings = fn(db.settings);
    return db.settings;
  });
}

/** Replace any earlier sample set with a fresh one. Real records are untouched. */
export async function replaceSamples(
  assessments: Assessment[],
  responses: StakeholderResponse[],
): Promise<void> {
  return transact((db) => {
    db.assessments = db.assessments.filter((a) => !a.sample);
    db.stakeholderResponses = db.stakeholderResponses.filter((r) => !r.sample);
    db.assessments.push(...assessments);
    db.stakeholderResponses.push(...responses);
  });
}

export async function removeSamples(): Promise<{ assessments: number; responses: number }> {
  return transact((db) => {
    const before = { assessments: db.assessments.length, responses: db.stakeholderResponses.length };
    db.assessments = db.assessments.filter((a) => !a.sample);
    db.stakeholderResponses = db.stakeholderResponses.filter((r) => !r.sample);
    return {
      assessments: before.assessments - db.assessments.length,
      responses: before.responses - db.stakeholderResponses.length,
    };
  });
}

export async function countSamples(): Promise<{ assessments: number; responses: number }> {
  const db = await read();
  return {
    assessments: db.assessments.filter((a) => a.sample).length,
    responses: db.stakeholderResponses.filter((r) => r.sample).length,
  };
}

/** Every assessment, newest first. Used by the dashboard list. */
export async function listAssessments(): Promise<Assessment[]> {
  const db = await read();
  return [...db.assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Every stakeholder response across all assessments, for the analytics view. */
export async function listAllStakeholderResponses(): Promise<StakeholderResponse[]> {
  const db = await read();
  return db.stakeholderResponses;
}

export async function listStakeholderResponses(
  assessmentId: string,
): Promise<StakeholderResponse[]> {
  const db = await read();
  return db.stakeholderResponses.filter((x) => x.assessmentId === assessmentId);
}

/* -------------------------------------------------------------------------- */
/* legacy file, for the one-off import into Supabase                          */
/* -------------------------------------------------------------------------- */

export type LegacyData = {
  assessments: Assessment[];
  stakeholderResponses: StakeholderResponse[];
  settings: StoredSettings;
};

/** Everything in the JSON file, untouched. The file is never modified by an import. */
export async function readLegacy(): Promise<LegacyData> {
  return read();
}

export const LEGACY_FILE = FILE;
