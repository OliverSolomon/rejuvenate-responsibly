"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { WordcraftEditor as Editor } from "@gamine/wordcraft-react/core";
import { Button } from "@/components/ui/button";
import type { OutstandingParty } from "@/components/dashboard/send-report";

const WordcraftEditor = dynamic(
  () => import("@gamine/wordcraft-react").then((m) => m.WordcraftEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[820px] items-center justify-center rounded-card border border-forest-900/10 bg-bone-50">
        <p className="text-[0.875rem] text-forest-900/55">Laying out the document</p>
      </div>
    ),
  },
);

type Stage =
  | { kind: "idle" }
  | { kind: "working"; step: string }
  | { kind: "sent"; to: string; attached: boolean }
  | { kind: "error"; message: string };

/**
 * The last look before a report goes out.
 *
 * The document is opened in the same editor that renders the PDF, so this is
 * not an approximation of what the client will receive: pressing send exports
 * the PDF from this very document, stores it and attaches it to the email.
 */
export function ReportPreview({
  assessmentId,
  submitterEmail,
  documentHtml,
  filename,
  templateVersion,
  usingBuiltInTemplate,
  outstanding,
  sentAt,
  editorName,
}: {
  assessmentId: string;
  submitterEmail: string;
  documentHtml: string;
  filename: string;
  templateVersion: number;
  usingBuiltInTemplate: boolean;
  outstanding: OutstandingParty[];
  sentAt: string | null;
  editorName: string;
}) {
  const router = useRouter();
  const editorRef = useRef<Editor>(null);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [acknowledged, setAcknowledged] = useState(false);

  const document0 = useMemo(
    () => ({ name: `${assessmentId}-report.html`, data: new TextEncoder().encode(documentHtml) }),
    [assessmentId, documentHtml],
  );

  const needsAcknowledgement = outstanding.length > 0;
  const busy = stage.kind === "working";

  /** The PDF of what is on screen, from the editor that drew it. */
  const exportPdf = useCallback((): Blob | null => {
    const editor = editorRef.current;
    if (!editor) return null;
    return editor.exportBlob("pdf");
  }, []);

  const download = useCallback(() => {
    const blob = exportPdf();
    if (!blob) {
      setStage({ kind: "error", message: "The editor is not ready yet." });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportPdf, filename]);

  const sendIt = useCallback(async () => {
    if (needsAcknowledgement && !acknowledged) {
      setStage({
        kind: "error",
        message: "Confirm you are sending without the outstanding answers first.",
      });
      return;
    }

    try {
      setStage({ kind: "working", step: "Rendering the PDF" });
      const blob = exportPdf();
      if (!blob) throw new Error("The editor is not ready yet.");

      setStage({ kind: "working", step: "Storing the document" });
      const put = await fetch(
        `/api/dashboard/report/${assessmentId}/pdf?templateVersion=${templateVersion}`,
        { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: blob },
      );
      if (!put.ok) {
        const data = await put.json().catch(() => ({}));
        throw new Error(data?.error ?? "The PDF could not be stored.");
      }

      setStage({ kind: "working", step: "Sending the email" });
      const res = await fetch(`/api/dashboard/report/${assessmentId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged: acknowledged || !needsAcknowledgement }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The report could not be sent.");

      setStage({ kind: "sent", to: data.to ?? submitterEmail, attached: Boolean(data.attached) });
      router.refresh();
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "The report could not be sent.",
      });
    }
  }, [
    acknowledged,
    assessmentId,
    exportPdf,
    needsAcknowledgement,
    router,
    submitterEmail,
    templateVersion,
  ]);

  return (
    <div>
      <div className="rounded-card border border-forest-900/10 bg-bone-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="display text-[1.0625rem]">
              {sentAt ? "This report has already been sent" : "Ready to send"}
            </p>
            <p className="mt-1.5 max-w-[60ch] text-[0.875rem] leading-relaxed text-forest-900/60">
              {sentAt
                ? "Sending again replaces the stored document with what is on screen and emails it afresh."
                : "This is the document itself, not a likeness of it. Sending stores this PDF and attaches it to the email, alongside the link."}
            </p>
            <p className="mt-2 text-[0.8125rem] text-forest-900/50">
              Going to {submitterEmail}
              {usingBuiltInTemplate
                ? ". Built from the built-in template, since none has been published."
                : `. Built from your template, version ${templateVersion}.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={download} disabled={busy}>
              Download a copy
            </Button>
            <Button size="sm" onClick={sendIt} disabled={busy}>
              {busy ? stage.step : sentAt ? "Send again" : "Send to client"}
            </Button>
          </div>
        </div>

        {needsAcknowledgement && !sentAt && (
          <div className="mt-5 rounded-xl border border-clay-400/30 bg-clay-400/8 p-4">
            <p className="text-[0.875rem] text-forest-900/75">
              {outstanding.length === 1
                ? "One invited stakeholder has not answered:"
                : `${outstanding.length} invited stakeholders have not answered:`}
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-[0.8125rem] text-forest-900/60">
              {outstanding.map((p) => (
                <li key={p.email}>
                  {p.name || p.email}
                  {p.relationship ? `, ${p.relationship}` : ""}
                  {p.undelivered ? " (the invitation never arrived)" : ""}
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-start gap-2.5 text-[0.875rem] text-forest-900/75">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5"
              />
              <span>Send the report without their answers.</span>
            </label>
          </div>
        )}

        {stage.kind === "error" && (
          <p className="mt-4 text-[0.875rem] text-clay-500" role="status">
            {stage.message}
          </p>
        )}
        {stage.kind === "sent" && (
          <p className="mt-4 text-[0.875rem] text-forest-700" role="status">
            Sent to {stage.to}
            {stage.attached ? " with the PDF attached." : ", though the PDF did not attach."}
          </p>
        )}
      </div>

      <div className="mt-6">
        <WordcraftEditor
          ref={editorRef}
          document={document0}
          user={{ name: editorName }}
          wasmUrl="/wordcraft/wordcraft_embed_bg.wasm"
          autoSave={false}
          mode="viewing"
          height={820}
          ribbon="tabs"
          tabs={["File", "Home", "View"]}
          fallback={(error) => (
            <div className="rounded-card border border-forest-900/10 bg-bone-50 p-8">
              <p className="display text-[1.0625rem]">The preview could not be drawn</p>
              <p className="mt-2 max-w-[52ch] text-[0.875rem] leading-relaxed text-forest-900/60">
                It needs WebGPU or WebGL2. Without it there is no way to render the PDF here, so
                send from a browser that has it. The report itself is untouched.
              </p>
              <p className="mt-3 text-[0.75rem] text-forest-900/40">{error.message}</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}
