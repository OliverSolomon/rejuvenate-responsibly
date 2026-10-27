"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * What the public site says about how to reach the firm.
 *
 * These are the values the header, footer and contact page read. Leaving a
 * field empty does not blank the site: it falls back to what is in the code, so
 * the pages always read properly.
 */

type Social = { label: string; href: string };

const MAX_PHONES = 4;
const MAX_SOCIALS = 8;

function Field({
  label,
  value,
  onValue,
  placeholder,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onValue: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium text-forest-900/70">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
      />
      {hint && <span className="text-[0.75rem] leading-relaxed text-forest-900/50">{hint}</span>}
    </label>
  );
}

export function WebsitePanel({
  contact,
  socials: initialSocials,
}: {
  contact: { email: string; location: string; phones: string[]; whatsapp: string };
  socials: Social[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState(contact.email);
  const [location, setLocation] = useState(contact.location);
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp);
  const [phones, setPhones] = useState<string[]>(
    contact.phones.length ? contact.phones : [""],
  );
  const [socials, setSocials] = useState<Social[]>(
    initialSocials.length ? initialSocials : [{ label: "", href: "" }],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            email,
            location,
            whatsapp,
            phones: phones.map((p) => p.trim()).filter(Boolean),
          },
          socials: socials.filter((s) => s.label.trim() && s.href.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not save.");
      setMessage({ kind: "ok", text: "Saved. The website shows these straight away." });
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
        <h2 className="display text-[1.125rem]">How people reach you</h2>
        <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
          Shown in the footer, on the contact page and in the letterhead of every report. Clear a
          field and it falls back to what is in the code, so the site never shows a blank.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field
            label="Email"
            type="email"
            value={email}
            onValue={setEmail}
            placeholder="info@example.com"
          />
          <Field
            label="Location"
            value={location}
            onValue={setLocation}
            placeholder="Nairobi, Kenya"
          />
          <Field
            label="WhatsApp"
            value={whatsapp}
            onValue={setWhatsapp}
            placeholder="+254 108 000 507"
            hint="A number or a wa.me link. A number is turned into a link for you."
          />
        </div>

        <div className="mt-6">
          <p className="text-[0.8125rem] font-medium text-forest-900/70">Phone numbers</p>
          <div className="mt-2 flex flex-col gap-2">
            {phones.map((phone, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  placeholder="+254 709 000 507"
                  onChange={(e) =>
                    setPhones((cur) => cur.map((p, idx) => (idx === i ? e.target.value : p)))
                  }
                  className="h-12 flex-1 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
                />
                {phones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPhones((cur) => cur.filter((_, idx) => idx !== i))}
                    className="shrink-0 px-3 text-[0.8125rem] text-forest-900/50 underline-offset-4 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {phones.length < MAX_PHONES && (
            <button
              type="button"
              onClick={() => setPhones((cur) => [...cur, ""])}
              className="mt-2 text-[0.8125rem] font-medium text-forest-700 underline-offset-4 hover:underline"
            >
              Add another number
            </button>
          )}
        </div>
      </section>

      <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <h2 className="display text-[1.125rem]">Social pages</h2>
        <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
          Listed in the footer, in this order. Remove them all and the footer simply has none.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {socials.map((social, i) => (
            <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
              <input
                value={social.label}
                placeholder="LinkedIn"
                onChange={(e) =>
                  setSocials((cur) =>
                    cur.map((s, idx) => (idx === i ? { ...s, label: e.target.value } : s)),
                  )
                }
                className="h-12 w-full rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] sm:w-40"
              />
              <input
                value={social.href}
                placeholder="https://www.linkedin.com/company/..."
                onChange={(e) =>
                  setSocials((cur) =>
                    cur.map((s, idx) => (idx === i ? { ...s, href: e.target.value } : s)),
                  )
                }
                className="h-12 min-w-0 flex-1 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
              />
              <button
                type="button"
                onClick={() => setSocials((cur) => cur.filter((_, idx) => idx !== i))}
                className="shrink-0 px-3 text-[0.8125rem] text-forest-900/50 underline-offset-4 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {socials.length < MAX_SOCIALS && (
          <button
            type="button"
            onClick={() => setSocials((cur) => [...cur, { label: "", href: "" }])}
            className="mt-3 text-[0.8125rem] font-medium text-forest-700 underline-offset-4 hover:underline"
          >
            Add a page
          </button>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" size="lg" arrow onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Save website details"}
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
