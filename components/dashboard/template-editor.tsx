"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { WordcraftEditor as Editor } from "@gamine/wordcraft-react/core";
import { Button } from "@/components/ui/button";
import {
  PLACEHOLDERS,
  mergeTemplate,
  placeholdersIn,
  type TemplateValues,
} from "@/lib/rmi/template";

const WordcraftEditor = dynamic(
  () => import("@gamine/wordcraft-react").then((m) => m.WordcraftEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[760px] items-center justify-center rounded-card border border-forest-900/10 bg-bone-50">
        <p className="text-[0.875rem] text-forest-900/55">Starting the editor</p>
      </div>
    ),
  },
);

/** The formats the editor itself can open. PDF is not one of them. */
const ACCEPT = ".docx,.doc,.odt,.rtf,.html,.htm,.md,.txt";

export type TemplateState = {
  version: number;
  live: "published" | "built-in";
  draftHtml: string | null;
  draftAt: string | null;
  draftBy: string | null;
  publishedHtml: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  builtIn: string;
};

type Note = { kind: "ok" | "bad"; text: string } | null;

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export function TemplateEditor({
  state,
  sample,
  editorName,
}: {
  state: TemplateState;
  /** Stand-in values so the preview looks like a real report. */
  sample: TemplateValues;
  editorName: string;
}) {
  const router = useRouter();
  const editorRef = useRef<Editor>(null);
  const [busy, setBusy] = useState<null | "save" | "publish" | "discard" | "open">(null);
  const [note, setNote] = useState<Note>(null);
  const [preview, setPreview] = useState<{
    html: string;
    /** Tokens still in the document after merging: typos, almost always. */
    unfilled: string[];
    missingBody: boolean;
  } | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Where the editor starts: the draft, else what is published, else built in. */
  const startingHtml = state.draftHtml ?? state.publishedHtml ?? state.builtIn;

  const document0 = useMemo(
    () => ({
      name: "report-template.html",
      data: new TextEncoder().encode(startingHtml),
    }),
    [startingHtml],
  );

  const html = () => editorRef.current?.getHTML() ?? "";

  const saveDraft = useCallback(async () => {
    const current = html();
    if (!current.trim()) {
      setNote({ kind: "bad", text: "There is nothing in the editor to save." });
      return;
    }
    setBusy("save");
    setNote(null);
    try {
      const res = await fetch("/api/dashboard/report-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The draft did not save.");
      setNote({ kind: "ok", text: "Draft saved. Nothing a client sees has changed yet." });
      router.refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err instanceof Error ? err.message : "The draft did not save." });
    } finally {
      setBusy(null);
    }
  }, [router]);

  const publish = useCallback(async () => {
    setBusy("publish");
    setNote(null);
    try {
      // Save first, so publishing always takes what is on screen.
      const put = await fetch("/api/dashboard/report-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: html() }),
      });
      if (!put.ok) {
        const data = await put.json().catch(() => ({}));
        throw new Error(data?.error ?? "The draft did not save.");
      }

      const res = await fetch("/api/dashboard/report-template", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Publishing did not work.");
      setNote({
        kind: "ok",
        text: `Published as version ${data.version}. Reports are built from this from now on.`,
      });
      router.refresh();
    } catch (err) {
      setNote({
        kind: "bad",
        text: err instanceof Error ? err.message : "Publishing did not work.",
      });
    } finally {
      setBusy(null);
    }
  }, [router]);

  const discard = useCallback(async () => {
    setBusy("discard");
    setNote(null);
    try {
      const res = await fetch("/api/dashboard/report-template", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "The draft did not go away.");
      }
      const back = state.publishedHtml ?? state.builtIn;
      editorRef.current?.load({
        name: "report-template.html",
        data: new TextEncoder().encode(back),
      });
      setNote({ kind: "ok", text: "Draft discarded. The editor is back to what is live." });
      router.refresh();
    } catch (err) {
      setNote({
        kind: "bad",
        text: err instanceof Error ? err.message : "The draft did not go away.",
      });
    } finally {
      setBusy(null);
    }
  }, [router, state.builtIn, state.publishedHtml]);

  /** Open an uploaded document in the editor, and keep a copy for the record. */
  const openFrom = useCallback(async (file: File) => {
    setBusy("open");
    setNote(null);
    try {
      await editorRef.current?.load(file);
      setSourceName(file.name);

      const form = new FormData();
      form.set("kind", "template-doc");
      form.set("file", file);
      const res = await fetch("/api/dashboard/uploads", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // The document is already open, so this is a note, not a failure.
        setNote({
          kind: "bad",
          text: `Opened, but the copy was not kept: ${data?.error ?? "the upload failed"}.`,
        });
        return;
      }
      setNote({
        kind: "ok",
        text: `Opened ${file.name}. Put {{report}} where the writing should go, then save.`,
      });
    } catch (err) {
      setNote({
        kind: "bad",
        text:
          err instanceof Error
            ? `That file would not open: ${err.message}`
            : "That file would not open.",
      });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }, []);

  /**
   * Everything the preview needs is worked out here, when the button is
   * pressed, rather than while rendering: reading the editor is a side effect.
   */
  const showPreview = useCallback(() => {
    const source = html();
    const merged = mergeTemplate(source, sample);
    setPreview({
      html: merged,
      unfilled: [...merged.matchAll(/\{\{([a-z_]{1,32})\}\}/g)].map((m) => m[1]),
      missingBody: !placeholdersIn(source).includes("report"),
    });
  }, [sample]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[0.8125rem] text-forest-900/55">
          {state.live === "published" ? (
            <span>
              Live: your template, version {state.version}
              {state.publishedAt ? `, published ${fmt(state.publishedAt)}` : ""}
            </span>
          ) : (
            <span>Live: the built-in template</span>
          )}
          {state.draftAt && (
            <span className="ml-2 rounded-full bg-clay-400/12 px-2.5 py-1 text-[0.75rem] text-clay-500">
              Draft saved {fmt(state.draftAt)}
            </span>
          )}
          {sourceName && (
            <span className="ml-2 text-forest-900/40">Opened from {sourceName}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
          >
            {busy === "open" ? "Opening..." : "Open a document"}
          </Button>
          <Button variant="ghost" size="sm" onClick={showPreview} disabled={busy !== null}>
            Preview
          </Button>
          <Button variant="ghost" size="sm" onClick={saveDraft} disabled={busy !== null}>
            {busy === "save" ? "Saving..." : "Save draft"}
          </Button>
          {state.draftHtml && (
            <Button variant="ghost" size="sm" onClick={discard} disabled={busy !== null}>
              Discard draft
            </Button>
          )}
          <Button size="sm" onClick={publish} disabled={busy !== null}>
            {busy === "publish" ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void openFrom(file);
        }}
      />

      {note && (
        <p
          className={`mt-3 text-[0.875rem] ${
            note.kind === "ok" ? "text-forest-700" : "text-clay-500"
          }`}
          role="status"
        >
          {note.text}
        </p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <WordcraftEditor
            ref={editorRef}
            document={document0}
            user={{ name: editorName }}
            wasmUrl="/wordcraft/wordcraft_embed_bg.wasm"
            autoSave={false}
            height={760}
            tabs={["File", "Home", "Insert", "Layout", "Review", "View"]}
            onSave={() => void saveDraft()}
            fallback={(error) => (
              <div className="rounded-card border border-forest-900/10 bg-bone-50 p-8">
                <p className="display text-[1.0625rem]">The editor could not start</p>
                <p className="mt-2 max-w-[52ch] text-[0.875rem] leading-relaxed text-forest-900/60">
                  It needs WebGPU or WebGL2. Try a current Chrome, Edge or Firefox with hardware
                  acceleration on. Your template is untouched.
                </p>
                <p className="mt-3 text-[0.75rem] text-forest-900/40">{error.message}</p>
              </div>
            )}
          />
        </div>

        <aside className="rounded-card border border-forest-900/10 bg-bone-50 p-5">
          <p className="display text-[0.9375rem]">Placeholders</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-forest-900/55">
            Type one of these into the document and it is replaced when a report is built. Click to
            copy.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {PLACEHOLDERS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(p.label)}
                  className="font-mono text-[0.75rem] text-forest-700 underline-offset-4 hover:underline"
                >
                  {p.label}
                </button>
                {p.required && (
                  <span className="ml-2 rounded-full bg-forest-900/8 px-2 py-0.5 text-[0.625rem] tracking-wide text-forest-900/60 uppercase">
                    needed
                  </span>
                )}
                <p className="mt-0.5 text-[0.75rem] leading-relaxed text-forest-900/50">{p.hint}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {preview !== null && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="display text-[1.125rem]">Preview</h2>
              <p className="mt-1 text-[0.8125rem] text-forest-900/55">
                Stand-in details, the real letterhead. This is what prints.
                {preview.unfilled.length > 0 && (
                  <span className="ml-1 text-forest-900/40">
                    Not recognised, so left as written: {preview.unfilled.join(", ")}.
                  </span>
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Close preview
            </Button>
          </div>

          {preview.missingBody && (
            <p className="mt-3 text-[0.875rem] text-clay-500">
              There is no {"{{report}}"} in the document, so a report built from this would carry
              no writing. Add it before publishing.
            </p>
          )}

          <iframe
            title="Report preview"
            srcDoc={preview.html}
            className="mt-4 h-[900px] w-full rounded-card border border-forest-900/12 bg-white"
          />
        </div>
      )}
    </div>
  );
}
