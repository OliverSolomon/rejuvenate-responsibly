"use client";

import { AnswerToggle } from "./answer-toggle";
import type { Question } from "@/lib/rmi/questions";
import type { Answer } from "@/lib/rmi/scoring";

export function QuestionRow({
  question,
  number,
  answer,
  onBase,
  onFollowUp,
  flagged,
}: {
  question: Question;
  number: number;
  answer: Answer | undefined;
  onBase: (value: boolean) => void;
  onFollowUp: (value: boolean) => void;
  /** Highlighted because the person tried to submit while it was still open. */
  flagged: boolean;
}) {
  const answered = answer?.base != null;
  const showFollowUp = Boolean(question.followUp) && answer?.base === true;

  return (
    <li
      id={`q-${question.id}`}
      className={`scroll-mt-40 border-b border-forest-900/8 px-4 py-6 transition-colors duration-300 sm:px-6 ${
        flagged ? "bg-clay-400/8" : answered ? "bg-transparent" : "bg-transparent"
      }`}
    >
      <div className="grid gap-4 sm:grid-cols-[2rem_1fr_auto] sm:gap-5">
        <span
          className={`hidden pt-0.5 font-[family-name:var(--font-serif)] text-lg tabular-nums sm:block ${
            answered ? "text-forest-700" : "text-forest-900/25"
          }`}
        >
          {String(number).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-forest-900/55">{question.topic}</p>
          <p className="mt-1.5 text-[1.0625rem] leading-snug text-forest-900">
            {question.question}
          </p>
          {(question.sdg || question.gri) && (
            <p className="mt-3 flex flex-wrap gap-2 text-[0.6875rem] text-forest-900/40">
              {question.sdg && question.sdg !== "N/A" && (
                <span className="rounded-full bg-forest-900/6 px-2 py-0.5">{question.sdg}</span>
              )}
              {question.gri && question.gri !== "N/A" && (
                <span className="rounded-full bg-forest-900/6 px-2 py-0.5">{question.gri}</span>
              )}
            </p>
          )}
        </div>

        <div className="sm:pt-0.5">
          <AnswerToggle
            name={question.id}
            legend={question.question}
            value={answer?.base ?? null}
            onChange={onBase}
          />
        </div>
      </div>

      {showFollowUp && question.followUp && (
        <div className="mt-5 sm:ml-[3.25rem]">
          <div className="flex flex-col gap-4 rounded-2xl border border-forest-900/10 bg-lime-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="min-w-0">
              <p className="eyebrow text-forest-700">Going one level deeper</p>
              <p className="mt-2 text-[0.9375rem] leading-snug text-forest-900">
                {question.followUp}
              </p>
            </div>
            <AnswerToggle
              name={`${question.id}-followup`}
              legend={question.followUp}
              value={answer?.followUp ?? null}
              onChange={onFollowUp}
              size="sm"
              tone="muted"
            />
          </div>
        </div>
      )}
    </li>
  );
}
