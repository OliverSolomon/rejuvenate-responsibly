import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { newSecret, shortCode } from "./store-types";
import type {
  Answers,
} from "./scoring";
import type {
  Assessment,
  Company,
  InviteDelivery,
  Payment,
  PaymentStatus,
  Profile,
  Report,
  ReportTemplate,
  ScoreSummary,
  Share,
  StakeholderResponse,
  StoredSettings,
} from "./store-types";
import type { LegacyData } from "./store-file";

/**
 * Supabase backed storage. Same function names and signatures as store-file.ts,
 * so nothing outside store.ts knows which one is live.
 *
 * It writes with the service role key, which bypasses row level security. That
 * key must stay on the server: it is read from SUPABASE_SERVICE_ROLE_KEY, never
 * a NEXT_PUBLIC_ variable, and this module is marked server-only.
 *
 * Tables are the ones in supabase/migrations/0001 to 0003.
 */

/* -------------------------------------------------------------------------- */
/* client and errors                                                          */
/* -------------------------------------------------------------------------- */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export class StorageError extends Error {}

type PgError = { message: string; code?: string; details?: string | null } | null;

const MIGRATION_HINT =
  " The database is missing part of supabase/migrations/0002_storage_on_supabase.sql; run it in the SQL editor.";

function fail(op: string, error: NonNullable<PgError>): never {
  const stale =
    error.code === "42703" || // undefined column
    error.code === "42P01" || // undefined table
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /schema cache|does not exist|invalid input value for enum/i.test(error.message);
  // A bad value (for example a malformed id) is a bug, not a missing migration,
  // so it is reported as itself rather than sending someone to the SQL editor.
  throw new StorageError(`Supabase ${op} failed: ${error.message}.${stale ? MIGRATION_HINT : ""}`);
}

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/* -------------------------------------------------------------------------- */
/* row shapes and mapping                                                     */
/* -------------------------------------------------------------------------- */

type ShareRow = {
  id: string;
  assessment_id: string;
  name: string;
  email: string;
  relationship: string;
  token: string;
  invited_at: string;
  responded_at: string | null;
  delivery_status: "sent" | "failed" | "not_sent" | null;
  delivery_error: string | null;
  delivery_at: string | null;
  notified_at: string | null;
  notified_by: string | null;
};

type ReportRow = {
  assessment_id: string;
  status: string;
  markdown: string;
  generated_markdown: string | null;
  model: string | null;
  generated_at: string;
  edited_at: string | null;
  edited_by_email: string | null;
  humanized: boolean | null;
  humanizer_model: string | null;
  sent_at: string | null;
  sent_by: string | null;
  sent_outstanding: number | null;
  pdf_path: string | null;
  pdf_size: number | null;
  pdf_at: string | null;
  template_version: number | null;
};

type AssessmentRow = {
  id: string;
  token: string;
  status: "draft" | "submitted";
  organisation: string;
  contact_name: string;
  email: string;
  role: string;
  sector: string;
  answers: Answers;
  score: ScoreSummary | null;
  payment_status: PaymentStatus;
  payment_tier: string | null;
  payment_amount: number | string | null;
  payment_currency: string;
  merchant_reference: string | null;
  order_tracking_id: string | null;
  payment_method: string | null;
  payment_updated_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  sample: boolean;
  company_id: string;
  client_logo: string | null;
  rmi_shares?: ShareRow[] | null;
  rmi_reports?: ReportRow | ReportRow[] | null;
};

const ASSESSMENT_SELECT = "*, rmi_shares(*), rmi_reports(*)";

function toShare(r: ShareRow): Share {
  const share: Share = {
    id: r.id,
    name: r.name,
    email: r.email,
    relationship: r.relationship,
    token: r.token,
    invitedAt: r.invited_at,
    respondedAt: r.responded_at,
  };
  if (r.delivery_status) {
    share.delivery = {
      status: r.delivery_status,
      ...(r.delivery_error ? { error: r.delivery_error } : {}),
      at: r.delivery_at ?? r.invited_at,
    };
  }
  if (r.notified_at) share.notifiedAt = r.notified_at;
  if (r.notified_by) share.notifiedBy = r.notified_by;
  return share;
}

