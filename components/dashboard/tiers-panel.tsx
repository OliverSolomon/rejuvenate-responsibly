"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/rmi/regions";
import type { Tier } from "@/lib/rmi/pricing";

/**
 * What each tier costs and what it offers.
 *
 * The price here is the number a client is actually charged, not a second copy
 * of a display string that has to be kept in step with it. Leaving the price
 * empty makes a tier one that is quoted rather than sold online, which is how
 * Enterprise works.
 */

type Draft = {
  name: string;
  /** Empty means quoted rather than sold. */
  amount: string;
  summary: string;
  includes: string;
  hidden: boolean;
};

const toDraft = (tier: Tier): Draft => ({
  name: tier.name,
  amount: tier.amount === null ? "" : String(tier.amount),
  summary: tier.summary,
  includes: tier.includes.join("\n"),
  hidden: false,
});

export function TiersPanel({ tiers, currency }: { tiers: Tier[]; currency: string }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(tiers.map((t) => [t.id, toDraft(t)])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const edit = (id: string, patch: Partial<Draft>) =>
    setDrafts((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [id, draft] of Object.entries(drafts)) {
        const trimmed = draft.amount.trim();
        const amount = trimmed === "" ? null : Number(trimmed.replace(/[,\s]/g, ""));
        if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
          throw new Error(`The price for ${draft.name || id} has to be a number, or empty to quote it.`);
        }
        payload[id] = {
          name: draft.name,
          amount,
          summary: draft.summary,
          includes: draft.includes
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
          hidden: draft.hidden,
        };
      }

      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not save.");
      setMessage({ kind: "ok", text: "Saved. The pricing page shows these straight away." });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "bad", text: err instanceof Error ? err.message : "That did not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <h2 className="display text-[1.125rem]">What you charge</h2>
        <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
          The price is what a client is charged, in {currency}, and what the pricing page prints.
          Leave it empty for a tier people have to ask about. One line per thing included.
        </p>
      </section>

      {tiers.map((tier) => {
        const draft = drafts[tier.id];
        if (!draft) return null;
        const amount = Number(draft.amount.replace(/[,\s]/g, ""));
        const preview =
          draft.amount.trim() === "" || !Number.isFinite(amount)
            ? "Quoted, not sold online"
            : formatMoney(amount, currency, { round: true });

        return (
          <section
            key={tier.id}
            className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="display text-[1.0625rem]">{tier.name}</h3>
                <p className="mt-1 text-[0.8125rem] text-forest-900/50">
                  {preview} · {tier.cadence}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[0.8125rem] text-forest-900/70">
                <input
                  type="checkbox"
                  checked={draft.hidden}
                  onChange={(e) => edit(tier.id, { hidden: e.target.checked })}
                  className="h-4 w-4"
                />
                Hide from the pricing page
              </label>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[0.8125rem] font-medium text-forest-900/70">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => edit(tier.id, { name: e.target.value })}
                  className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[0.8125rem] font-medium text-forest-900/70">
                  Price in {currency}
                </span>
                <input
                  value={draft.amount}
                  inputMode="numeric"
                  placeholder="Leave empty to quote it"
                  onChange={(e) => edit(tier.id, { amount: e.target.value })}
                  className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] tabular-nums"
                />
              </label>
            </div>

            <label className="mt-5 flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">Summary</span>
              <textarea
                value={draft.summary}
                rows={2}
                onChange={(e) => edit(tier.id, { summary: e.target.value })}
                className="rounded-xl border border-forest-900/15 bg-bone-100 px-4 py-3 text-[0.9375rem] leading-relaxed"
              />
            </label>

            <label className="mt-5 flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">
                What is included, one per line
              </span>
              <textarea
                value={draft.includes}
                rows={6}
                onChange={(e) => edit(tier.id, { includes: e.target.value })}
                className="rounded-xl border border-forest-900/15 bg-bone-100 px-4 py-3 text-[0.9375rem] leading-relaxed"
              />
            </label>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" size="lg" arrow onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save pricing"}
        </Button>
        {message && (
          <p
            role="status"
            className={`text-[0.875rem] ${
              message.kind === "ok" ? "text-forest-700" : "text-clay-500"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
