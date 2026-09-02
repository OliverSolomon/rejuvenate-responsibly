"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Row = { name: string; email: string; relationship: string };

const EMPTY: Row = { name: "", email: "", relationship: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const RELATIONSHIPS = [
  "Supplier or vendor",
  "Customer or client",
  "Investor or lender",
  "Community partner",
  "Regulator or industry body",
  "Employee representative",
  "NGO or civil society",
  "Other",
];

export function StakeholderForm({ reference }: { reference?: string }) {
  const [organisation, setOrganisation] = useState("");
  const [invitedBy, setInvitedBy] = useState("");
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<{ email: string; link: string }[]>([]);

  const filled = rows.filter((r) => EMAIL.test(r.email.trim()));
  const ready = organisation.trim().length > 1 && invitedBy.trim().length > 1 && filled.length >= 3;

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/rmi/stakeholders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organisation,
          invitedBy,
          reference: reference ?? null,
          stakeholders: filled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setLinks(data.links ?? []);
      setState("sent");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="eyebrow text-forest-900/45">Step 3 of 3</p>
        <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
          Invitations are on their way
        </h1>
        <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
          {filled.length} stakeholders have been invited to answer the 40 question
          survey about {organisation}. We will nudge anyone who has not responded after
          five days, and your consolidated report follows once the responses are in.
        </p>

        {links.length > 0 && (
          <div className="mt-10 rounded-card border border-forest-900/12 bg-bone-50 p-6">
            <p className="text-[0.8125rem] font-medium text-forest-900/70">
              Their survey links, in case you would rather share them yourself
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {links.map((l) => (
                <li key={l.email} className="flex flex-col gap-1">
                  <span className="text-[0.875rem] text-forest-900">{l.email}</span>
                  <code className="truncate rounded-lg bg-forest-900/5 px-3 py-2 text-[0.75rem] text-forest-900/60">
                    {l.link}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="eyebrow text-forest-900/45">Step 2 of 3</p>
      <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
        Who sees you from the outside?
      </h1>
      <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
        Add between three and five people. Pick ones who will answer honestly rather
        than kindly: a supplier you squeeze on payment terms tells you more than a
        long standing partner will.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">
            Your organisation <span className="text-clay-500">*</span>
          </span>
          <input
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">
            Inviting on behalf of <span className="text-clay-500">*</span>
          </span>
          <input
            value={invitedBy}
            onChange={(e) => setInvitedBy(e.target.value)}
            placeholder="Your name"
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
          />
        </label>
      </div>

      <ul className="mt-10 flex flex-col gap-4">
        {rows.map((row, i) => (
          <li
            key={i}
            className="rounded-card border border-forest-900/12 bg-bone-50 p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[0.8125rem] font-medium text-forest-900/70">
                Stakeholder {i + 1}
                {i < 3 && <span className="text-clay-500"> *</span>}
              </p>
              {rows.length > 3 && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[0.8125rem] text-forest-900/45 transition-colors hover:text-clay-500"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Name"
                aria-label={`Stakeholder ${i + 1} name`}
                className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
              />
              <input
                type="email"
                value={row.email}
                onChange={(e) => update(i, { email: e.target.value })}
                placeholder="Email address"
                aria-label={`Stakeholder ${i + 1} email`}
                className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
              />
              <select
                value={row.relationship}
                onChange={(e) => update(i, { relationship: e.target.value })}
                aria-label={`Stakeholder ${i + 1} relationship`}
                className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
              >
                <option value="">Relationship</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>

      {rows.length < 5 && (
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { ...EMPTY }])}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-forest-900/20 px-4 py-2 text-[0.875rem] transition-colors hover:border-forest-900/45"
        >
          <span aria-hidden>+</span> Add another
          <span className="text-forest-900/40">({5 - rows.length} left)</span>
        </button>
      )}

      {error && (
        <p className="mt-8 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          arrow
          disabled={!ready || state === "sending"}
          onClick={submit}
        >
          {state === "sending" ? "Sending..." : `Send ${filled.length || 3} invitations`}
        </Button>
        {!ready && (
          <p className="text-[0.8125rem] text-forest-900/45">
            Three valid email addresses and your name get you through.
          </p>
        )}
      </div>
    </div>
  );
}