function toReport(r: ReportRow): Report {
  const edited = Boolean(r.edited_at);
  const report: Report = {
    markdown: r.markdown,
    model: r.model ?? "",
    generatedAt: r.generated_at,
  };
  // The original is only surfaced once an edit exists, as in the file store.
  if (edited && r.generated_markdown) report.generatedMarkdown = r.generated_markdown;
  if (r.edited_at) report.editedAt = r.edited_at;
  if (r.edited_by_email) report.editedBy = r.edited_by_email;
  if (r.humanized) report.humanized = true;
  if (r.humanizer_model) report.humanizerModel = r.humanizer_model;
  if (r.sent_at) {
    report.sentAt = r.sent_at;
    if (r.sent_by) report.sentBy = r.sent_by;
    if (r.sent_outstanding != null) report.sentOutstanding = r.sent_outstanding;
  }
  if (r.pdf_path) {
    report.pdfPath = r.pdf_path;
    if (r.pdf_size != null) report.pdfSize = r.pdf_size;
    if (r.pdf_at) report.pdfAt = r.pdf_at;
  }
  if (r.template_version != null) report.templateVersion = r.template_version;
  return report;
}

function toAssessment(r: AssessmentRow): Assessment {
  const reportRow = Array.isArray(r.rmi_reports) ? r.rmi_reports[0] : r.rmi_reports;
  const a: Assessment = {
    id: r.id,
    companyId: r.company_id || "default",
    token: r.token,
    status: r.status,
    profile: {
      organisation: r.organisation,
      contactName: r.contact_name,
      email: r.email,
      role: r.role,
      sector: r.sector,
    },
    answers: r.answers ?? {},
    score: r.score ?? null,
    payment: {
      status: r.payment_status,
      tier: r.payment_tier,
      amount: r.payment_amount == null ? null : Number(r.payment_amount),
      currency: r.payment_currency,
      merchantReference: r.merchant_reference,
      orderTrackingId: r.order_tracking_id,
      method: r.payment_method,
      updatedAt: r.payment_updated_at,
    },
    shares: (r.rmi_shares ?? [])
      .map(toShare)
      .sort((x, y) => x.invitedAt.localeCompare(y.invitedAt) || x.email.localeCompare(y.email)),
    report: reportRow ? toReport(reportRow) : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    submittedAt: r.submitted_at,
  };
  if (r.sample) a.sample = true;
  if (r.client_logo) a.clientLogo = r.client_logo;
  return a;
}

function assessmentRow(a: Assessment) {
  return {
    id: a.id,
    token: a.token,
    status: a.status,
    organisation: a.profile.organisation,
    contact_name: a.profile.contactName,
    email: a.profile.email,
    role: a.profile.role,
    sector: a.profile.sector,
    answers: a.answers,
    score: a.score,
    payment_status: a.payment.status,
    payment_tier: a.payment.tier,
    payment_amount: a.payment.amount,
    payment_currency: a.payment.currency,
    merchant_reference: a.payment.merchantReference,
    order_tracking_id: a.payment.orderTrackingId,
    payment_method: a.payment.method,
    payment_updated_at: a.payment.updatedAt,
    paid_at: a.payment.status === "paid" ? (a.payment.updatedAt ?? a.updatedAt) : null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
    submitted_at: a.submittedAt,
    sample: Boolean(a.sample),
    company_id: a.companyId || "default",
    client_logo: a.clientLogo ?? null,
  };
}

