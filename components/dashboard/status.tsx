import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ReportState } from "@/lib/rmi/dashboard";

/**
 * One place that decides what each state is called and what colour it wears,
 * so the list and the detail view can never drift apart.
 */

const ASSESSMENT: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "In progress", tone: "pending" },
  submitted: { label: "Submitted", tone: "good" },
};

const PAYMENT: Record<string, { label: string; tone: BadgeTone }> = {
  unpaid: { label: "Unpaid", tone: "quiet" },
  pending: { label: "Payment pending", tone: "pending" },
  paid: { label: "Paid", tone: "good" },
  failed: { label: "Payment failed", tone: "neutral" },
  waived: { label: "Payment waived", tone: "neutral" },
};

const REPORT: Record<ReportState, { label: string; tone: BadgeTone }> = {
  none: { label: "No report", tone: "quiet" },
  draft: { label: "Draft report", tone: "pending" },
  issued: { label: "Report issued", tone: "strong" },
  sent: { label: "Report sent", tone: "strong" },
  expired: { label: "Report expired", tone: "pending" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = ASSESSMENT[status] ?? { label: status, tone: "neutral" as BadgeTone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const s = PAYMENT[status] ?? { label: status, tone: "neutral" as BadgeTone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ReportBadge({ state }: { state: ReportState }) {
  const s = REPORT[state];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Marks a mock submission, so it is never mistaken for a real client. */
export function SampleBadge() {
  return <Badge tone="quiet">Sample</Badge>;
}

export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-forest-900/35">--</span>;
  return <Badge tone={tier === "Platinum" || tier === "Gold" ? "good" : "neutral"}>{tier}</Badge>;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
