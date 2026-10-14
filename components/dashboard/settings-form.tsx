"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatUsd,
  REPORT_TOKENS,
  reportCost,
  type ModelPrice,
} from "@/lib/rmi/model-cost";
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
        view.unreadable
          ? "A saved value exists but could not be decrypted, because RMI_SETTINGS_KEY changed or is missing. Enter it again to replace it."
          : "Write-only. Once saved it is encrypted and cannot be shown again."
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

const OTHER = "__other__";
const perM = (n: number) => `${n.toFixed(2)}`;

/** A dropdown of known models with their prices, plus a way to type any other. */
function ModelSelect({
  label,
  view,
  value,
  onValue,
  models,
  hint,
}: {
  label: string;
  view: TextView;
  value: string;
  onValue: (v: string) => void;
  models: ModelPrice[];
  hint?: string;
}) {
  const known = models.some((m) => m.id === value);
  const [typing, setTyping] = useState(!known && value !== "");
  const showInput = typing || !known;
  const price = models.find((m) => m.id === value);

  return (
    <Row
      label={label}
      tag={<SourceTag source={view.source} />}
      hint={
        price
          ? `${perM(price.inPerM)} in, ${perM(price.outPerM)} out per million tokens. ${hint ?? ""}`
          : `Price unknown for this model, so it is left out of the estimate below. ${hint ?? ""}`
      }
    >
      <select
        value={showInput ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setTyping(true);
          } else {
            setTyping(false);
            onValue(e.target.value);
          }
        }}
        className={inputClass}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id} · {perM(m.inPerM)} in / {perM(m.outPerM)} out
          </option>
        ))}
        <option value={OTHER}>Other model (type its name)</option>
      </select>
      {showInput && (
        <input
          type="text"
          value={value}
          spellCheck={false}
          placeholder="provider/model-name"
          onChange={(e) => onValue(e.target.value)}
          className={inputClass}
        />
      )}
    </Row>
  );
}