function shareRow(assessmentId: string, s: Share) {
  return {
    id: s.id,
    assessment_id: assessmentId,
    name: s.name,
    email: s.email,
    relationship: s.relationship,
    token: s.token,
    invited_at: s.invitedAt,
    responded_at: s.respondedAt,
    delivery_status: s.delivery?.status ?? null,
    delivery_error: s.delivery?.error ?? null,
    delivery_at: s.delivery?.at ?? null,
    notified_at: s.notifiedAt ?? null,
    notified_by: s.notifiedBy ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reportRow(assessmentId: string, r: Report) {
  return {
    assessment_id: assessmentId,
    status: r.editedAt ? "issued" : "draft",
    markdown: r.markdown,
    // Always keep the original, so an edit can never destroy it.
    generated_markdown: r.generatedMarkdown ?? r.markdown,
    model: r.model,
    generated_at: r.generatedAt,
    edited_at: r.editedAt ?? null,
    edited_by_email: r.editedBy ?? null,
    issued_at: r.editedAt ?? null,
    humanized: Boolean(r.humanized),
    humanizer_model: r.humanizerModel ?? null,
    sent_at: r.sentAt ?? null,
    sent_by: r.sentBy ?? null,
    sent_outstanding: r.sentOutstanding ?? null,
    pdf_path: r.pdfPath ?? null,
    pdf_size: r.pdfSize ?? null,
    pdf_at: r.pdfAt ?? null,
    template_version: r.templateVersion ?? null,
  };
}

/** Read every row of a query, past PostgREST's per-request row cap. */
async function pageAll<T>(
  op: string,
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PgError }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) fail(op, error);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

async function insertChunks(op: string, table: string, rows: object[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db().from(table).insert(rows.slice(i, i + 100));
    if (error) fail(op, error);
  }
}

/* -------------------------------------------------------------------------- */
/* assessments                                                                */
/* -------------------------------------------------------------------------- */

export async function createAssessment(
  profile: Profile,
  companyId = "default",
): Promise<Assessment> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await db()
      .from("rmi_assessments")
      .insert({
        id: shortCode(),
        company_id: companyId,
        token: newSecret(),
        organisation: profile.organisation,
        contact_name: profile.contactName,
        email: profile.email,
        role: profile.role,
        sector: profile.sector,
      })
      .select(ASSESSMENT_SELECT)
      .single();

    if (!error) return toAssessment(data as AssessmentRow);
    if (error.code !== UNIQUE_VIOLATION) fail("create assessment", error);
    // Reference already taken: draw another.
  }
  throw new StorageError("Could not find a free assessment reference.");
}

export async function getAssessment(id: string, token?: string): Promise<Assessment | undefined> {
  let query = db().from("rmi_assessments").select(ASSESSMENT_SELECT).eq("id", id);
  if (token !== undefined) query = query.eq("token", token);
  const { data, error } = await query.maybeSingle();
  if (error) fail("read assessment", error);
  return data ? toAssessment(data as AssessmentRow) : undefined;
}

export async function updateAssessment(
  id: string,
  token: string,
  patch: Partial<Pick<Assessment, "profile" | "answers" | "score" | "status" | "submittedAt">>,
): Promise<Assessment | undefined> {
  const row: Record<string, unknown> = {};
  if (patch.profile) {
    row.organisation = patch.profile.organisation;
    row.contact_name = patch.profile.contactName;
    row.email = patch.profile.email;
    row.role = patch.profile.role;
    row.sector = patch.profile.sector;
  }
  if (patch.answers) row.answers = patch.answers;
  if (patch.score !== undefined) row.score = patch.score;
  if (patch.status) row.status = patch.status;
  if (patch.submittedAt !== undefined) row.submitted_at = patch.submittedAt;

  if (Object.keys(row).length === 0) return getAssessment(id, token);

  const { data, error } = await db()
    .from("rmi_assessments")
    .update(row)
    .eq("id", id)
    .eq("token", token)
    .select(ASSESSMENT_SELECT)
    .maybeSingle();
  if (error) fail("update assessment", error);
  return data ? toAssessment(data as AssessmentRow) : undefined;
}

export async function clearAnswers(id: string, token: string): Promise<boolean> {
  const { data, error } = await db()
    .from("rmi_assessments")
    .update({ answers: {}, score: null, status: "draft", submitted_at: null })
    .eq("id", id)
    .eq("token", token)
    .select("id");
  if (error) fail("clear answers", error);
  if (!data || data.length === 0) return false;

  const removed = await db().from("rmi_reports").delete().eq("assessment_id", id);
  if (removed.error) fail("clear report", removed.error);
  return true;
}

export async function setPayment(
  id: string,
  patch: Partial<Payment>,
): Promise<Assessment | undefined> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = { payment_updated_at: now };
  if (patch.status !== undefined) row.payment_status = patch.status;
  if (patch.tier !== undefined) row.payment_tier = patch.tier;
  if (patch.amount !== undefined) row.payment_amount = patch.amount;
  if (patch.currency !== undefined) row.payment_currency = patch.currency;
  if (patch.merchantReference !== undefined) row.merchant_reference = patch.merchantReference;
  if (patch.orderTrackingId !== undefined) row.order_tracking_id = patch.orderTrackingId;
  if (patch.method !== undefined) row.payment_method = patch.method;

  if (patch.status === "paid") {
    // The gateway can confirm the same payment more than once; keep the first.
    const current = await db().from("rmi_assessments").select("paid_at").eq("id", id).maybeSingle();
    if (current.error) fail("read payment", current.error);
    if (!current.data) return undefined;
    if (!current.data.paid_at) row.paid_at = now;
  }

  const { data, error } = await db()
    .from("rmi_assessments")
    .update(row)
    .eq("id", id)
    .select(ASSESSMENT_SELECT)
    .maybeSingle();
  if (error) fail("update payment", error);
  return data ? toAssessment(data as AssessmentRow) : undefined;
}

