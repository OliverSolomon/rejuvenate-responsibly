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
  type Company,
  type Report,
  type ReportTemplate,
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

/** Mirrors the default company in the migration. */
const DEFAULT_COMPANY = "default";

const DATA_DIR = process.env.RMI_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rmi.json");

type Db = {
  assessments: Assessment[];
  stakeholderResponses: StakeholderResponse[];
  /** The default company's settings, which is all a single file install has. */
  settings: StoredSettings;
  template?: ReportTemplate;
  /**
   * Other companies' settings and templates, keyed by company. The default
   * company keeps the two fields above so an existing file still reads.
   */
  companySettings?: Record<string, StoredSettings>;
  companyTemplates?: Record<string, ReportTemplate>;
  companies?: Company[];
};

async function read(): Promise<Db> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Db>;
    return {
      assessments: parsed.assessments ?? [],
      stakeholderResponses: parsed.stakeholderResponses ?? [],
      settings: parsed.settings ?? {},
      ...(parsed.template ? { template: parsed.template } : {}),
      ...(parsed.companySettings ? { companySettings: parsed.companySettings } : {}),
      ...(parsed.companyTemplates ? { companyTemplates: parsed.companyTemplates } : {}),
      ...(parsed.companies ? { companies: parsed.companies } : {}),
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

export async function createAssessment(
  profile: Profile,
  companyId = DEFAULT_COMPANY,
): Promise<Assessment> {
  return transact((db) => {
    let id = shortCode();
    while (db.assessments.some((x) => x.id === id)) id = shortCode();

    const now = new Date().toISOString();
    const record: Assessment = {
      id,
      companyId,
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

export async function readSettings(companyId = DEFAULT_COMPANY): Promise<StoredSettings> {
  const db = await read();
  if (companyId === DEFAULT_COMPANY) return db.settings;
  return db.companySettings?.[companyId] ?? {};
}

/** Apply a change to one company's settings and return what is saved. */
export async function changeSettings(
  fn: (current: StoredSettings) => StoredSettings,
  companyId = DEFAULT_COMPANY,
): Promise<StoredSettings> {
  return transact((db) => {
    if (companyId === DEFAULT_COMPANY) {
      db.settings = fn(db.settings);
      return db.settings;
    }
    const next = fn(db.companySettings?.[companyId] ?? {});
    db.companySettings = { ...db.companySettings, [companyId]: next };
    return next;
  });
}

/* -------------------------------------------------------------------------- */
/* companies                                                                  */
/* -------------------------------------------------------------------------- */

/** The firm that owns the installation, present even in an empty file. */
const DEFAULT_COMPANY_ROW: Company = {
  id: DEFAULT_COMPANY,
  slug: "rejuvenate",
  name: "Rejuvenate Responsibly",
  isDefault: true,
  active: true,
  createdAt: new Date(0).toISOString(),
};

function allCompanies(db: Db): Company[] {
  const stored = db.companies ?? [];
  return stored.some((c) => c.id === DEFAULT_COMPANY)
    ? stored
    : [DEFAULT_COMPANY_ROW, ...stored];
}

export async function listCompanies(): Promise<Company[]> {
  const companies = allCompanies(await read());
  return [...companies].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name),
  );
}

export async function companyById(id: string): Promise<Company | undefined> {
  return (await listCompanies()).find((c) => c.id === id);
}

export async function companyBySlug(slug: string): Promise<Company | undefined> {
  return (await listCompanies()).find((c) => c.slug === slug);
}

export async function createCompany(input: {
  id: string;
  slug: string;
  name: string;
  createdBy: string;
}): Promise<Company | undefined> {
  return transact((db) => {
    const companies = allCompanies(db);
    if (companies.some((c) => c.id === input.id || c.slug === input.slug)) return undefined;
    const company: Company = {
      id: input.id,
      slug: input.slug,
      name: input.name,
      isDefault: false,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };
    db.companies = [...companies, company];
    return company;
  });
}

export async function updateCompany(
  id: string,
  patch: { name?: string; slug?: string; active?: boolean },
): Promise<Company | undefined> {
  return transact((db) => {
    const companies = allCompanies(db);
    const found = companies.find((c) => c.id === id);
    if (!found) return undefined;
    if (patch.slug && companies.some((c) => c.slug === patch.slug && c.id !== id)) {
      return undefined;
    }
    const next: Company = {
      ...found,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    };
    db.companies = companies.map((c) => (c.id === id ? next : c));
    return next;
  });
}

/* -------------------------------------------------------------------------- */
/* the report template                                                        */
/* -------------------------------------------------------------------------- */

export async function readTemplate(companyId = DEFAULT_COMPANY): Promise<ReportTemplate> {
  const db = await read();
  if (companyId === DEFAULT_COMPANY) return db.template ?? { version: 0 };
  return db.companyTemplates?.[companyId] ?? { version: 0 };
}

/** One place that reads and writes whichever company's template is wanted. */
function templateOf(db: Db, companyId: string): ReportTemplate {
  return companyId === DEFAULT_COMPANY
    ? (db.template ?? { version: 0 })
    : (db.companyTemplates?.[companyId] ?? { version: 0 });
}

function putTemplate(db: Db, companyId: string, next: ReportTemplate): ReportTemplate {
  if (companyId === DEFAULT_COMPANY) db.template = next;
  else db.companyTemplates = { ...db.companyTemplates, [companyId]: next };
  return next;
}

export async function saveTemplateDraft(
  html: string,
  doc: string | null,
  by: string,
  companyId = DEFAULT_COMPANY,
): Promise<ReportTemplate> {
  return transact((db) => {
    const current = templateOf(db, companyId);
    return putTemplate(db, companyId, {
      ...current,
      draft: {
        html,
        at: new Date().toISOString(),
        ...(doc ? { doc } : {}),
        ...(by ? { by } : {}),
      },
    });
  });
}

/** Move the draft into place as the live template and bump the version. */
export async function publishTemplate(
  by: string,
  companyId = DEFAULT_COMPANY,
): Promise<ReportTemplate | undefined> {
  return transact((db) => {
    const current = templateOf(db, companyId);
    if (!current.draft) return undefined;
    return putTemplate(db, companyId, {
      version: current.version + 1,
      draft: current.draft,
      published: {
        html: current.draft.html,
        at: new Date().toISOString(),
        ...(current.draft.doc ? { doc: current.draft.doc } : {}),
        ...(by ? { by } : {}),
      },
    });
  });
}

/** Throw the draft away. What is published keeps serving reports. */
export async function discardTemplateDraft(
  companyId = DEFAULT_COMPANY,
): Promise<ReportTemplate> {
  return transact((db) => {
    const current = templateOf(db, companyId);
    const next: ReportTemplate = { version: current.version };
    if (current.published) next.published = current.published;
    return putTemplate(db, companyId, next);
  });
}

/* -------------------------------------------------------------------------- */
/* the issued PDF and the organisation's logo                                 */
/* -------------------------------------------------------------------------- */

export async function setReportPdf(
  id: string,
  pdf: { path: string; size: number; templateVersion?: number },
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id);
    if (!found?.report) return undefined;
    const now = new Date().toISOString();
    found.report = {
      ...found.report,
      pdfPath: pdf.path,
      pdfSize: pdf.size,
      pdfAt: now,
      ...(pdf.templateVersion != null ? { templateVersion: pdf.templateVersion } : {}),
    };
    found.updatedAt = now;
    return found;
  });
}

