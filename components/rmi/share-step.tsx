"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Session } from "./use-assessment";

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

/** Shown once the assessment is in: hand it to the people on the outside. */
export function ShareStep({ session }: { session: Session | null }) {
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }, { ...EMPTY }]);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<{ email: string; link: string; delivered: boolean }[]>([]);

  const filled = rows.filter((r) => EMAIL.test(r.email.trim()));

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    if (!session) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/rmi/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: session.id, token: session.token, people: filled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setLinks(data.links ?? []);
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (!session) {
    return (
      <p className="text-[0.9375rem] text-forest-900/60">
        Sharing needs a saved assessment. Your answers are on this device, so reopen this
        page from the link we emailed you and the share step will be here.
      </p>
    );
  }

  if (state === "sent") {
    return (
      <div>
        <p className="text-[0.9375rem] leading-relaxed text-bone-100/75">
          {links.length} {links.length === 1 ? "person has" : "people have"} been sent the
          survey. We will chase anyone who has not answered after five days, and your report
          follows once the responses are in.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {links.map((l) => (
            <li key={l.email} className="flex flex-col gap-1">
              <span className="text-[0.875rem] text-bone-50">
                {l.email}
                {!l.delivered && (
                  <span className="ml-2 text-[0.75rem] text-bone-100/50">
                    email not configured, share this link yourself
                  </span>
                )}
              </span>
              <code className="truncate rounded-lg bg-bone-50/8 px-3 py-2 text-[0.75rem] text-bone-100/60">
                {l.link}
              </code>
            </li>
          ))}
        </ul>
        <Button variant="dark" size="sm" className="mt-6" onClick={() => setState("idle")}>
          Add more people
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="max-w-[54ch] text-[0.9375rem] leading-relaxed text-bone-100/70">
        Add up to five people who see your operations from the outside. Pick ones who will
        answer honestly rather than kindly: a supplier you squeeze on payment terms tells
        you more than a long standing partner will.
      </p>

      <ul className="mt-6 flex flex-col gap-3">
        {rows.map((row, i) => (
          <li key={i} className="grid gap-3 sm:grid-cols-3">
            <input
              value={row.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Name"
              aria-label={`Person ${i + 1} name`}
              className="h-11 rounded-xl border border-bone-50/20 bg-forest-800 px-3.5 text-[0.875rem] text-bone-50 placeholder:text-bone-50/35"
            />
            <input
              type="email"
              value={row.email}
              onChange={(e) => update(i, { email: e.target.value })}
              placeholder="Email address"
              aria-label={`Person ${i + 1} email`}
              className="h-11 rounded-xl border border-bone-50/20 bg-forest-800 px-3.5 text-[0.875rem] text-bone-50 placeholder:text-bone-50/35"
            />
            <select
              value={row.relationship}
              onChange={(e) => update(i, { relationship: e.target.value })}
              aria-label={`Person ${i + 1} relationship`}
              className="h-11 rounded-xl border border-bone-50/20 bg-forest-800 px-3.5 text-[0.875rem] text-bone-50"
            >
              <option value="">Relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      {rows.length < 5 && (
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, { ...EMPTY }])}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-bone-50/25 px-4 py-2 text-[0.8125rem] text-bone-100/80 transition-colors hover:border-lime-500"
        >
          <span aria-hidden>+</span> Add another
          <span className="text-bone-100/45">({5 - rows.length} left)</span>
        </button>
      )}

      {error && (
        <p className="mt-5 rounded-xl border border-clay-400/40 bg-clay-400/10 p-3 text-[0.875rem] text-clay-400">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button
          variant="lime"
          size="lg"
          arrow
          disabled={filled.length === 0 || state === "sending"}
          onClick={submit}
        >
          {state === "sending"
            ? "Sending..."
            : `Send ${filled.length || ""} ${filled.length === 1 ? "invitation" : "invitations"}`.replace(
                /\s+/g,
                " ",
              )}
        </Button>
        {filled.length === 0 && (
          <p className="text-[0.8125rem] text-bone-100/50">One valid email is enough to start.</p>
        )}
      </div>
    </div>
  );
}