export async function findByMerchantReference(
  reference: string,
): Promise<Assessment | undefined> {
  const { data, error } = await db()
    .from("rmi_assessments")
    .select(ASSESSMENT_SELECT)
    .eq("merchant_reference", reference)
    .maybeSingle();
  if (error) fail("find payment", error);
  return data ? toAssessment(data as AssessmentRow) : undefined;
}

/* -------------------------------------------------------------------------- */
/* reports                                                                    */
/* -------------------------------------------------------------------------- */

export async function setReport(id: string, report: Report): Promise<Assessment | undefined> {
  const { error } = await db()
    .from("rmi_reports")
    .upsert(reportRow(id, report), { onConflict: "assessment_id" });
  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) return undefined;
    fail("save report", error);
  }
  return getAssessment(id);
}

export async function editReport(
  id: string,
  markdown: string,
  editedBy: string,
  editedById?: string,
): Promise<Assessment | undefined> {
  const now = new Date().toISOString();
  const by = editedById && UUID.test(editedById) ? editedById : null;

  // generated_markdown is deliberately not touched: it is the original.
  const { data, error } = await db()
    .from("rmi_reports")
    .update({
      markdown,
      status: "issued",
      edited_at: now,
      edited_by: by,
      edited_by_email: editedBy,
      issued_at: now,
      issued_by: by,
    })
    .eq("assessment_id", id)
    .select("assessment_id");
  if (error) fail("edit report", error);
  if (!data || data.length === 0) return undefined;
  return getAssessment(id);
}

export async function markReportSent(
  id: string,
  by: string,
  outstanding: number,
): Promise<Assessment | undefined> {
  const { data, error } = await db()
    .from("rmi_reports")
    .update({ sent_at: new Date().toISOString(), sent_by: by, sent_outstanding: outstanding })
    .eq("assessment_id", id)
    .select("assessment_id");
  if (error) fail("mark report sent", error);
  if (!data || data.length === 0) return undefined;
  return getAssessment(id);
}

/**
 * Record the PDF that was issued, and which template built it.
 *
 * Kept separate from markReportSent because the file is uploaded by the browser
 * that rendered it, which is a different request from the one that sends the
 * email.
 */
export async function setReportPdf(
  id: string,
  pdf: { path: string; size: number; templateVersion?: number },
): Promise<Assessment | undefined> {
  const { data, error } = await db()
    .from("rmi_reports")
    .update({
      pdf_path: pdf.path,
      pdf_size: pdf.size,
      pdf_at: new Date().toISOString(),
      template_version: pdf.templateVersion ?? null,
    })
    .eq("assessment_id", id)
    .select("assessment_id");
  if (error) fail("save report pdf", error);
  if (!data || data.length === 0) return undefined;
  return getAssessment(id);
}

/** The logo an organisation added to its own assessment. */
export async function setClientLogo(
  id: string,
  token: string,
  logoPath: string | null,
): Promise<Assessment | undefined> {
  const { data, error } = await db()
    .from("rmi_assessments")
    .update({ client_logo: logoPath, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("token", token)
    .select("id");
  if (error) fail("save client logo", error);
  if (!data || data.length === 0) return undefined;
  return getAssessment(id);
}

/* -------------------------------------------------------------------------- */
/* companies                                                                  */
/* -------------------------------------------------------------------------- */

type CompanyRow = {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  created_by: string | null;
};

function toCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    isDefault: r.is_default,
    active: r.active,
    createdAt: r.created_at,
    ...(r.created_by ? { createdBy: r.created_by } : {}),
  };
}

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await db()
    .from("rmi_companies")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (error) fail("read companies", error);
  return (data as CompanyRow[]).map(toCompany);
}

export async function createCompany(input: {
  id: string;
  slug: string;
  name: string;
  createdBy: string;
}): Promise<Company | undefined> {
  const { data, error } = await db()
    .from("rmi_companies")
    .insert({
      id: input.id,
      slug: input.slug,
      name: input.name,
      created_by: input.createdBy,
    })
    .select("*")
    .single();
  // A taken id or slug is the caller's problem to report, not a failure here.
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return undefined;
    fail("create company", error);
  }
  return toCompany(data as CompanyRow);
}