export async function setClientLogo(
  id: string,
  token: string,
  logoPath: string | null,
): Promise<Assessment | undefined> {
  return transact((db) => {
    const found = db.assessments.find((x) => x.id === id && x.token === token);
    if (!found) return undefined;
    if (logoPath) found.clientLogo = logoPath;
    else delete found.clientLogo;
    found.updatedAt = new Date().toISOString();
    return found;
  });
}

/** Replace any earlier sample set with a fresh one. Real records are untouched. */
/** Whether a sample assessment is one of the given companies', or any when none are named. */
const inCompanies = (a: Assessment, companyIds?: string[]) =>
  Boolean(a.sample) && (!companyIds || companyIds.includes(a.companyId || DEFAULT_COMPANY));

/**
 * Swap the sample set for the named companies' for a fresh one. Another
 * company's samples and every real record are left exactly as they were.
 */
export async function replaceSamples(
  assessments: Assessment[],
  responses: StakeholderResponse[],
  companyIds?: string[],
): Promise<void> {
  return transact((db) => {
    const gone = new Set(db.assessments.filter((a) => inCompanies(a, companyIds)).map((a) => a.id));
    db.assessments = db.assessments.filter((a) => !gone.has(a.id));
    db.stakeholderResponses = db.stakeholderResponses.filter((r) => !gone.has(r.assessmentId));
    db.assessments.push(...assessments);
    db.stakeholderResponses.push(...responses);
  });
}

export async function removeSamples(
  companyIds?: string[],
): Promise<{ assessments: number; responses: number }> {
  return transact((db) => {
    const gone = new Set(db.assessments.filter((a) => inCompanies(a, companyIds)).map((a) => a.id));
    const before = { assessments: db.assessments.length, responses: db.stakeholderResponses.length };
    db.assessments = db.assessments.filter((a) => !gone.has(a.id));
    db.stakeholderResponses = db.stakeholderResponses.filter((r) => !gone.has(r.assessmentId));
    return {
      assessments: before.assessments - db.assessments.length,
      responses: before.responses - db.stakeholderResponses.length,
    };
  });
}

export async function countSamples(
  companyIds?: string[],
): Promise<{ assessments: number; responses: number }> {
  const db = await read();
  const ours = new Set(db.assessments.filter((a) => inCompanies(a, companyIds)).map((a) => a.id));
  return {
    assessments: ours.size,
    responses: db.stakeholderResponses.filter((r) => ours.has(r.assessmentId)).length,
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
