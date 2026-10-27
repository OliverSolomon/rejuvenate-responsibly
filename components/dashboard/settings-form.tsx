"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  callCostUsd,
  formatLocal,
  REPORT_TOKENS,
  reportCost,
  type ModelPrice,
} from "@/lib/rmi/model-cost";
import { EmailPreviewButton } from "@/components/dashboard/email-preview";
import { EMAIL_KINDS, type EmailKind } from "@/lib/rmi/email-kinds";
import type { FxRate } from "@/lib/rmi/fx";
import type { SecretView, SettingsView, Source, TextView } from "@/lib/rmi/settings";

const SOURCE_LABEL: Record<Source, string> = {
  dashboard: "Saved here",
  env: "From the server environment",
  default: "Built-in default",
  none: "Not set",
};

const inputClass =
  "h-11 w-full rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 text-[0.9375rem] text-forest-900 placeholder:text-forest-900/35 disabled:opacity-50";

function SourceTag({ source, extra }: { source: Source; extra?: string }) {
  return (
    <Badge tone={source === "none" ? "pending" : source === "dashboard" ? "good" : "quiet"}>
      {SOURCE_LABEL[source]}
      {extra ? ` ${extra}` : ""}
    </Badge>
  );
}

function Card({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <h2 className="display text-[1.375rem]">{title}</h2>
      {note && (
        <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
          {note}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Row({
  label,
  tag,
  hint,
  children,
}: {
  label: string;
  tag: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-forest-900/70">{label}</span>
        {tag}
      </div>
      {children}
      {hint && <p className="text-[0.75rem] leading-relaxed text-forest-900/50">{hint}</p>}
    </div>
  );
}

function SecretField({
  label,
  view,
  value,
  clear,
  onValue,
  onClear,
  disabled,
}: {
  label: string;
  view: SecretView;
  value: string;
  clear: boolean;
  onValue: (v: string) => void;
  onClear: (v: boolean) => void;
  disabled: boolean;
}) {
  const tail = view.last4 ? `(ends ${view.last4})` : undefined;
  return (
    <Row
      label={label}
      tag={<SourceTag source={view.source} extra={tail} />}
      hint={
        value.trim() || clear
          ? "This replaces the live key as soon as you save. Revoke the old one at the provider afterwards."
          : view.unreadable
            ? "A saved value exists but could not be decrypted, because RMI_SETTINGS_KEY changed or is missing. Enter it again to replace it."
            : "Write-only. Once saved it is encrypted and cannot be shown again. Enter a new value to rotate it."
      }
    >
      <input
        type="password"
        autoComplete="off"
        value={value}
        disabled={disabled || clear}
        placeholder={view.source === "none" ? "Paste the value" : "Leave blank to keep the current one"}
        onChange={(e) => onValue(e.target.value)}
        className={inputClass}
      />
      {view.source === "dashboard" && (
        <label className="flex items-center gap-2 text-[0.8125rem] text-forest-900/65">
          <input
            type="checkbox"
            checked={clear}
            onChange={(e) => onClear(e.target.checked)}
            className="h-4 w-4"
          />
          Remove the saved value and use the environment again
        </label>
      )}
    </Row>
  );
}

function TextField({
  label,
  view,
  value,
  onValue,
  hint,
  placeholder,
}: {
  label: string;
  view: TextView;
  value: string;
  onValue: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Row label={label} tag={<SourceTag source={view.source} />} hint={hint}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onValue(e.target.value)}
        className={inputClass}
      />
    </Row>
  );
}

type Role = { inTokens: number; outTokens: number };

const DRAFT_ROLE: Role = { inTokens: REPORT_TOKENS.draftIn, outTokens: REPORT_TOKENS.draftOut };
const HUMANIZER_ROLE: Role = {
  inTokens: REPORT_TOKENS.humanizerIn,
  outTokens: REPORT_TOKENS.humanizerOut,
};

/** "deepseek/deepseek-v4-flash" -> provider "deepseek", name "deepseek-v4-flash". */
function splitModel(id: string): { provider: string; name: string } {
  const i = id.indexOf("/");
  return i === -1 ? { provider: "", name: id } : { provider: id.slice(0, i), name: id.slice(i + 1) };
}

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  "z-ai": "Z.ai",
  mistralai: "Mistral",
  "meta-llama": "Meta",
};

const providerLabel = (p: string) => PROVIDER_LABEL[p] ?? p;

/**
 * A model chooser that shows what each choice costs in shillings: per report
 * for the job it would do here, and per million tokens for comparison with the
 * provider's own price list. Cheapest first.
 */
function ModelPicker({
  label,
  view,
  value,
  onValue,
  models,
  fx,
  role,
  hint,
}: {
  label: string;
  view: TextView;
  value: string;
  onValue: (v: string) => void;
  models: ModelPrice[];
  fx: FxRate;
  role: Role;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const root = useRef<HTMLDivElement>(null);

  const rows = models
    .map((m) => ({ m, cost: callCostUsd(role.inTokens, role.outTokens, m) }))
    .sort((a, b) => a.cost - b.cost);
  const cheapest = rows[0]?.m.id;
  const current = models.find((m) => m.id === value);
  const currentCost = current ? callCostUsd(role.inTokens, role.outTokens, current) : null;
  const { provider, name } = splitModel(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function move(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      (root.current?.querySelector("[data-trigger]") as HTMLElement | null)?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-option]") ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[next]?.focus();
    e.preventDefault();
  }

  function choose(id: string) {
    onValue(id);
    setOpen(false);
  }

  return (
    <Row label={label} tag={<SourceTag source={view.source} />} hint={hint}>
      <div ref={root} className="relative" onKeyDown={open ? move : undefined}>
        <button
          type="button"
          data-trigger
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 py-2.5 text-left transition-colors hover:border-forest-900/30"
        >
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-medium text-forest-900">
              {name || "Choose a model"}
            </span>
            <span className="block truncate text-[0.75rem] text-forest-900/55">
              {provider ? providerLabel(provider) : ""}
              {currentCost !== null
                ? ` · about ${formatLocal(currentCost, fx.perUsd, fx.currency)} per report`
                : provider
                  ? " · price unknown, left out of the estimate"
                  : ""}
            </span>
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 text-forest-900/50 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={label}
            className="absolute z-20 mt-2 max-h-[22rem] w-full overflow-auto rounded-2xl border border-forest-900/15 bg-bone-50 p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.28)]"
          >
            {rows.map(({ m, cost }) => {
              const s = splitModel(m.id);
              const selected = m.id === value;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-option
                  onClick={() => choose(m.id)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-900/30 ${
                    selected ? "bg-forest-900/[0.07]" : "hover:bg-forest-900/[0.04]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[0.875rem] font-medium text-forest-900">
                        {s.name}
                      </span>
                      {m.id === cheapest && <Badge tone="good">Cheapest</Badge>}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-forest-900/55">
                      {providerLabel(s.provider)} · {formatLocal(m.inPerM, fx.perUsd, fx.currency)} in /{" "}
                      {formatLocal(m.outPerM, fx.perUsd, fx.currency)} out per 1M tokens
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[0.875rem] font-medium text-forest-900">
                      {formatLocal(cost, fx.perUsd, fx.currency)}
                    </span>
                    <span className="block text-[0.6875rem] text-forest-900/50">per report</span>
                  </span>
                </button>
              );
            })}

            <div className="mt-1.5 border-t border-forest-900/10 p-2.5">
              <label className="text-[0.75rem] font-medium text-forest-900/65" htmlFor={`custom-${label}`}>
                Use another model
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={`custom-${label}`}
                  type="text"
                  value={custom}
                  spellCheck={false}
                  placeholder="provider/model-name"
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && custom.trim()) {
                      e.preventDefault();
                      choose(custom.trim());
                    }
                  }}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-forest-900/15 bg-bone-50 px-3 text-[0.875rem] text-forest-900 placeholder:text-forest-900/35"
                />
                <button
                  type="button"
                  disabled={!custom.trim()}
                  onClick={() => choose(custom.trim())}
                  className="h-10 rounded-lg bg-forest-900 px-4 text-[0.8125rem] font-medium text-bone-50 disabled:opacity-40"
                >
                  Use
                </button>
              </div>
              <p className="mt-1.5 text-[0.6875rem] text-forest-900/45">
                Exactly as OpenRouter names it. Its price is not known here, so it is left out of the
                estimate.
              </p>
            </div>
          </div>
        )}
      </div>
    </Row>
  );
}