export async function updateCompany(
  id: string,
  patch: { name?: string; slug?: string; active?: boolean },
): Promise<Company | undefined> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.active !== undefined) row.active = patch.active;
  if (Object.keys(row).length === 0) return companyById(id);

  const { data, error } = await db()
    .from("rmi_companies")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return undefined;
    fail("update company", error);
  }
  return data ? toCompany(data as CompanyRow) : undefined;
}

export async function companyById(id: string): Promise<Company | undefined> {
  const { data, error } = await db()
    .from("rmi_companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail("read company", error);
  return data ? toCompany(data as CompanyRow) : undefined;
}

export async function companyBySlug(slug: string): Promise<Company | undefined> {
  const { data, error } = await db()
    .from("rmi_companies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail("read company", error);
  return data ? toCompany(data as CompanyRow) : undefined;
}

/* -------------------------------------------------------------------------- */
/* the report template                                                        */
/* -------------------------------------------------------------------------- */

type TemplateRow = {
  draft_html: string | null;
  draft_doc: string | null;
  draft_updated_at: string | null;
  draft_updated_by: string | null;
  published_html: string | null;
  published_doc: string | null;
  published_at: string | null;
  published_by: string | null;
  version: number;
};

function toTemplate(r: TemplateRow | null): ReportTemplate {
  const template: ReportTemplate = { version: r?.version ?? 0 };
  if (r?.draft_html != null && r.draft_updated_at) {
    template.draft = {
      html: r.draft_html,
      at: r.draft_updated_at,
      ...(r.draft_doc ? { doc: r.draft_doc } : {}),
      ...(r.draft_updated_by ? { by: r.draft_updated_by } : {}),
    };
  }
  if (r?.published_html != null && r.published_at) {
    template.published = {
      html: r.published_html,
      at: r.published_at,
      ...(r.published_doc ? { doc: r.published_doc } : {}),
      ...(r.published_by ? { by: r.published_by } : {}),
    };
  }
  return template;
}

export async function readTemplate(companyId = "default"): Promise<ReportTemplate> {
  const { data, error } = await db()
    .from("rmi_report_templates")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();
  if (error) fail("read report template", error);
  return toTemplate((data as TemplateRow | null) ?? null);
}

export async function saveTemplateDraft(
  html: string,
  doc: string | null,
  by: string,
  companyId = "default",
): Promise<ReportTemplate> {
  const { error } = await db()
    .from("rmi_report_templates")
    .upsert(
      {
        id: companyId,
        draft_html: html,
        draft_doc: doc,
        draft_updated_at: new Date().toISOString(),
        draft_updated_by: by,
      },
      { onConflict: "id" },
    );
  if (error) fail("save report template draft", error);
  return readTemplate(companyId);
}

/** Move the draft into place as the live template and bump the version. */
export async function publishTemplate(
  by: string,
  companyId = "default",
): Promise<ReportTemplate | undefined> {
  const current = await readTemplate(companyId);
  if (!current.draft) return undefined;

  const { error } = await db()
    .from("rmi_report_templates")
    .update({
      published_html: current.draft.html,
      published_doc: current.draft.doc ?? null,
      published_at: new Date().toISOString(),
      published_by: by,
      version: current.version + 1,
    })
    .eq("id", companyId);
  if (error) fail("publish report template", error);
  return readTemplate(companyId);
}

/** Throw the draft away. What is published keeps serving reports. */
export async function discardTemplateDraft(companyId = "default"): Promise<ReportTemplate> {
  const { error } = await db()
    .from("rmi_report_templates")
    .update({
      draft_html: null,
      draft_doc: null,
      draft_updated_at: null,
      draft_updated_by: null,
    })
    .eq("id", companyId);
  if (error) fail("discard report template draft", error);
  return readTemplate(companyId);
}

/* -------------------------------------------------------------------------- */
/* sharing                                                                    */
/* -------------------------------------------------------------------------- */

export async function addShares(
  id: string,
  token: string,
  people: { name: string; email: string; relationship: string }[],
): Promise<Share[] | undefined> {
  const found = await getAssessment(id, token);
  if (!found) return undefined;

  const existing = new Set(found.shares.map((s) => s.email.toLowerCase()));
  const base = Date.now();
  const rows: ReturnType<typeof shareRow>[] = [];

  for (const person of people) {
    const email = person.email.trim().toLowerCase();
    if (existing.has(email)) continue;
    existing.add(email);
    rows.push(
      shareRow(id, {
        id: crypto.randomUUID(),
        name: person.name.trim(),
        email,
        relationship: person.relationship.trim(),
        token: newSecret(),
        // A millisecond apart, so the order they were entered in is the order
        // they come back in (the table has no sequence column).
        invitedAt: new Date(base + rows.length).toISOString(),
        respondedAt: null,
      }),
    );
  }
  if (rows.length === 0) return [];

  const { data, error } = await db()
    .from("rmi_shares")
    .upsert(rows, { onConflict: "assessment_id,email", ignoreDuplicates: true })
    .select();
  if (error) fail("add shares", error);
  return ((data ?? []) as ShareRow[]).map(toShare);
}

export async function recordDeliveries(
  id: string,
  results: { token: string; delivery: InviteDelivery }[],
): Promise<void> {
  await Promise.all(
    results.map(async (r) => {
      const { error } = await db()
        .from("rmi_shares")
        .update({
          delivery_status: r.delivery.status,
          delivery_error: r.delivery.error ?? null,
          delivery_at: r.delivery.at,
        })
        .eq("assessment_id", id)
        .eq("token", r.token);
      if (error) fail("record delivery", error);
    }),
  );
}

export async function markSharesNotified(
  id: string,
  tokens: string[],
  by: string,
): Promise<void> {
  if (tokens.length === 0) return;
  const { error } = await db()
    .from("rmi_shares")
    .update({ notified_at: new Date().toISOString(), notified_by: by })
    .eq("assessment_id", id)
    .in("token", tokens);
  if (error) fail("mark notified", error);
}

export async function findShare(
  token: string,
): Promise<{ assessment: Assessment; share: Share } | undefined> {
  const { data, error } = await db()
    .from("rmi_shares")
    .select("assessment_id")
    .eq("token", token)
    .maybeSingle();
  if (error) fail("find share", error);
  if (!data) return undefined;

  const assessment = await getAssessment(data.assessment_id as string);
  const share = assessment?.shares.find((s) => s.token === token);
  return assessment && share ? { assessment, share } : undefined;
}

type ResponseRow = {
  id: string;
  assessment_id: string;
  name: string;
  email: string;
  relationship: string;
  answers: Answers;
  score: ScoreSummary | null;
  created_at: string;
  sample: boolean;
  rmi_shares?: { token: string } | { token: string }[] | null;
};

function toResponse(r: ResponseRow): StakeholderResponse {
  const share = Array.isArray(r.rmi_shares) ? r.rmi_shares[0] : r.rmi_shares;
  const out: StakeholderResponse = {
    id: r.id,
    assessmentId: r.assessment_id,
    shareToken: share?.token ?? "",
    name: r.name,
    email: r.email,
    relationship: r.relationship,
    answers: r.answers ?? {},
    score: r.score ?? { overall: 0, coverage: 0, depth: 0, tier: "Bronze", sections: [] },
    createdAt: r.created_at,
  };
  if (r.sample) out.sample = true;
  return out;
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
  const shareLookup = await db()
    .from("rmi_shares")
    .select("id")
    .eq("token", input.shareToken)
    .maybeSingle();
  if (shareLookup.error) fail("find share", shareLookup.error);

  const { data, error } = await db()
    .from("rmi_stakeholder_responses")
    .insert({
      assessment_id: input.assessmentId,
      share_id: shareLookup.data?.id ?? null,
      name: input.name,
      email: input.email,
      relationship: input.relationship,
      answers: input.answers,
      score: input.score,
    })
    .select("*")
    .single();
  if (error) fail("save response", error);

  if (shareLookup.data?.id) {
    const marked = await db()
      .from("rmi_shares")
      .update({ responded_at: (data as ResponseRow).created_at })
      .eq("id", shareLookup.data.id);
    if (marked.error) fail("mark responded", marked.error);
  }

  return { ...toResponse(data as ResponseRow), shareToken: input.shareToken };
}

/* -------------------------------------------------------------------------- */
/* lists                                                                      */
/* -------------------------------------------------------------------------- */

export async function listAssessments(): Promise<Assessment[]> {
  const rows = await pageAll<AssessmentRow>("list assessments", (from, to) =>
    db()
      .from("rmi_assessments")
      .select(ASSESSMENT_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to) as unknown as PromiseLike<{ data: AssessmentRow[] | null; error: PgError }>,
  );
  return rows.map(toAssessment);
}

export async function listAllStakeholderResponses(): Promise<StakeholderResponse[]> {
  const rows = await pageAll<ResponseRow>("list responses", (from, to) =>
    db()
      .from("rmi_stakeholder_responses")
      .select("*, rmi_shares(token)")
      .order("created_at", { ascending: true })
      .range(from, to) as unknown as PromiseLike<{ data: ResponseRow[] | null; error: PgError }>,
  );
  return rows.map(toResponse);
}

export async function listStakeholderResponses(
  assessmentId: string,
): Promise<StakeholderResponse[]> {
  const { data, error } = await db()
    .from("rmi_stakeholder_responses")
    .select("*, rmi_shares(token)")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });
  if (error) fail("list responses", error);
  return ((data ?? []) as ResponseRow[]).map(toResponse);
}

