"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionRow } from "./question-row";
import { SectionRail } from "./section-rail";
import { ResultPanel } from "./result-panel";
import { useAssessment } from "./use-assessment";
import { ReferenceCard } from "./reference-card";
import { Button } from "@/components/ui/button";
import { SECTIONS, SECTION_ORDER, type SectionId } from "@/lib/rmi/questions";
import { scoreAssessment } from "@/lib/rmi/scoring";

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
  resumeWith,
}: {
  audience?: "client" | "stakeholder";
  reference?: string;
  resumeWith?: { id: string; token: string };
}) {
  const router = useRouter();
  const storageKey = `rmi:${audience}:${reference ?? "default"}`;
  const a = useAssessment(audience, storageKey, resumeWith);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof scoreAssessment> | null>(null);
  const [confirmingGaps, setConfirmingGaps] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("about-you");

  const profileComplete =
    a.profile.organisation.trim().length > 1 &&
    a.profile.contactName.trim().length > 1 &&
    /.+@.+\..+/.test(a.profile.email);

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

  const unanswered = useMemo(
    () => a.questions.filter((q) => a.answers[q.id]?.base == null),
    [a.questions, a.answers],
  );

  const pct = Math.round((a.answeredCount / a.questions.length) * 100);

  // Highlight whichever section is currently under the sticky header.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-160px 0px -65% 0px", threshold: 0 },
    );
    const ids = ["about-you", ...SECTION_ORDER];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [a.hydrated]);

  const jumpToFirstOpen = useCallback(() => {
    const first = unanswered[0];
    if (!first) return;
    setFlagOpen(true);
    document
      .getElementById(`q-${first.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [unanswered]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    const scored = scoreAssessment(a.answers, audience);
    const score = {
      overall: scored.overall,
      coverage: scored.coverage,
      depth: scored.depth,
      tier: scored.tier.name,
      sections: scored.sections.map((s) => ({ id: s.id, score: s.score })),
    };

    try {
      if (audience === "stakeholder") {
        const res = await fetch("/api/rmi/share", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: reference,
            answers: a.answers,
            name: a.profile.contactName,
            relationship: a.profile.role,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const session = a.session ?? (await a.ensureSession());
        if (!session) throw new Error("no session");
        const res = await fetch("/api/rmi/assessment", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: session.id,
            token: session.token,
            profile: a.profile,
            answers: a.answers,
            score,
            submit: true,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
    } catch {
      // The score still stands locally. Say so plainly and let them retry.
      setError(
        "We scored your answers but could not reach the server. Your responses are saved on this device, so you can try submitting again.",
      );
    }
    setResult(scored);
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [a, audience, reference]);

  function attemptSubmit() {
    if (unanswered.length > 0) {
      setConfirmingGaps(true);
      setFlagOpen(true);
      return;
    }
    void submit();
  }

  if (!a.hydrated || a.resuming) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-forest-900/45">
        <p className="text-sm">{a.resuming ? "Opening your assessment..." : "Loading..."}</p>
      </div>
    );
  }

  if (a.resumeError) {
    return (
      <div className="mx-auto max-w-xl py-16">
        <h1 className="display text-3xl">We could not open that assessment</h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">
          {a.resumeError} Check the link in your email, or enter your reference again.
        </p>
        <div className="mt-8">
          <Button variant="primary" size="lg" arrow onClick={() => router.push("/rmi/resume")}>
            Enter my reference
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <ResultPanel
        audience={audience}
        result={result}
        profile={a.profile}
        session={a.session}
        error={error}
        onRetry={submit}
      />
    );
  }

  return (
    <div>
      {/* Sticky progress, tucked under the site header */}
      <div className="sticky top-14 z-20 -mx-5 border-b border-forest-900/8 bg-bone-100 px-5 pb-3 pt-4 sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4">
          <p className="truncate text-[0.875rem] font-medium text-forest-900">
            {activeSection === "about-you"
              ? "About you"
              : (SECTIONS.find((s) => s.id === activeSection)?.title ?? "Assessment")}
          </p>
          <p className="shrink-0 text-[0.8125rem] tabular-nums text-forest-900/50">
            {a.answeredCount} of {a.questions.length} answered
          </p>
        </div>
        <div className="mx-auto mt-2.5 h-1 max-w-6xl overflow-hidden rounded-full bg-forest-900/10">
          <div
            className="h-full rounded-full bg-forest-700 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* The side rail is desktop only, so small screens get the same jumps
            as a scrollable row of chips. */}
        <nav
          aria-label="Jump to section"
          className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:hidden"
        >
          {[
            { id: "about-you", label: "About you", answered: profileComplete ? 1 : 0, total: 1 },
            ...SECTIONS.map((sec) => ({
              id: sec.id,
              label: sec.short,
              answered: counts[sec.id].answered,
              total: counts[sec.id].total,
            })),
          ].map((chip) => (
            <a
              key={chip.id}
              href={`#${chip.id}`}
              aria-current={activeSection === chip.id ? "true" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors ${
                activeSection === chip.id
                  ? "border-forest-900 bg-forest-900 text-bone-50"
                  : "border-forest-900/15 text-forest-900/65"
              }`}
            >
              {chip.label}
              <span
                className={
                  activeSection === chip.id ? "text-bone-50/60" : "text-forest-900/40"
                }
              >
                {chip.answered}/{chip.total}
              </span>
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl">
        {a.restored && (
          <ResumeBanner
            at={a.restored.at}
            answered={a.restored.answered}
            onDismiss={() => {
              void a.clearAll();
              a.dismissRestored();
            }}
            onKeep={a.dismissRestored}
          />
        )}

        <header className="mt-10">
          <p className="eyebrow text-forest-900/45">
            {audience === "client"
              ? "Rate My Impact · Sustainability Self-Assessment 2026"
              : "Rate My Impact · Stakeholder survey"}
          </p>
          <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
            {audience === "client"
              ? "Your sustainability self-assessment"
              : "A short survey about an organisation you work with"}
          </h1>
          <p className="mt-4 max-w-[58ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
            {audience === "client"
              ? `${a.questions.length} yes or no questions across four pillars, all on this one page. Answer them in any order and every answer saves as you give it. We email you a reference and a link, so you can stop whenever and pick it up from any device.`
              : `${a.questions.length} yes or no questions, all on this one page. Answer them in any order. Your responses are reported in aggregate and never attributed to you by name.`}
          </p>
        </header>

        {audience === "client" && (
          <ReferenceCard session={a.session} sync={a.sync} onClear={a.clearAll} />
        )}

        <div className="mt-12 grid gap-12 lg:grid-cols-[15rem_1fr] lg:gap-14">
          <aside className="hidden lg:block">
            <SectionRail
              counts={counts}
              active={activeSection}
              profileComplete={profileComplete}
            />
          </aside>

          <div>
            {/* ---------------------------- about you ---------------------------- */}
            <section id="about-you" className="scroll-mt-36">
              <SectionHeading
                index="00"
                title="About you"
                blurb="So we know whose report this is and where to send it."
              />
              <div className="mt-7 grid gap-5 rounded-card border border-forest-900/10 bg-bone-50 p-5 sm:grid-cols-2 sm:p-7">
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
                  placeholder={
                    audience === "client"
                      ? "Head of Sustainability"
                      : "Supplier, investor, community partner"
                  }
                />
                <label className="flex flex-col gap-2 sm:col-span-2">
                  <span className="text-[0.8125rem] font-medium text-forest-900/70">Sector</span>
                  <select
                    value={a.profile.sector}
                    onChange={(e) => a.setProfile({ ...a.profile, sector: e.target.value })}
                    className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] text-forest-900"
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
            </section>

            {/* ----------------------------- pillars ----------------------------- */}
            {SECTIONS.map((section, sectionIndex) => {
              const qs = a.questions.filter((q) => q.section === section.id);
              const c = counts[section.id];
              return (
                <section
                  key={section.id}
                  id={section.id}
                  className="mt-16 scroll-mt-36"
                >
                  <SectionHeading
                    index={String(sectionIndex + 1).padStart(2, "0")}
                    title={section.title}
                    blurb={section.blurb}
                    meta={`${c.answered} of ${c.total} answered`}
                  />
                  <ol className="mt-7 overflow-hidden rounded-card border border-forest-900/10 bg-bone-50">
                    {qs.map((question, i) => (
                      <QuestionRow
                        key={question.id}
                        question={question}
                        number={i + 1}
                        answer={a.answers[question.id]}
                        onBase={(v) => a.setBase(question, v)}
                        onFollowUp={(v) => a.setFollowUp(question, v)}
                        flagged={flagOpen && a.answers[question.id]?.base == null}
                      />
                    ))}
                  </ol>
                </section>
              );
            })}

            {/* ------------------------------ submit ----------------------------- */}
            <section className="mt-16 rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-9">
              <h2 className="display text-2xl">
                {unanswered.length === 0 ? "That is everything" : "Ready when you are"}
              </h2>
              <p className="mt-3 max-w-[54ch] text-[0.9375rem] leading-relaxed text-forest-900/65">
                {unanswered.length === 0
                  ? "Every question has an answer. Submit and we will score it straight away."
                  : `${unanswered.length} ${
                      unanswered.length === 1 ? "question is" : "questions are"
                    } still open. You can submit without them, but each one counts as a no in the score.`}
              </p>

              {!profileComplete && (
                <p className="mt-5 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
                  Add your organisation, your name and a valid email in the first section
                  before submitting.
                </p>
              )}

              {error && (
                <p className="mt-5 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
                  {error}
                </p>
              )}

              {confirmingGaps && unanswered.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-forest-900/12 bg-lime-50 p-5">
                  <p className="text-[0.9375rem] text-forest-900">
                    {unanswered.length}{" "}
                    {unanswered.length === 1 ? "question is" : "questions are"} unanswered
                    and will be scored as a no. Submit anyway?
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => void submit()}
                      disabled={submitting || !profileComplete}
                    >
                      {submitting ? "Submitting..." : "Submit anyway"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => {
                        setConfirmingGaps(false);
                        jumpToFirstOpen();
                      }}
                    >
                      Take me to them
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    arrow
                    onClick={attemptSubmit}
                    disabled={submitting || !profileComplete}
                  >
                    {submitting ? "Submitting..." : "Submit and see my score"}
                  </Button>
                  {unanswered.length > 0 && (
                    <Button variant="ghost" size="lg" onClick={jumpToFirstOpen}>
                      Jump to the first open question
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  index,
  title,
  blurb,
  meta,
}: {
  index: string;
  title: string;
  blurb: string;
  meta?: string;
}) {
  return (
    <div className="border-t border-forest-900/12 pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-[family-name:var(--font-serif)] text-xl text-forest-900/30">
          {index}
        </span>
        {meta && (
          <span className="text-[0.8125rem] tabular-nums text-forest-900/45">{meta}</span>
        )}
      </div>
      <h2 className="display mt-2 text-[clamp(1.5rem,3vw,2.15rem)]">{title}</h2>
      <p className="mt-2.5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        {blurb}
      </p>
    </div>
  );
}

function ResumeBanner({
  at,
  answered,
  onKeep,
  onDismiss,
}: {
  at: string;
  answered: number;
  onKeep: () => void;
  onDismiss: () => void;
}) {
  const when = new Date(at);
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-card border border-forest-900/12 bg-lime-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[0.9375rem] text-forest-900/75">
        Picked up {answered} {answered === 1 ? "answer" : "answers"} you saved on{" "}
        {when.toLocaleDateString(undefined, { day: "numeric", month: "long" })}.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onKeep}>
          Keep them
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
        className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem] text-forest-900 transition-colors focus:border-forest-900/40"
      />
    </label>
  );
}
