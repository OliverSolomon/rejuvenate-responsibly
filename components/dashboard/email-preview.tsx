"use client";

import { Fragment, useEffect, useState } from "react";
import {
  assessmentAccessEmail,
  deliveryNoticeEmail,
  reportReadyEmail,
  shareInviteEmail,
  teamInviteEmail,
} from "@/lib/rmi/email-copy";
import type { EmailKind } from "@/lib/rmi/email-kinds";
import { cn } from "@/lib/utils";

/** A stand-in the message is built around, written as a {{field}} so it can be picked out again. */
const f = (name: string) => `{{${name}}}`;

type Preview = { subject: string; text: string };

/**
 * The real wording of each email, built by the same functions that send it, with
 * every detail that changes from one message to the next left as a {{field}}.
 */
function previewFor(kind: EmailKind): Preview {
  switch (kind) {
    case "assessment":
      return assessmentAccessEmail({
        organisation: f("organisation"),
        code: f("assessment_id"),
        link: f("assessment_link"),
      });
    case "invite":
      return shareInviteEmail({ organisation: f("organisation"), link: f("survey_link") });
    case "report":
      return reportReadyEmail({
        organisation: f("organisation"),
        code: f("assessment_id"),
        link: f("report_link"),
        // Only ever printed, so a field stands in for the count.
        respondents: f("stakeholders") as unknown as number,
      });
    case "notice":
      return deliveryNoticeEmail({
        contactName: f("contact_name"),
        organisation: f("organisation"),
        failed: [{ email: f("failed_address"), link: f("survey_link") }],
      });
    case "team":
      return teamInviteEmail({
        invitedBy: f("invited_by"),
        link: f("sign_in_link"),
        returning: false,
      });
    case "enquiry":
      return {
        subject: `Website enquiry: ${f("topic")} (${f("organisation")})`,
        text: [
          `Name: ${f("name")}`,
          `Email: ${f("email")}`,
          `Organisation: ${f("organisation")}`,
          `Topic: ${f("topic")}`,
          "",
          f("message"),
        ].join("\n"),
      };
  }
}

const FIELD = /(\{\{[a-z_]+\}\})/g;

/** Text with each {{field}} picked out as a chip, so what changes is plain to see. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(FIELD).map((part, i) =>
        /^\{\{[a-z_]+\}\}$/.test(part) ? (
          <mark
            key={i}
            className="rounded bg-clay-400/20 px-1 py-px font-mono text-[0.85em] text-clay-500"
          >
            {part.slice(2, -2).replace(/_/g, " ")}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function fieldsIn(p: Preview): string[] {
  return [...new Set([...(p.subject + p.text).matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]))];
}

/** "See template" for one kind of email, opening it in a modal on desktop or mobile. */
export function EmailPreviewButton({ kind, label }: { kind: EmailKind; label: string }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const preview = open ? previewFor(kind) : null;
  const fields = preview ? fieldsIn(preview) : [];

  const message = preview && (
    <div className="bg-white text-forest-900">
      <div className="border-b border-forest-900/10 px-5 py-4">
        <p className={cn("font-semibold", device === "mobile" ? "text-[0.9375rem]" : "text-[1.0625rem]")}>
          <Marked text={preview.subject} />
        </p>
        <p className="mt-2 text-[0.75rem] text-forest-900/55">
          <span className="font-medium text-forest-900/75">Rate My Impact</span>{" "}
          &lt;reports@rejuvenate-responsibly&gt;
        </p>
        <p className="text-[0.75rem] text-forest-900/55">
          to <Marked text="{{recipient}}" />
        </p>
      </div>
      <div
        className={cn(
          "px-5 py-5 leading-relaxed whitespace-pre-wrap break-words",
          device === "mobile" ? "text-[0.8125rem]" : "text-[0.875rem]",
        )}
      >
        <Marked text={preview.text} />
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1.5 text-[0.8125rem] text-forest-700 underline-offset-4 hover:underline"
      >
        See template
      </button>

      {open && preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} email`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-bone-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/10 px-5 py-3">
              <p className="display text-[1rem]">{label}</p>
              <div className="flex items-center gap-3">
                <div
                  role="radiogroup"
                  aria-label="Screen size"
                  className="flex rounded-full border border-forest-900/15 bg-bone-50 p-0.5 text-[0.75rem]"
                >
                  {(["desktop", "mobile"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={device === d}
                      onClick={() => setDevice(d)}
                      className={cn(
                        "rounded-full px-3 py-1 font-medium capitalize transition-colors",
                        device === d
                          ? "bg-forest-900 text-bone-50"
                          : "text-forest-900/55 hover:text-forest-900",
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3 py-1 text-[0.8125rem] text-forest-900/60 hover:text-forest-900"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto bg-[#e9e8e2] p-5">
              {device === "desktop" ? (
                <div className="mx-auto max-w-[640px] overflow-hidden rounded-lg border border-forest-900/10 shadow-sm">
                  {message}
                </div>
              ) : (
                <div className="mx-auto w-[375px] max-w-full rounded-[2rem] border-[10px] border-forest-900 bg-white shadow-lg">
                  <div className="mx-auto mt-1 h-1.5 w-16 rounded-full bg-forest-900/15" />
                  <div className="overflow-hidden rounded-b-[1.4rem]">{message}</div>
                </div>
              )}
            </div>

            <div className="border-t border-forest-900/10 px-5 py-3 text-[0.8125rem] text-forest-900/60">
              {fields.length ? (
                <>
                  <span className="mr-1.5">Filled in for each message:</span>
                  {fields.map((name) => (
                    <mark
                      key={name}
                      className="mr-1.5 inline-block rounded bg-clay-400/20 px-1.5 py-px font-mono text-[0.75rem] text-clay-500"
                    >
                      {name.replace(/_/g, " ")}
                    </mark>
                  ))}
                </>
              ) : (
                "Nothing in this message changes."
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