/* -------------------------------------------------------------------------- */
/* settings                                                                   */
/* -------------------------------------------------------------------------- */

export async function readSettings(companyId = "default"): Promise<StoredSettings> {
  const { data, error } = await db()
    .from("rmi_settings")
    .select("data")
    .eq("id", companyId)
    .maybeSingle();
  if (error) fail("read settings", error);
  return (data?.data as StoredSettings | undefined) ?? {};
}

export async function changeSettings(
  fn: (current: StoredSettings) => StoredSettings,
  companyId = "default",
): Promise<StoredSettings> {
  const next = fn(await readSettings(companyId));
  const { error } = await db()
    .from("rmi_settings")
    .upsert({
      id: companyId,
      data: next,
      updated_at: new Date().toISOString(),
      updated_by: next.updatedBy ?? null,
    });
  if (error) fail("save settings", error);
  return next;
}

/* -------------------------------------------------------------------------- */
/* sample data                                                                */
/* -------------------------------------------------------------------------- */

export async function replaceSamples(
  assessments: Assessment[],
  responses: StakeholderResponse[],
): Promise<void> {
  // Only rows flagged `sample` are ever removed. Cascades take their shares,
  // responses and reports with them.
  const cleared = await db().from("rmi_assessments").delete().eq("sample", true);
  if (cleared.error) fail("clear samples", cleared.error);

  await insertChunks(
    "load sample assessments",
    "rmi_assessments",
    assessments.map((a) => ({ ...assessmentRow(a), sample: true })),
  );

  const shareIdByToken = new Map<string, string>();
  const shares = assessments.flatMap((a) =>
    a.shares.map((s) => {
      shareIdByToken.set(s.token, s.id);
      return shareRow(a.id, s);
    }),
  );
  await insertChunks("load sample invitations", "rmi_shares", shares);

  await insertChunks(
    "load sample responses",
    "rmi_stakeholder_responses",
    responses.map((r) => ({
      id: r.id,
      assessment_id: r.assessmentId,
      share_id: shareIdByToken.get(r.shareToken) ?? null,
      name: r.name,
      email: r.email,
      relationship: r.relationship,
      answers: r.answers,
      score: r.score,
      created_at: r.createdAt,
      sample: true,
    })),
  );

  await insertChunks(
    "load sample reports",
    "rmi_reports",
    assessments.filter((a) => a.report).map((a) => reportRow(a.id, a.report!)),
  );
}

