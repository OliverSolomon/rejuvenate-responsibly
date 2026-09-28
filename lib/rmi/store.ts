import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Answers } from "./scoring";

/**
 * File backed store. Small and boring on purpose, so it can be swapped for
 * Postgres, Supabase or Airtable without any route having to change: keep the
 * exported function signatures and replace the read/write pair below.
 *
 * For deployment: serverless filesystems are wiped between invocations, so
 * point RMI_DATA_DIR at a mounted volume or move to a real database first.
 */

const DATA_DIR = process.env.RMI_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rmi.json");

export type Profile = {
  organisation: string;
  contactName: string;
  email: string;
  role: string;
  sector: string;
};

export type ScoreSummary = {
  overall: number;
  coverage: number;
  depth: number;
  tier: string;
  sections: { id: string; score: number }[];
};

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed";

export type Payment = {
  status: PaymentStatus;
  tier: string | null;
  amount: number | null;
  currency: string;
  merchantReference: string | null;
  orderTrackingId: string | null;
  method: string | null;
  updatedAt: string | null;
};

export type Share = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  token: string;
  invitedAt: string;
  respondedAt: string | null;
};

export type Report = {
  markdown: string;
  model: string;
  generatedAt: string;
};

export type Assessment = {
  /** Short code the person keeps, e.g. RMI-7F3K2Q. */
  id: string;
  /** Secret half of the resume link. The code alone opens nothing. */
  token: string;
  status: "draft" | "submitted";
  profile: Profile;
  answers: Answers;
  score: ScoreSummary | null;
  payment: Payment;
  shares: Share[];
  report: Report | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type StakeholderResponse = {
  id: string;
  assessmentId: string;
  shareToken: string;
  name: string;
  email: string;
  relationship: string;
  answers: Answers;
  score: ScoreSummary;
  createdAt: string;
};

type Db = {
  assessments: Assessment[];
  stakeholderResponses: StakeholderResponse[];
};

const EMPTY: Db = { assessments: [], stakeholderResponses: [] };

async function read(): Promise<Db> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      assessments: parsed.assessments ?? [],
      stakeholderResponses: parsed.stakeholderResponses ?? [],
    };
  } catch {
    return { ...EMPTY };
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
/* ids                                                                        */
/* -------------------------------------------------------------------------- */

// No I, O, 0 or 1: these get read aloud and typed back in by hand.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function shortCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `RMI-${out}`;
}

export function normaliseCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/^RMI-?/, "").replace(/[^0-9A-Z]/g, "");
  return `RMI-${cleaned}`;
}

function secret(): string {
  return randomBytes(24).toString("base64url");
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
      token: secret(),
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
        token: secret(),
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

export async function listStakeholderResponses(
  assessmentId: string,
): Promise<StakeholderResponse[]> {
  const db = await read();
  return db.stakeholderResponses.filter((x) => x.assessmentId === assessmentId);
}