function CostSummary({
  draftId,
  humanizerId,
  models,
  source,
}: {
  draftId: string;
  humanizerId: string;
  models: ModelPrice[];
  source: "live" | "built-in";
}) {
  const find = (id: string) => models.find((m) => m.id === id);
  const cost = reportCost(find(draftId), find(humanizerId));
  const before = reportCost(find("anthropic/claude-sonnet-4.5"), undefined).draft;

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-forest-900/[0.04] p-4">
      <p className="text-[0.75rem] font-medium tracking-wide text-forest-900/55 uppercase">
        Average cost per report
      </p>
      {cost.total !== null ? (
        <>
          <p className="mt-1 font-[family-name:var(--font-serif)] text-[1.875rem] leading-none text-forest-900">
            {formatUsd(cost.total)}
          </p>
          <p className="mt-2 text-[0.8125rem] text-forest-900/65">
            Drafting {formatUsd(cost.draft!)} plus humaniser {formatUsd(cost.humanizer!)}. About{" "}
            {formatUsd(cost.total * 1000)} for 1,000 reports.
            {before !== null && cost.total < before
              ? ` Before, drafting alone on Claude Sonnet 4.5 was about ${formatUsd(before)}.`
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
        about {REPORT_TOKENS.humanizerOut.toLocaleString("en-GB")}. Prices are{" "}
        {source === "live" ? "live from OpenRouter" : "built-in figures, as OpenRouter could not be reached"}
        . Retries after a failed check cost extra.
      </p>
    </div>
  );
}

type Secrets = { value: string; clear: boolean };
const blankSecret: Secrets = { value: "", clear: false };

export function SettingsForm({
  initial,
  models,
  pricesFrom,
}: {
  initial: SettingsView;
  models: ModelPrice[];
  pricesFrom: "live" | "built-in";
}) {
  const router = useRouter();
  const [view, setView] = useState(initial);

  const [required, setRequired] = useState(initial.requirePayment.value);
  const [switching, setSwitching] = useState(false);

  const [pesapalEnv, setPesapalEnv] = useState(initial.pesapal.env.value);
  const [ipnId, setIpnId] = useState(initial.pesapal.ipnId.value);
  const [consumerKey, setConsumerKey] = useState<Secrets>(blankSecret);
  const [consumerSecret, setConsumerSecret] = useState<Secrets>(blankSecret);

  const [draftModel, setDraftModel] = useState(initial.openrouter.draftModel.value);
  const [humanizerModel, setHumanizerModel] = useState(initial.openrouter.humanizerModel.value);
  const [apiKey, setApiKey] = useState<Secrets>(blankSecret);

  const [saving, setSaving] = useState(false);
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

  async function toggle(next: boolean) {
    setSwitching(true);
    setMessage(null);
    const previous = required;
    setRequired(next);
    try {
      setView(await put({ requirePayment: next }));
      router.refresh();
    } catch (err) {
      setRequired(previous);
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSwitching(false);
    }
  }

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
      setPesapalEnv(next.pesapal.env.value);
      setIpnId(next.pesapal.ipnId.value);
      setDraftModel(next.openrouter.draftModel.value);
      setHumanizerModel(next.openrouter.humanizerModel.value);
      setConsumerKey(blankSecret);
      setConsumerSecret(blankSecret);
      setApiKey(blankSecret);
      setMessage({ kind: "ok", text: "Saved. New requests use these settings straight away." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const locked = !view.encryption;

  return (
    <div className="flex flex-col gap-6">
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
            <button
              type="button"
              role="switch"
              aria-checked={required}
              aria-label="Require payment before an assessment"
              disabled={switching}
              onClick={() => void toggle(!required)}
              className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-60 ${
                required ? "bg-forest-900" : "bg-forest-900/25"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-bone-50 transition-all ${
                  required ? "left-6" : "left-1"
                }`}
              />
            </button>
            <SourceTag source={view.requirePayment.source} />
          </div>
        </div>
      </Card>

      {locked && (
        <p className="rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          Secrets cannot be saved from here yet: <code>RMI_SETTINGS_KEY</code> is not set on the
          server. Add it to the server environment (any long random string, for example from{" "}
          <code>openssl rand -base64 32</code>) and restart. Keys set in the environment keep
          working, and the other fields below can still be saved.
        </p>
      )}

      <form onSubmit={save} className="flex flex-col gap-6">
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
            <select
              value={pesapalEnv}
              onChange={(e) => setPesapalEnv(e.target.value)}
              className={inputClass}
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="live">Live (real money)</option>
            </select>
          </Row>
          <TextField
            label="IPN id (optional)"
            view={view.pesapal.ipnId}
            value={ipnId}
            onValue={setIpnId}
            hint="Pins one IPN registration. Leave empty and the app registers its own."
          />
        </Card>

        <Card
          title="Report writing (OpenRouter)"
          note="Every report is drafted by the first model, then edited by the humaniser model. Both run through the same key."
        >
          <SecretField
            label="API key"
            view={view.openrouter.apiKey}
            value={apiKey.value}
            clear={apiKey.clear}
            onValue={(value) => setApiKey({ ...apiKey, value })}
            onClear={(clear) => setApiKey({ value: "", clear })}
            disabled={locked}
          />
          <ModelSelect
            label="Drafting model"
            view={view.openrouter.draftModel}
            value={draftModel}
            onValue={setDraftModel}
            models={models}
            hint="Writes the report to the fixed structure. A low-cost model is enough."
          />
          <ModelSelect
            label="Humaniser model"
            view={view.openrouter.humanizerModel}
            value={humanizerModel}
            onValue={setHumanizerModel}
            models={models}
            hint="Edits the draft's prose. Prefer one that follows editing instructions closely."
          />
          <CostSummary
            draftId={draftModel}
            humanizerId={humanizerModel}
            models={models}
            source={pricesFrom}
          />
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" size="lg" arrow disabled={saving}>
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
      </form>
    </div>
  );
}