export async function countSamples(): Promise<{ assessments: number; responses: number }> {
  const [a, r] = await Promise.all([
    db().from("rmi_assessments").select("id", { count: "exact", head: true }).eq("sample", true),
    db()
      .from("rmi_stakeholder_responses")
      .select("id", { count: "exact", head: true })
      .eq("sample", true),
  ]);
  if (a.error) fail("count samples", a.error);
  if (r.error) fail("count samples", r.error);
  return { assessments: a.count ?? 0, responses: r.count ?? 0 };
}

export async function removeSamples(): Promise<{ assessments: number; responses: number }> {
  const before = await countSamples();
  const { error } = await db().from("rmi_assessments").delete().eq("sample", true);
  if (error) fail("remove samples", error);
  return before;
}

/* -------------------------------------------------------------------------- */
/* status and the one-off import from the old JSON file                        */
/* -------------------------------------------------------------------------- */

export type StorageStatus = {
  schemaReady: boolean;
  problem: string | null;
  counts: { assessments: number; responses: number };
};

/**
 * Probes each thing migration 0002 adds, so the settings page can say exactly
 * what is missing instead of failing on the first real request.
 */
export async function storageStatus(): Promise<StorageStatus> {
  const probes: [string, PromiseLike<{ error: PgError }>][] = [
    ["assessment columns", db().from("rmi_assessments").select("id, sample, payment_updated_at").limit(1)],
    ["the waived payment status", db().from("rmi_assessments").select("id").eq("payment_status", "waived").limit(1)],
    ["invitation delivery columns", db().from("rmi_shares").select("id, delivery_status, notified_at").limit(1)],
    ["response columns", db().from("rmi_stakeholder_responses").select("id, sample").limit(1)],
    ["report columns", db().from("rmi_reports").select("assessment_id, humanized, edited_by_email, sent_at").limit(1)],
    ["the settings table", db().from("rmi_settings").select("id").limit(1)],
  ];

  const results = await Promise.all(probes.map(([, p]) => p));
  const missing = probes.filter((_, i) => results[i].error).map(([label]) => label);

  if (missing.length > 0) {
    return {
      schemaReady: false,
      problem: `Missing from the database: ${missing.join(", ")}. Run supabase/migrations/0002_storage_on_supabase.sql.`,
      counts: { assessments: 0, responses: 0 },
    };
  }

  const [a, r] = await Promise.all([
    db().from("rmi_assessments").select("id", { count: "exact", head: true }),
    db().from("rmi_stakeholder_responses").select("id", { count: "exact", head: true }),
  ]);
  return {
    schemaReady: true,
    problem: null,
    counts: { assessments: a.count ?? 0, responses: r.count ?? 0 },
  };
}

