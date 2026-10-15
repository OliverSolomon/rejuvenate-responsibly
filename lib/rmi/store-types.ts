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
};

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
