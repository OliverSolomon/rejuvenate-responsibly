"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/rmi/pricing";

/**
 * Paying opens the assessment. We take the billing details first, create the
 * assessment so the person gets their reference by email whatever happens at
 * the gateway, then hand off to Pesapal.
 */
export function PayButton({ tier, featured }: { tier: Tier; featured: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ organisation: "", contactName: "", email: "" });

  const ready =
    form.organisation.trim().length > 1 &&
    form.contactName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const created = await fetch("/api/rmi/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: { ...form, role: "", sector: "" } }),
      });
      const assessment = await created.json();
      if (!created.ok) throw new Error(assessment?.error ?? "We could not start your assessment.");

      try {
        window.localStorage.setItem(
          "rmi:last",
          JSON.stringify({ id: assessment.id, token: assessment.token }),
        );
      } catch {
        // Private mode. The emailed link still gets them back in.
      }

      const paid = await fetch("/api/rmi/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: assessment.id, token: assessment.token, tier: tier.id }),
      });
      const payment = await paid.json();

      if (!paid.ok) {
        // The assessment exists and the reference is already in their inbox,
        // so say what happened rather than pretending nothing did.
        setError(
          `${payment?.error ?? "The payment gateway is not reachable."} Your reference is ${assessment.id} and we have emailed it to you.`,
        );
        setBusy(false);
        return;
      }

      window.location.href = payment.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant={featured ? "lime" : "primary"} size="lg" arrow onClick={() => setOpen(true)}>
        Pay
      </Button>
    );
  }

  const label = featured ? "text-bone-100/70" : "text-forest-900/70";
  const field = featured
    ? "border-bone-50/20 bg-forest-800 text-bone-50 placeholder:text-bone-50/35"
    : "border-forest-900/15 bg-bone-100 text-forest-900";

  return (
    <div className="flex flex-col gap-3">
      {(["organisation", "contactName", "email"] as const).map((key) => (
        <label key={key} className="flex flex-col gap-1.5">
          <span className={`text-[0.75rem] font-medium ${label}`}>
            {key === "organisation"
              ? "Organisation"
              : key === "contactName"
                ? "Your name"
                : "Work email"}
          </span>
          <input
            type={key === "email" ? "email" : "text"}
            value={form[key]}
            autoComplete={
              key === "email" ? "email" : key === "contactName" ? "name" : "organization"
            }
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            className={`h-11 rounded-xl border px-3.5 text-[0.875rem] ${field}`}
          />
        </label>
      ))}

      {error && (
        <p className="rounded-xl border border-clay-400/30 bg-clay-400/10 p-3 text-[0.8125rem] text-clay-500">
          {error}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button
          variant={featured ? "lime" : "primary"}
          size="md"
          arrow
          disabled={!ready || busy}
          onClick={go}
        >
          {busy ? "Opening..." : `Pay ${tier.currency} ${tier.price}`}
        </Button>
        <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className={`text-[0.75rem] ${label}`}>
        We create your assessment and email you the reference before sending you to the
        gateway.
      </p>
    </div>
  );
}