type Tally = { added: number; skipped: number };
export type ImportResult = {
  assessments: Tally;
  invitations: Tally;
  responses: Tally;
  reports: Tally;
  settings: "imported" | "kept" | "none";
  samplesIgnored: number;
};

/**
 * Copy the old JSON file's records into Supabase. It only ever inserts: a row
 * that already exists (same reference, token or id) is left exactly as it is and
 * counted as skipped, so running it twice, or after real traffic has started,
 * cannot overwrite anything. The file itself is never modified.
 */
export async function importLegacy(data: LegacyData): Promise<ImportResult> {
  const tally = (): Tally => ({ added: 0, skipped: 0 });
  const result: ImportResult = {
    assessments: tally(),
    invitations: tally(),
    responses: tally(),
    reports: tally(),
    settings: "none",
    samplesIgnored: 0,
  };

  async function insertOne(table: string, row: object, into: Tally): Promise<boolean> {
    const { error } = await db().from(table).insert(row);
    if (!error) {
      into.added += 1;
      return true;
    }
    if (error.code === UNIQUE_VIOLATION) {
      into.skipped += 1;
      return false;
    }
    fail(`import into ${table}`, error);
  }

  const real = data.assessments.filter((a) => !a.sample);
  result.samplesIgnored =
    data.assessments.length - real.length +
    data.stakeholderResponses.filter((r) => r.sample).length;
  const realIds = new Set(real.map((a) => a.id));

  for (const a of real) {
    await insertOne("rmi_assessments", assessmentRow(a), result.assessments);
    for (const s of a.shares) await insertOne("rmi_shares", shareRow(a.id, s), result.invitations);
    if (a.report) await insertOne("rmi_reports", reportRow(a.id, a.report), result.reports);
  }

  for (const r of data.stakeholderResponses) {
    if (r.sample || !realIds.has(r.assessmentId)) continue;
    const share = await db().from("rmi_shares").select("id").eq("token", r.shareToken).maybeSingle();
    await insertOne(
      "rmi_stakeholder_responses",
      {
        id: UUID.test(r.id) ? r.id : crypto.randomUUID(),
        assessment_id: r.assessmentId,
        share_id: share.data?.id ?? null,
        name: r.name,
        email: r.email,
        relationship: r.relationship,
        answers: r.answers,
        score: r.score,
        created_at: r.createdAt,
      },
      result.responses,
    );
  }

  if (Object.keys(data.settings ?? {}).length > 0) {
    const existing = await db().from("rmi_settings").select("id").eq("id", "default").maybeSingle();
    if (existing.error) fail("read settings", existing.error);
    if (existing.data) {
      result.settings = "kept";
    } else {
      const { error } = await db()
        .from("rmi_settings")
        .insert({ id: "default", data: data.settings, updated_by: data.settings.updatedBy ?? null });
      if (error) fail("import settings", error);
      result.settings = "imported";
    }
  }

  return result;
}

/** Exposed for tests only: the pure row mapping, with no database involved. */
export const rowMappers = { toAssessment, assessmentRow, shareRow, reportRow };
