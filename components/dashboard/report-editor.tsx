"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
// From `/core`, not the package root: the root re-exports `WordcraftEditor` as
// the React component, which shadows the editor interface of the same name.
import type { SavedFile, WordcraftEditor as Editor } from "@gamine/wordcraft-react/core";

/**
 * The report editor. WordCraft draws on WebGPU or WebGL2 and loads a WebAssembly
 * runtime, so none of it can run on the server: the whole component is loaded in
 * the browser only.
 */
const WordcraftEditor = dynamic(
  () => import("@gamine/wordcraft-react").then((m) => m.WordcraftEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[720px] items-center justify-center rounded-card border border-forest-900/10 bg-bone-50">
        <p className="text-[0.875rem] text-forest-900/55">Starting the editor</p>
      </div>
    ),
  },
);

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string };

export function ReportEditor({
  assessmentId,
  organisation,
  markdown,
  editorName,
}: {
  assessmentId: string;
  organisation: string;
  markdown: string;
  editorName: string;
}) {
  const router = useRouter();
  const editorRef = useRef<Editor>(null);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  // Built once. A new object here would reload the document and throw away
  // whatever the person had typed.
  const document = useMemo(
    () => ({
      name: `${assessmentId}-report.md`,
      data: new TextEncoder().encode(markdown),
    }),
    [assessmentId, markdown],
  );

  const persist = useCallback(
    async (text: string) => {
      setState({ kind: "saving" });
      try {
        const res = await fetch(`/api/dashboard/report/${assessmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown: text }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `The server answered ${res.status}.`);
        }
        setState({
          kind: "saved",
          at: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        // So the detail view shows the new wording and the issued badge.
        router.refresh();
      } catch (error) {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "The save did not go through.",
        });
      }
    },
    [assessmentId, router],
  );

  // WordCraft's own Save button hands us the file it wrote. We ignore its bytes
  // and ask the editor for Markdown instead, so the stored report stays Markdown
  // whatever format the person saved as.
  const onSave = useCallback(
    (_file: SavedFile, editor: Editor) => persist(editor.getMarkdown()),
    [persist],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.8125rem] text-forest-900/55">
          Editing the report for {organisation}. Saving replaces what the reader sees;
          the original wording is kept underneath.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[0.8125rem] text-forest-900/55" role="status">
            {state.kind === "saving" && "Saving"}
            {state.kind === "saved" && `Saved at ${state.at}`}
            {state.kind === "error" && state.message}
          </span>
          <button
            type="button"
            onClick={() => {
              const editor = editorRef.current;
              if (editor) void persist(editor.getMarkdown());
            }}
            disabled={state.kind === "saving"}
            className="rounded-full bg-forest-900 px-5 py-2 text-[0.8125rem] font-medium text-bone-50 transition hover:bg-forest-700 disabled:opacity-50"
          >
            Save report
          </button>
        </div>
      </div>

      <WordcraftEditor
        ref={editorRef}
        document={document}
        user={{ name: editorName }}
        wasmUrl="/wordcraft/wordcraft_embed_bg.wasm"
        autoSave={false}
        height={760}
        tabs={["File", "Home", "Insert", "Layout", "Review", "View"]}
        onSave={onSave}
        fallback={(error) => (
          <div className="rounded-card border border-forest-900/10 bg-bone-50 p-8">
            <p className="display text-[1.0625rem]">The editor could not start</p>
            <p className="mt-2 max-w-[52ch] text-[0.875rem] leading-relaxed text-forest-900/60">
              It needs WebGPU or WebGL2. Try a current Chrome, Edge or Firefox with
              hardware acceleration on. The report itself is untouched.
            </p>
            <p className="mt-3 text-[0.75rem] text-forest-900/40">{error.message}</p>
          </div>
        )}
      />
    </div>
  );
}
