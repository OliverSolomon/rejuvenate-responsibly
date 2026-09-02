"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnswerToggle } from "./answer-toggle";
import { ProgressRail } from "./progress-rail";
import { ResultPanel } from "./result-panel";
import { useAssessment } from "./use-assessment";
import { Button } from "@/components/ui/button";
import { SECTIONS, SECTION_ORDER, sectionById, type SectionId } from "@/lib/rmi/questions";
import { scoreAssessment } from "@/lib/rmi/scoring";

type Stage = "intro" | "questions" | "review" | "done";

const SECTORS = [
  "Financial services",
  "Manufacturing",
  "Agriculture and agri-processing",
  "Energy and utilities",
  "Retail and consumer goods",
  "Technology and telecoms",
  "Health",
  "Education",
  "Foundation, NGO or trust",
  "Public sector",
  "Other",
];

export function AssessmentFlow({
  audience = "client",
  reference,
}: {
  audience?: "client" | "stakeholder";
  reference?: string;
}) {
  const storageKey = `rmi:${audience}:${reference ?? "default"}`;
  const a = useAssessment(audience, storageKey);
  const [stage, setStage] = useState<Stage>("intro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreAssessment> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const q = a.questions[a.index];
  const answer = q ? a.answers[q.id] : undefined;
  const needsFollowUp = Boolean(q?.followUp) && answer?.base === true;
  const canAdvance = answer?.base != null && (!needsFollowUp || answer.followUp != null);

  const counts = useMemo(() => {
    const out = {} as Record<SectionId, { answered: number; total: number }>;
    for (const id of SECTION_ORDER) {
      const qs = a.questions.filter((x) => x.section === id);
      out[id] = {
        total: qs.length,
        answered: qs.filter((x) => a.answers[x.id]?.base != null).length,
      };
    }
    return out;
  }, [a.questions, a.answers]);

  const goTo = useCallback(
    (next: number) => {
      a.setIndex(Math.max(0, Math.min(a.questions.length - 1, next)));
      cardRef.current?.focus({ preventScroll: true });
    },
    [a],
  );

  const next = useCallback(() => {
    if (a.index >= a.questions.length - 1) {
      setStage("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goTo(a.index + 1);
  }, [a.index, a.questions.length, goTo]);

  /**
   * Records an answer and moves on by itself. A "yes" with a follow-up waits
   * on that follow-up; everything else advances after a beat, so nobody has to
   * click twice to say the same thing.
   */
  const record = useCallback(
    (value: boolean) => {
      if (!q) return;
      if (needsFollowUp) {
        a.setFollowUp(q, value);
      } else {
        a.setBase(q, value);
        if (value && q.followUp) return; // the follow-up is about to appear
      }
      window.setTimeout(next, 180);
    },
    [q, needsFollowUp, a, next],
  );

  // Keyboard shortcuts. Only while a question is on screen and focus is not in a field.
  useEffect(() => {
    if (stage !== "questions" || !q) return;
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "y" || key === "1") {
        record(true);
        e.preventDefault();
      } else if (key === "n" || key === "2") {
        record(false);
        e.preventDefault();
      } else if (key === "enter" && canAdvance) {
        next();
        e.preventDefault();
      } else if (key === "arrowleft" || (key === "backspace" && !el?.isContentEditable)) {
        if (a.index > 0) {
          goTo(a.index - 1);
          e.preventDefault();
        }
      } else if (key === "arrowright" && canAdvance) {
        next();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, q, canAdvance, a.index, record, next, goTo]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const scored = scoreAssessment(a.answers, audience);
    try {
      const res = await fetch("/api/rmi/assessment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience,
          reference: reference ?? null,
          profile: a.profile,
          answers: a.answers,
          score: {
            overall: scored.overall,
            coverage: scored.coverage,
            depth: scored.depth,
            tier: scored.tier.name,
            sections: scored.sections.map((s) => ({ id: s.id, score: s.score })),
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      // The score still stands locally. Tell the person plainly and let them retry.
      setError(
        "We scored your answers but could not reach the server. Your responses are saved on this device, so you can try submitting again.",
      );
    }
    setResult(scored);
    setStage("done");
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!a.hydrated) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-forest-900/45">
        <p className="text-sm">Loading your assessment...</p>
      </div>
    );
  }

  /* ----------------------------- intro ----------------------------- */
  if (stage === "intro") {
    const profileReady =
      a.profile.organisation.trim().length > 1 &&
      a.profile.contactName.trim().length > 1 &&
      /.+@.+\..+/.test(a.profile.email);

    return (
      <div className="mx-auto w-full max-w-2xl">
        {a.restored && (
          <ResumeBanner
            at={a.restored.at}
            answered={a.restored.answered}
            onResume={() => {
              a.dismissRestored();
              setStage("questions");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDismiss={() => {
              a.clear();
              a.dismissRestored();
            }}
          />
        )}

        <p className="eyebrow text-forest-900/45">
          {audience === "client" ? "Step 1 of 3" : "Stakeholder survey"}
        </p>
        <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
          {audience === "client"
            ? "Tell us who is answering"
            : "Before you start"}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">
          {audience === "client"
            ? `${a.questions.length} yes or no questions across four pillars. Most people finish in about 15 minutes, and your answers save on this device as you go.`
            : `${a.questions.length} yes or no questions about an organisation you work with. Your answers are reported in aggregate, never attributed to you by name.`}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Field
            label={audience === "client" ? "Organisation" : "Organisation you are rating"}
            value={a.profile.organisation}
            onChange={(v) => a.setProfile({ ...a.profile, organisation: v })}
            autoComplete="organization"
            required
          />
          <Field
            label="Your name"
            value={a.profile.contactName}
            onChange={(v) => a.setProfile({ ...a.profile, contactName: v })}
            autoComplete="name"
            required
          />
          <Field
            label="Work email"
            type="email"
            value={a.profile.email}
            onChange={(v) => a.setProfile({ ...a.profile, email: v })}
            autoComplete="email"
            required
          />
          <Field
            label={audience === "client" ? "Your role" : "Your relationship to them"}
            value={a.profile.role}
            onChange={(v) => a.setProfile({ ...a.profile, role: v })}
            placeholder={audience === "client" ? "Head of Sustainability" : "Supplier, investor, community partner"}
          />
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[0.8125rem] font-medium text-forest-900/70">Sector</span>
            <select
              value={a.profile.sector}
              onChange={(e) => a.setProfile({ ...a.profile, sector: e.target.value })}
              className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem] text-forest-900"
            >
              <option value="">Select a sector</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            arrow
            disabled={!profileReady}
            onClick={() => {
              setStage("questions");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Start the assessment
          </Button>
          {!profileReady && (
            <p className="text-[0.8125rem] text-forest-900/45">
              Organisation, name and a valid email get you in.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* --------------------------- questions --------------------------- */
  if (stage === "questions" && q) {
    const section = sectionById(q.section);
    const positionInSection = a.questions
      .filter((x) => x.section === q.section)
      .findIndex((x) => x.id === q.id);
    const sectionTotal = counts[q.section].total;
    const isFirstOfSection = positionInSection === 0;

    return (
      <div className="mx-auto w-full max-w-2xl">
        {/* Tucks just under the fixed site header, and stays opaque so answers
            never read through it. */}
        <div className="sticky top-14 z-10 -mx-5 border-b border-forest-900/8 bg-bone-100 px-5 pb-4 pt-5 sm:-mx-8 sm:px-8">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="text-[0.8125rem] font-medium text-forest-900">{section.title}</p>
            <p className="text-[0.8125rem] tabular-nums text-forest-900/45">
              {a.answeredCount} of {a.questions.length} answered
            </p>
          </div>
          <ProgressRail current={q.section} counts={counts} />
        </div>

        {isFirstOfSection && (
          <div className="mt-8 rounded-card border border-forest-900/10 bg-bone-50 p-6">
            <p className="eyebrow text-forest-900/45">
              Pillar {SECTION_ORDER.indexOf(q.section) + 1} of 4
            </p>
            <h2 className="display mt-3 text-2xl">{section.title}</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-forest-900/60">
              {section.blurb}
            </p>
          </div>
        )}

        <div
          ref={cardRef}
          tabIndex={-1}
          key={q.id}
          className="mt-8 outline-none"
          aria-live="polite"
        >
          <p className="text-[0.8125rem] text-forest-900/45">
            {q.topic} · question {positionInSection + 1} of {sectionTotal}
          </p>
          <h2 className="display mt-4 text-[clamp(1.5rem,3.4vw,2.15rem)] leading-[1.12]">
            {q.question}
          </h2>

          <div className="mt-8">
            <AnswerToggle
              name={q.question}
              value={answer?.base ?? null}
              onChange={record}
            />
          </div>

          {needsFollowUp && q.followUp && (
            <div className="mt-6 rounded-2xl border border-forest-900/12 bg-lime-50 p-5 sm:p-6">
              <p className="eyebrow text-forest-700">Going one level deeper</p>
              <p className="mt-3 text-[1.0625rem] leading-snug text-forest-900">{q.followUp}</p>
              <div className="mt-5">
                <AnswerToggle
                  name={q.followUp}
                  size="sm"
                  value={answer?.followUp ?? null}
                  onChange={record}
                />
              </div>
            </div>
          )}

          {(q.sdg || q.gri) && (
            <p className="mt-6 flex flex-wrap gap-2 text-[0.75rem] text-forest-900/40">
              {q.sdg && q.sdg !== "N/A" && (
                <span className="rounded-full bg-forest-900/6 px-2.5 py-1">{q.sdg}</span>
              )}
              {q.gri && q.gri !== "N/A" && (
                <span className="rounded-full bg-forest-900/6 px-2.5 py-1">{q.gri}</span>
              )}
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-forest-900/10 pt-6">
          <button
            type="button"
            onClick={() => goTo(a.index - 1)}
            disabled={a.index === 0}
            className="text-[0.875rem] text-forest-900/55 transition-colors hover:text-forest-900 disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={next}
              className="text-[0.875rem] text-forest-900/45 transition-colors hover:text-forest-900"
            >
              {answer?.base == null ? "Skip for now" : "Next"}
            </button>
            <Button variant="primary" size="sm" onClick={() => setStage("review")}>
              Review all
            </Button>
          </div>
        </div>

        <p className="mt-5 hidden text-[0.75rem] text-forest-900/35 sm:block">
          Keyboard: Y or N to answer, arrow keys to move, Enter to continue.
        </p>
      </div>
    );
  }

  /* ---------------------------- review ----------------------------- */
  if (stage === "review") {
    const unanswered = a.questions.filter((x) => a.answers[x.id]?.base == null);
    return (
      <div className="mx-auto w-full max-w-3xl">
        <p className="eyebrow text-forest-900/45">Almost there</p>
        <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">Review your answers</h1>
        <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
          {unanswered.length === 0
            ? "Every question has an answer. Change anything you want before you submit."
            : `${unanswered.length} ${unanswered.length === 1 ? "question is" : "questions are"} still open. You can submit without them, but they count as a no in the score.`}
        </p>

        {unanswered.length > 0 && (
          <button
            type="button"
            onClick={() => {
              const i = a.questions.findIndex((x) => x.id === unanswered[0].id);
              a.setIndex(i);
              setStage("questions");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-forest-900/20 px-4 py-2 text-[0.875rem] transition-colors hover:border-forest-900/45"
          >
            Jump to the first open question
          </button>
        )}

        <div className="mt-12 flex flex-col gap-10">
          {SECTIONS.map((s) => {
            const qs = a.questions.filter((x) => x.section === s.id);
            return (
              <div key={s.id}>
                <h2 className="display text-xl">{s.title}</h2>
                <ul className="mt-4 divide-y divide-forest-900/8 border-y border-forest-900/8">
                  {qs.map((question) => {
                    const ans = a.answers[question.id];
                    const i = a.questions.findIndex((x) => x.id === question.id);
                    return (
                      <li key={question.id} className="flex items-start gap-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            a.setIndex(i);
                            setStage("questions");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex-1 text-left text-[0.9375rem] leading-snug text-forest-900/75 transition-colors hover:text-forest-900"
                        >
                          <span className="font-medium text-forest-900">{question.topic}</span>
                          <span className="block text-[0.8125rem] text-forest-900/45">
                            {question.question}
                          </span>
                        </button>
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-[0.75rem] font-medium ${
                            ans?.base === true
                              ? "bg-lime-100 text-forest-700"
                              : ans?.base === false
                                ? "bg-forest-900/8 text-forest-900/60"
                                : "bg-clay-400/12 text-clay-500"
                          }`}
                        >
                          {ans?.base === true
                            ? ans.followUp
                              ? "Yes + depth"
                              : "Yes"
                            : ans?.base === false
                              ? "No"
                              : "Open"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-8 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
            {error}
          </p>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" arrow onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit and see my score"}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setStage("questions");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Keep editing
          </Button>
        </div>
      </div>
    );
  }

  /* ----------------------------- done ------------------------------ */
  return (
    <ResultPanel
      audience={audience}
      result={result!}
      profile={a.profile}
      error={error}
      onRetry={submit}
    />
  );
}

function ResumeBanner({
  at,
  answered,
  onResume,
  onDismiss,
}: {
  at: string;
  answered: number;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const when = new Date(at);
  return (
    <div className="mb-10 flex flex-col gap-4 rounded-card border border-forest-900/12 bg-lime-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[0.9375rem] text-forest-900/75">
        You have {answered} {answered === 1 ? "answer" : "answers"} saved from{" "}
        {when.toLocaleDateString(undefined, { day: "numeric", month: "long" })}.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onResume}>
          Pick up where I left off
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Start fresh
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem] text-forest-900 transition-colors focus:border-forest-900/40"
      />
    </label>
  );
}