function CostSummary({
  draftId,
  humanizerId,
  models,
  source,
  fx,
}: {
  draftId: string;
  humanizerId: string;
  models: ModelPrice[];
  source: "live" | "built-in";
  fx: FxRate;
}) {
  const find = (id: string) => models.find((m) => m.id === id);
  const cost = reportCost(find(draftId), find(humanizerId));
  const rate = fx.perUsd;
  const before = reportCost(find("anthropic/claude-sonnet-4.5"), undefined).draft;

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-forest-900/[0.04] p-4">
      <p className="text-[0.75rem] font-medium tracking-wide text-forest-900/55 uppercase">
        Average cost per report
      </p>
      {cost.total !== null ? (
        <>
          <p className="mt-1 font-[family-name:var(--font-serif)] text-[1.875rem] leading-none text-forest-900">
            {formatLocal(cost.total, rate, fx.currency)}
          </p>
          <p className="mt-2 text-[0.8125rem] text-forest-900/65">
            Drafting {formatLocal(cost.draft!, rate, fx.currency)} plus humaniser {formatLocal(cost.humanizer!, rate, fx.currency)}.
            About {formatLocal(cost.total * 1000, rate, fx.currency)} for 1,000 reports.
            {before !== null && cost.total < before
              ? ` Before, drafting alone on Claude Sonnet 4.5 was about ${formatLocal(before, rate, fx.currency)}.`
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-1 text-[0.875rem] text-forest-900/65">
          One of the models has no known price, so there is no total. Pick one from the list to
          compare.
        </p>
      )}
      <p className="mt-3 text-[0.75rem] leading-relaxed text-forest-900/50">
        An estimate from measured sizes: the draft reads about{" "}
        {REPORT_TOKENS.draftIn.toLocaleString("en-GB")} tokens and writes about{" "}
        {REPORT_TOKENS.draftOut.toLocaleString("en-GB")}; the humaniser reads about{" "}
        {REPORT_TOKENS.humanizerIn.toLocaleString("en-GB")} (its rules plus the draft) and writes
        about {REPORT_TOKENS.humanizerOut.toLocaleString("en-GB")}. OpenRouter bills in US dollars;
        shown here at KES {rate.toFixed(2)} to the dollar
        {fx.source === "live"
          ? `, from ${fx.provider}${fx.asOf ? ` (${new Date(fx.asOf).toLocaleDateString("en-GB")})` : ""}`
          : ", a built-in estimate, as no exchange-rate source could be reached"}
        . Model prices are{" "}
        {source === "live" ? "live from OpenRouter" : "built-in figures, as OpenRouter could not be reached"}
        . Retries after a failed check cost extra.
        {fx.provider === "ExchangeRate-API" && (
          <>
            {" "}
            <a
              href="https://www.exchangerate-api.com"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Rates by Exchange Rate API
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-forest-900" : "bg-forest-900/25"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-bone-50 transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

/** Shown whenever a key is being replaced, removed or the payment mode changed. */
function RotationWarning({ goingLive }: { goingLive: boolean }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-clay-400/40 bg-clay-400/10 p-4 text-[0.875rem] leading-relaxed text-clay-500"
    >
      <p className="font-medium">You are changing a live key. Read this before saving.</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          The change takes effect on the next request. A wrong or revoked key stops payments or
          report writing straight away.
        </li>
        <li>
          Pesapal keys decide where customers&apos; money goes. Only paste keys from the
          organisation&apos;s own merchant account.
        </li>
        <li>
          OpenRouter keys spend real credit on every report. A leaked key can be used by anyone.
        </li>
        <li>
          Saving does not cancel the old key at the provider. After rotating, revoke the old key in
          Pesapal or OpenRouter yourself.
        </li>
        <li>
          Keys are write-only: once saved they are encrypted and cannot be shown again, so keep a
          copy somewhere safe.
        </li>
        {goingLive && (
          <li>
            <strong>Live mode moves real money.</strong> Confirm the merchant account is approved
            and a test payment has worked in sandbox first.
          </li>
        )}
      </ul>
    </div>
  );
}

type Secrets = { value: string; clear: boolean };
const blankSecret: Secrets = { value: "", clear: false };

export type SettingsSection = "all" | "pricing" | "reports" | "email";

export function SettingsForm({
  initial,
  models,
  pricesFrom,
  fx,
  section = "all",
}: {
  initial: SettingsView;
  models: ModelPrice[];
  pricesFrom: "live" | "built-in";
  fx: FxRate;
  /**
   * Which cards to show. The form keeps every value in state whatever is on
   * screen, and only sends what changed, so saving from one tab never writes a
   * field belonging to another.
   */
  section?: SettingsSection;
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);

  const [required, setRequired] = useState(initial.requirePayment.value);
  const [emailOn, setEmailOn] = useState(initial.emailEnabled.value);
  const [kinds, setKinds] = useState(initial.emailKinds);
  const [switching, setSwitching] = useState(false);

  const [inbox, setInbox] = useState(initial.contactInbox.value);

  const [pesapalEnv, setPesapalEnv] = useState(initial.pesapal.env.value);
  const [ipnId, setIpnId] = useState(initial.pesapal.ipnId.value);
  const [consumerKey, setConsumerKey] = useState<Secrets>(blankSecret);
  const [consumerSecret, setConsumerSecret] = useState<Secrets>(blankSecret);

  const [draftModel, setDraftModel] = useState(initial.openrouter.draftModel.value);
  const [humanizerModel, setHumanizerModel] = useState(initial.openrouter.humanizerModel.value);
  const [apiKey, setApiKey] = useState<Secrets>(blankSecret);

  const [saving, setSaving] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function put(body: unknown): Promise<SettingsView> {
    const res = await fetch("/api/dashboard/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? "The settings could not be saved.");
    return data.settings as SettingsView;
  }

  /** Saves a switch straight away, and puts it back if the save fails. */
  async function flip(
    patch:
      | { requirePayment: boolean }
      | { emailEnabled: boolean }
      | { emailKinds: Partial<Record<EmailKind, boolean>> },
    set: (v: boolean) => void,
    previous: boolean,
    next: boolean,
  ) {
    setSwitching(true);
    setMessage(null);
    set(next);
    try {
      setView(await put(patch));
      router.refresh();
    } catch (err) {
      set(previous);
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSwitching(false);
    }
  }

  // Replacing or removing a key, or changing the payment environment, needs an
  // explicit acknowledgement before it can be saved.
  const envChanged = pesapalEnv !== view.pesapal.env.value;
  const sensitive =
    Boolean(consumerKey.value.trim() || consumerKey.clear) ||
    Boolean(consumerSecret.value.trim() || consumerSecret.clear) ||
    Boolean(apiKey.value.trim() || apiKey.clear) ||
    envChanged;
  const goingLive = envChanged && pesapalEnv === "live";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Only send what changed. Sending the untouched values would copy an
    // environment value or a default into the dashboard and pin it there.
    const secretChange = (s: Secrets) => (s.clear ? null : s.value.trim() ? s.value.trim() : undefined);
    const textChange = (now: string, was: string) => (now.trim() === was ? undefined : now.trim() || null);

    try {
      const next = await put({
        acknowledged: sensitive && acknowledged,
        contactInbox: textChange(inbox, view.contactInbox.value),
        pesapal: {
          consumerKey: secretChange(consumerKey),
          consumerSecret: secretChange(consumerSecret),
          env: textChange(pesapalEnv, view.pesapal.env.value),
          ipnId: textChange(ipnId, view.pesapal.ipnId.value),
        },
        openrouter: {
          apiKey: secretChange(apiKey),
          draftModel: textChange(draftModel, view.openrouter.draftModel.value),
          humanizerModel: textChange(humanizerModel, view.openrouter.humanizerModel.value),
        },
      });
      setView(next);
      setInbox(next.contactInbox.value);
      setPesapalEnv(next.pesapal.env.value);
      setIpnId(next.pesapal.ipnId.value);
      setDraftModel(next.openrouter.draftModel.value);
      setHumanizerModel(next.openrouter.humanizerModel.value);
      setConsumerKey(blankSecret);
      setConsumerSecret(blankSecret);
      setApiKey(blankSecret);
      setAcknowledged(false);
      setMessage({ kind: "ok", text: "Saved. New requests use these settings straight away." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const locked = !view.encryption;

  /** Whether a card belongs on the tab being shown. */
  const show = (name: Exclude<SettingsSection, "all">) =>
    section === "all" || section === name;

  // The save button and the key warning only make sense where there is a field
  // to save. The switches above save themselves as they are flipped.
  const showsSecrets = show("pricing") || show("reports") || show("email");
  // A company on the shared keys has nothing to fill in on those tabs, so a
  // save button there would only be a button that does nothing.
  const hasFields =
    (show("pricing") && !view.managed.pesapal) ||
    (show("reports") && !view.managed.openrouter) ||
    show("email");

  return (
    <div className="flex flex-col gap-6">
      {show("pricing") && (
      <Card
        title="Testing"
        note="Turn this off to let people start an assessment from the pricing page without paying. Those runs are recorded as waived, so they never count as revenue."
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[0.9375rem] font-medium text-forest-900">
              Require payment before an assessment
            </p>
            <p className="mt-1 text-[0.8125rem] text-forest-900/55">
              {required
                ? "On. The pricing buttons open the payment gateway."
                : "Off. The pricing buttons open the assessment directly. Switch this back on before launch."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Switch
              checked={required}
              label="Require payment before an assessment"
              disabled={switching}
              onChange={(next) => void flip({ requirePayment: next }, setRequired, required, next)}
            />
            <SourceTag source={view.requirePayment.source} />
          </div>
        </div>
      </Card>
      )}

      {show("email") && (
      <Card
        title="Email"
        note="One master switch for everything the site sends, and a switch for each kind of message. A message goes out only when both the master switch and its own switch are on."
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[0.9375rem] font-medium text-forest-900">Send email</p>
            <p className="mt-1 text-[0.8125rem] text-forest-900/55">
              {emailOn
                ? "On. Each kind below is sent unless it is switched off."
                : "Off. Nothing is sent, including contact form enquiries. People are shown their link to copy by hand, and each message is written to the server log."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Switch
              checked={emailOn}
              label="Send email"
              disabled={switching}
              onChange={(next) => void flip({ emailEnabled: next }, setEmailOn, emailOn, next)}
            />
            <SourceTag source={view.emailEnabled.source} />
          </div>
        </div>

        <div
          className={`flex flex-col divide-y divide-forest-900/10 rounded-2xl border border-forest-900/10 transition-opacity ${
            emailOn ? "" : "opacity-50"
          }`}
        >
          {EMAIL_KINDS.map((k) => (
            <div key={k.id} className="flex items-start justify-between gap-6 p-4">
              <div>
                <p className="text-[0.875rem] font-medium text-forest-900">{k.label}</p>
                <p className="mt-0.5 text-[0.8125rem] text-forest-900/55">{k.description}</p>
                <EmailPreviewButton kind={k.id} label={k.label} />
                {!emailOn && kinds[k.id] && (
                  <p className="mt-1 text-[0.75rem] text-forest-900/50">
                    Held back by the master switch.
                  </p>
                )}
              </div>
              <Switch
                checked={kinds[k.id]}
                label={k.label}
                disabled={switching}
                onChange={(next) =>
                  void flip(
                    { emailKinds: { [k.id]: next } },
                    (v) => setKinds((cur) => ({ ...cur, [k.id]: v })),
                    kinds[k.id],
                    next,
                  )
                }
              />
            </div>
          ))}
        </div>
      </Card>
      )}

      {locked && showsSecrets && (
        <p className="rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          Secrets cannot be saved from here yet: <code>RMI_SETTINGS_KEY</code> is not set on the
          server. Add it to the server environment (any long random string, for example from{" "}
          <code>openssl rand -base64 32</code>) and restart. Keys set in the environment keep
          working, and the other fields below can still be saved.
        </p>
      )}

      <form onSubmit={save} className="flex flex-col gap-6">
        {show("email") && (
        <Card
          title="Contact form"
          note="Enquiries from the website contact form are emailed to this address. Clear it to fall back to the server environment."
        >
          <TextField
            label="Inbox address"
            view={view.contactInbox}
            value={inbox}
            onValue={setInbox}
            placeholder="info@example.com"
          />
        </Card>
        )}

        {show("pricing") && view.managed.pesapal && (
          <Card
            title="Payments (Pesapal)"
            note="Card payments go through the platform's Pesapal account."
          >
            <p className="text-[0.875rem] leading-relaxed text-forest-900/65">
              Nothing to set up here. The administrator manages the payment keys and the money is
              handled on your behalf. If you would rather take payments into your own Pesapal
              account, ask them to switch this off for your company.
            </p>
          </Card>
        )}

        {show("pricing") && !view.managed.pesapal && (
        <Card
          title="Payments (Pesapal)"
          note="A value saved here wins over the server environment. Remove it to go back to the environment."
        >
          <SecretField
            label="Consumer key"
            view={view.pesapal.consumerKey}
            value={consumerKey.value}
            clear={consumerKey.clear}
            onValue={(value) => setConsumerKey({ ...consumerKey, value })}
            onClear={(clear) => setConsumerKey({ value: "", clear })}
            disabled={locked}
          />
          <SecretField
            label="Consumer secret"
            view={view.pesapal.consumerSecret}
            value={consumerSecret.value}
            clear={consumerSecret.clear}
            onValue={(value) => setConsumerSecret({ ...consumerSecret, value })}
            onClear={(clear) => setConsumerSecret({ value: "", clear })}
            disabled={locked}
          />
          <Row
            label="Environment"
            tag={<SourceTag source={view.pesapal.env.source} />}
            hint="Sandbox moves no real money. Choose live only once the merchant account is approved."
          >
            <Select
              value={pesapalEnv}
              onChange={setPesapalEnv}
              aria-label="Pesapal environment"
              options={[
                { value: "sandbox", label: "Sandbox (testing)" },
                { value: "live", label: "Live (real money)" },
              ]}
            />
          </Row>
          <TextField
            label="IPN id (optional)"
            view={view.pesapal.ipnId}
            value={ipnId}
            onValue={setIpnId}
            hint="Pins one IPN registration. Leave empty and the app registers its own."
          />
        </Card>
        )}

        {show("reports") && view.managed.openrouter && (
          <Card
            title="Report writing (OpenRouter)"
            note="Reports are drafted on the platform's OpenRouter key."
          >
            <p className="text-[0.875rem] leading-relaxed text-forest-900/65">
              Nothing to set up here. The administrator manages the key, the models and the credit.
              If report writing stops, they are told, and you will see a notice on your dashboard.
              To use your own OpenRouter account, ask them to switch this off for your company.
            </p>
            {view.creditsOut && (
              <p role="alert" className="mt-3 text-[0.875rem] font-medium text-clay-500">
                The shared OpenRouter credit has run out. Reports cannot be written until the
                administrator tops it up.
              </p>
            )}
          </Card>
        )}

        {show("reports") && !view.managed.openrouter && (
        <Card
          title="Report writing (OpenRouter)"
          note="Every report is drafted by the first model, then edited by the humaniser model. Both run through the same key."
        >
          {view.creditsOut && (
            <p role="alert" className="text-[0.875rem] font-medium text-clay-500">
              OpenRouter reported that this key has no credit left, so reports are not being
              written. Add credit in your OpenRouter account, or save a new key below. This notice
              clears itself on the next report that goes through.
            </p>
          )}
          <SecretField
            label="API key"
            view={view.openrouter.apiKey}
            value={apiKey.value}
            clear={apiKey.clear}
            onValue={(value) => setApiKey({ ...apiKey, value })}
            onClear={(clear) => setApiKey({ value: "", clear })}
            disabled={locked}
          />
          <ModelPicker
            label="Drafting model"
            view={view.openrouter.draftModel}
            value={draftModel}
            onValue={setDraftModel}
            models={models}
            fx={fx}
            role={DRAFT_ROLE}
            hint="Writes the report to the fixed structure. A low-cost model is enough."
          />
          <ModelPicker
            label="Humaniser model"
            view={view.openrouter.humanizerModel}
            value={humanizerModel}
            onValue={setHumanizerModel}
            models={models}
            fx={fx}
            role={HUMANIZER_ROLE}
            hint="Edits the draft's prose. Prefer one that follows editing instructions closely."
          />
          <CostSummary
            draftId={draftModel}
            humanizerId={humanizerModel}
            models={models}
            source={pricesFrom}
            fx={fx}
          />
        </Card>
        )}

        {sensitive && (
          <div className="flex flex-col gap-3">
            <RotationWarning goingLive={goingLive} />
            <label className="flex items-start gap-3 text-[0.875rem] text-forest-900">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              I understand this changes a live key or payment mode, and I have the new value
              backed up.
            </label>
          </div>
        )}

        {hasFields && (
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              arrow
              disabled={saving || (sensitive && !acknowledged)}
            >
              {saving ? "Saving..." : "Save settings"}
            </Button>
            {message && (
              <p
                role="status"
                className={`text-[0.875rem] ${message.kind === "ok" ? "text-forest-700" : "text-clay-500"}`}
              >
                {message.text}
              </p>
            )}
            {view.updatedAt && (
              <p className="text-[0.8125rem] text-forest-900/45">
                Last changed {new Date(view.updatedAt).toLocaleString("en-GB")}
                {view.updatedBy ? ` by ${view.updatedBy}` : ""}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
