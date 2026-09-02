"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const TOPICS = [
  "Rate My Impact assessment",
  "Sustainability strategy",
  "ESG advisory",
  "CSR programme design",
  "Reporting and disclosure",
  "Sustainable finance",
  "Something else",
];

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organisation: "",
    topic: defaultTopic ?? "",
    message: "",
    website: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const ready =
    form.name.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email) &&
    form.message.trim().length > 9;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Something went wrong.");
      }
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-card border border-forest-900/12 bg-lime-50 p-8">
        <h2 className="display text-2xl">Message received</h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-forest-900/65">
          Thank you. One of our consultants will reply within two working days. If it is
          urgent, call us on the numbers listed here and ask for the advisory desk.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          required
          value={form.name}
          autoComplete="name"
          onChange={(v) => setForm({ ...form, name: v })}
        />
        <Field
          label="Work email"
          type="email"
          required
          value={form.email}
          autoComplete="email"
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <Field
          label="Organisation"
          value={form.organisation}
          autoComplete="organization"
          onChange={(v) => setForm({ ...form, organisation: v })}
        />
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">
            What is this about?
          </span>
          <select
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
          >
            <option value="">Choose a topic</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium text-forest-900/70">
          Your message <span className="text-clay-500">*</span>
        </span>
        <textarea
          rows={6}
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us what you are working on, and what is getting in the way."
          className="rounded-xl border border-forest-900/15 bg-bone-50 px-4 py-3.5 text-[0.9375rem] leading-relaxed"
        />
      </label>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size="lg" arrow disabled={!ready || state === "sending"}>
          {state === "sending" ? "Sending..." : "Send message"}
        </Button>
        <p className="text-[0.8125rem] text-forest-900/45">
          We reply within two working days.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium text-forest-900/70">
        {label}
        {required && <span className="text-clay-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
      />
    </label>
  );
}
