import { randomBytes } from "node:crypto";
import type { EmailKind } from "./email-kinds";
import type { Answers } from "./scoring";

/**
 * Shapes and pure helpers shared by every storage backend (store-file.ts and
 * store-supabase.ts) and by the rest of the app. No I/O lives here.
 */

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

/**
 * `waived` is an assessment opened while the admin "require payment" switch was
 * off. It is its own state so test runs never count as revenue.
 */
export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "waived";

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

/**
 * What happened when the invitation was sent. Absent on invitations from before
 * this was recorded, which the dashboard treats as unknown rather than failed.
 * "not_sent" means no mail provider was configured at the time.
 */
export type InviteDelivery = {
  status: "sent" | "failed" | "not_sent";
  error?: string;
  at: string;
};

export type Share = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  token: string;
  invitedAt: string;
  respondedAt: string | null;
  delivery?: InviteDelivery;
  /** When an admin told the submitter this address did not receive its invitation. */
  notifiedAt?: string;
  notifiedBy?: string;
};

/** An invitation that never arrived and has not been answered some other way. */
export function isUndelivered(share: Share): boolean {
  return Boolean(share.delivery && share.delivery.status !== "sent" && !share.respondedAt);
}

export type Report = {
  /** What an admin would send out. Edits land here. */
  markdown: string;
  model: string;
  generatedAt: string;
  /**
   * The model's original wording, kept so an edit never destroys it. Only set
   * once someone has edited, which is also how we know the report was touched.
   */
  generatedMarkdown?: string;
  editedAt?: string;
  editedBy?: string;
  /** True once the draft went through the humaniser pass. Sample reports never did. */
  humanized?: boolean;
  /** `model` above is the drafting model; this is the one that edited it. */
  humanizerModel?: string;
  /** When an admin sent the final report to the submitter. */
  sentAt?: string;
  sentBy?: string;
  /** How many invited stakeholders had not answered when it was sent. */
  sentOutstanding?: number;
  /**
   * The PDF as it was issued, in file storage. Kept so the client downloads the
   * same document months later rather than a fresh render of changed wording.
   */
  pdfPath?: string;
  pdfSize?: number;
  pdfAt?: string;
  /** Which published template version it was built from. */
  templateVersion?: number;
};

/** An image an admin uploaded for the letterhead: the firm's logo or its stamp. */
export type BrandAsset = {
  /** Path in file storage. Carries a version suffix, so replacing one is cache safe. */
  path: string;
  /** As measured in the browser at upload, for sizing it on the page. */
  width?: number;
  height?: number;
  uploadedAt: string;
  uploadedBy?: string;
};

/** One saved state of the report template: what is being worked on, or what is live. */
export type TemplateVersion = {
  /** The letterhead and footer as HTML, with placeholders left in place. */
  html: string;
  /**
   * The editor's own document in file storage, so reopening a draft is lossless
   * instead of a round trip through HTML.
   */
  doc?: string;
  at: string;
  by?: string;
};

/**
 * The house report template. Reports are built from `published`; `draft` is
 * what an admin is working on and never reaches a client. Both absent means
 * nothing has been saved and the built-in template is used.
 */
export type ReportTemplate = {
  draft?: TemplateVersion;
  published?: TemplateVersion;
  /** Rises on every publish. Recorded on a report so its origin is traceable. */
  version: number;
};

/** One year, which is how long an issued report stays valid. */
export const REPORT_VALID_DAYS = 365;

/**
 * When a report stops being current. Measured from the day an admin sent it,
 * because that is the date a client would call it issued, and it is not moved
 * by drafts or rebuilds. A report that was never sent has no expiry yet.
 */
export function reportExpiry(report: Report | null | undefined): Date | null {
  if (!report?.sentAt) return null;
  const expires = new Date(report.sentAt);
  expires.setDate(expires.getDate() + REPORT_VALID_DAYS);
  return expires;
}

export function reportExpired(report: Report | null | undefined, now = new Date()): boolean {
  const expires = reportExpiry(report);
  return Boolean(expires && now >= expires);
}

/** Whole days until a sent report expires. Negative once it has. */
export function daysUntilExpiry(report: Report | null | undefined, now = new Date()): number | null {
  const expires = reportExpiry(report);
  if (!expires) return null;
  return Math.ceil((expires.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Settings an admin can change from the dashboard. Secrets are stored
 * encrypted (see secrets.ts) and never leave the server. Anything left unset
 * falls back to the environment, then to a built-in default.
 */
export type StoredSettings = {
  requirePayment?: boolean;
  /** Master switch for outbound email. Unset means on. */
  emailEnabled?: boolean;
  /** Per-kind switches. A kind that is absent is on; false turns just that kind off. */
  emailKinds?: Partial<Record<EmailKind, boolean>>;
  /** Where contact form enquiries are delivered. */
  contactInbox?: string;
  /** The logo and stamp the report template draws on. */
  brand?: {
    logo?: BrandAsset;
    stamp?: BrandAsset;
  };
  pesapal?: {
    consumerKey?: string;
    consumerSecret?: string;
    env?: "sandbox" | "live";
    ipnId?: string;
  };
  openrouter?: {
    apiKey?: string;
    draftModel?: string;
    humanizerModel?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
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
  /**
   * Path of the logo the organisation added while filling in the assessment,
   * in file storage. Absent when they did not add one, which is normal.
   */
  clientLogo?: string;
  /** Loaded from the dashboard's sample data panel. Safe to remove in one go. */
  sample?: true;
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
  sample?: true;
};

/* -------------------------------------------------------------------------- */
/* ids                                                                        */
/* -------------------------------------------------------------------------- */

// No I, O, 0 or 1: these get read aloud and typed back in by hand.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function shortCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `RMI-${out}`;
}

export function normaliseCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/^RMI-?/, "").replace(/[^0-9A-Z]/g, "");
  return `RMI-${cleaned}`;
}

export function newSecret(): string {
  return randomBytes(24).toString("base64url");
}
