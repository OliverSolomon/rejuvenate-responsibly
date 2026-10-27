"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BLOC_LABEL,
  COUNTRIES,
  currencyChoicesFor,
  defaultCurrencyFor,
  formatMoney,
  type Bloc,
} from "@/lib/rmi/regions";

/**
 * Where the organisation is, and what it bills in.
 *
 * The currency follows the country unless somebody chooses otherwise, which is
 * the behaviour worth being explicit about: picking a country changes the
 * currency underneath, and the panel says so rather than letting it happen
 * quietly.
 */
export function OrganisationPanel({
  country: initialCountry,
  currency: initialCurrency,
  /** False when the currency is just following the country. */
  currencyChosen,
}: {
  country: string;
  currency: string;
  currencyChosen: boolean;
}) {
  const router = useRouter();
  const [country, setCountry] = useState(initialCountry);
  const [chosen, setChosen] = useState(currencyChosen ? initialCurrency : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const following = defaultCurrencyFor(country);
  const currency = chosen || following;
  const choices = currencyChoicesFor(country);

  const blocs: Bloc[] = ["EAC", "SADC"];
  const dirty = country !== initialCountry || currency !== initialCurrency;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // An empty currency hands the choice back to the country.
        body: JSON.stringify({ country, currency: chosen || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not save.");
      setMessage({
        kind: "ok",
        text: `Saved. Prices and model costs are shown in ${currency} from now on.`,
      });
      router.refresh();
    } catch (err) {
      setMessage({ kind: "bad", text: err instanceof Error ? err.message : "That did not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <h2 className="display text-[1.125rem]">Where you are</h2>
      <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
        The country sets the currency unless you pick another one. Everything priced in the
        dashboard follows it: the tiers on the website, what a report costs to write, and what a
        client is charged.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] text-forest-900"
          >
            {blocs.map((bloc) => (
              <optgroup key={bloc} label={BLOC_LABEL[bloc]}>
                {COUNTRIES.filter((c) => c.bloc === bloc).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                    {c.alsoIn ? ` (also ${c.alsoIn})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">Currency</span>
          <select
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] text-forest-900"
          >
            <option value="">Follow the country ({following})</option>
            {choices.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
          <span className="text-[0.75rem] leading-relaxed text-forest-900/50">
            {chosen
              ? `Billing in ${currency} whatever the country.`
              : `Following the country, which is ${following}.`}{" "}
            An example: {formatMoney(35000, currency)}.
          </span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button variant="primary" size="md" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving..." : "Save"}
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
    </section>
  );
}
