"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { WordcraftEditor as Editor } from "@gamine/wordcraft-react/core";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  PLACEHOLDERS,
  mergeTemplate,
  normaliseTemplate,
  placeholdersIn,
  withHouseFonts,
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

/* A4 at 96 dpi, with the margins a letter would have. */
const PAGE_W = 794;
const PAGE_H = 1123;
const MARGIN = 56;
const GAP = 24;

/**
 * Lay a merged document out as pages side by side.
 *
 * The browser's own column layout does the paging: a fixed-height block with
 * columns the width of a page's text flows the document from one column into
 * the next, and each column is a page. The only thing left for script to do is
 * widen the block to fit however many pages that turned out to be, so the
 * white of each page can be painted behind it. It is a close picture of how the
 * printed document breaks, not a promise of it: the print dialog has the final
 * say on where a page ends.
 */
type LogoSlot = "logo" | "client_logo" | "stamp";
type Place = "top" | "bottom" | "none";

/** The three images a report can carry, and what each one is. */
const LOGO_SLOTS: { id: LogoSlot; label: string; note: string; missing?: string }[] = [
  {
    id: "logo",
    label: "Your logo",
    note: "Uploaded under Branding. It prints wherever this is placed.",
  },
  {
    id: "client_logo",
    label: "The client's logo",
    note: "Clients can add their own logo on their assessment form. A report whose client added none shows nothing here.",
    missing:
      "Not in the template, so a logo a client adds on the form will not appear on their report.",
  },
  {
    id: "stamp",
    label: "Your stamp",
    note: "Your stamp or seal, uploaded under Branding.",
  },
];

/** A grey stand-in, so a slot can be seen and placed before anything is uploaded. */
function standIn(text: string, w: number, h: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="6" fill="#eceee9" stroke="#b9c0b8"/><text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="12" fill="#5c6b62">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * The preview's logo values, each in a marked frame and with a stand-in where
 * nothing is uploaded yet. Only the preview does this: a real report prints the
 * images and nothing else.
 */
function withSlots(sample: TemplateValues): TemplateValues {
  const frame = (id: LogoSlot, label: string, fallback: string) => {
    const own = sample[id];
    const inner = own ? own : `<img class="${id === "client_logo" ? "client-logo" : id === "stamp" ? "stamp" : "logo"}" src="${fallback}" alt="${label}" />`;
    return `<span class="rmi-slot" data-slot="${label}">${inner}</span>`;
  };
  return {
    ...sample,
    logo: frame("logo", "Your logo", standIn("Your logo", 140, 48)),
    client_logo: frame("client_logo", "Client's logo", standIn("Client logo", 120, 44)),
    stamp: frame("stamp", "Your stamp", standIn("Stamp", 90, 90)),
  };
}

/** Where a token sits: before the report, after it, or not at all. */
function placeOf(html: string, id: LogoSlot): Place {
  const n = normaliseTemplate(html);
  const at = n.indexOf(`{{${id}}}`);
  if (at < 0) return "none";
  const body = n.indexOf("{{report}}");
  return at < (body >= 0 ? body : n.length / 2) ? "top" : "bottom";
}

/** The template with one token taken out of wherever it was and put at the top or the bottom. */
function movePlace(html: string, id: LogoSlot, to: Place): string {
  const token = `{{${id}}}`;
  let out = normaliseTemplate(html).split(token).join("");
  if (to === "none") return out;
  const tag = `<p>${token}</p>`;
  if (to === "top") {
    out = /<body[^>]*>/i.test(out) ? out.replace(/<body[^>]*>/i, (m) => `${m}${tag}`) : tag + out;
  } else {
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${tag}</body>`) : out + tag;
  }
  return out;
}

function paged(merged: string, marks: boolean): string {
  const text = PAGE_W - 2 * MARGIN;
  const pitch = PAGE_W + GAP;
  const style = `<style>
    html{background:#e9e8e2}
    body{margin:0!important;padding:${GAP}px!important;max-width:none!important;background:transparent!important}
    .rmi-sheet{box-sizing:border-box;width:${PAGE_W}px;height:${PAGE_H}px;padding:${MARGIN}px;column-width:${text}px;column-gap:${2 * MARGIN + GAP}px;column-fill:auto;
      background:repeating-linear-gradient(to right,#fff 0,#fff ${PAGE_W}px,transparent ${PAGE_W}px,transparent ${pitch}px);box-shadow:none}
    ${marks ? ".rmi-slot{display:inline-block;position:relative;outline:2px dashed #c8643c;outline-offset:3px;margin:16px 6px 6px 0}.rmi-slot::after{content:attr(data-slot);position:absolute;left:0;top:-16px;font:600 9px/1 Arial,sans-serif;color:#c8643c;white-space:nowrap}" : ""}
  </style>`;
  const script = `<script>addEventListener('load',function(){var s=document.querySelector('.rmi-sheet');if(!s)return;
    var n=Math.max(2,Math.round((s.scrollWidth+${2 * MARGIN + GAP - MARGIN})/${pitch}));s.style.width=(n*${pitch}-${GAP})+'px';
    parent.postMessage({rmiPages:n},'*');});</script>`;

  let out = merged;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${style}</head>`) : style + out;
  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, '<body$1><div class="rmi-sheet">').replace(/<\/body>/i, `</div>${script}</body>`);
  } else {
    out = `${out.slice(0, out.indexOf(style) + style.length)}<div class="rmi-sheet">${out.slice(out.indexOf(style) + style.length)}</div>${script}`;
  }
  return out;
}

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

/**
 * One page of the laid-out document, shrunk to the size asked for.
 *
 * Every page is a window onto the same wide document: the frame is as wide as
 * all the pages together and is slid left so that only page `index` shows. The
 * frame itself takes no clicks, so whatever wraps this decides what a click does.
 */
function PageFrame({
  html,
  index,
  count,
  scale,
}: {
  html: string;
  index: number;
  count: number;
  scale: number;
}) {
  const pitch = PAGE_W + GAP;
  return (
    <div
      className="relative overflow-hidden bg-white"
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
    >
      <iframe
        title={`Page ${index + 1}`}
        srcDoc={html}
        tabIndex={-1}
        scrolling="no"
        className="pointer-events-none absolute border-0"
        style={{
          width: count * pitch + 2 * GAP,
          height: PAGE_H + 2 * GAP,
          left: -(GAP + index * pitch) * scale,
          top: -GAP * scale,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

/** The pages as thumbnails that fit the width, each one opening larger on a click. */
function PageStrip({ html, count }: { html: string; count: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (open === null) return;
    const measure = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : Math.min(count - 1, i + 1)));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("resize", measure);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, count]);

  // As many pages to a row as will stay readable, never more than will fit, and
  // the whole row shrunk to the width so nothing scrolls sideways.
  const gap = 16;
  const perRow = Math.max(1, Math.min(count, Math.floor((width + gap) / (PAGE_W * 0.3 + gap))));
  const scale = width ? Math.min(0.6, (width - (perRow - 1) * gap) / (perRow * PAGE_W)) : 0.3;

  const big = Math.min((viewport.h - 120) / PAGE_H, (viewport.w - 120) / PAGE_W, 1.4);

  return (
    <div ref={box} className="w-full">
      <div className="flex flex-wrap justify-center" style={{ gap }}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open page ${i + 1} of ${count}`}
            className="group flex flex-col items-center gap-2"
          >
            <span className="overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-forest-900/10 transition-shadow group-hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
              <PageFrame html={html} index={i} count={count} scale={scale} />
            </span>
            <span className="text-[0.75rem] text-forest-900/55">Page {i + 1}</span>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Page ${open + 1} of ${count}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <span className="overflow-hidden rounded-[4px] shadow-2xl">
              <PageFrame html={html} index={open} count={count} scale={big} />
            </span>
            <div className="flex items-center gap-3 text-[0.8125rem] text-bone-50">
              <button
                type="button"
                onClick={() => setOpen(Math.max(0, open - 1))}
                disabled={open === 0}
                className="rounded-full border border-bone-50/30 px-3 py-1 disabled:opacity-30"
              >
                Previous
              </button>
              <span>
                Page {open + 1} of {count}
              </span>
              <button
                type="button"
                onClick={() => setOpen(Math.min(count - 1, open + 1))}
                disabled={open === count - 1}
                className="rounded-full border border-bone-50/30 px-3 py-1 disabled:opacity-30"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full bg-bone-50 px-3 py-1 text-forest-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [pages, setPages] = useState<number | null>(null);

  // The preview reports how many pages it came to once it has laid itself out.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const n = (event.data as { rmiPages?: unknown } | null)?.rmiPages;
      if (typeof n === "number") setPages(n);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  /** What was on screen when the editor was last closed, so closing it loses nothing. */
  const [working, setWorking] = useState<string | null>(null);

  /** Where the editor starts: what was being worked on, else the draft, else what is published. */
  const startingHtml = working ?? state.draftHtml ?? state.publishedHtml ?? state.builtIn;

  const buildPreview = useCallback(
    (source: string, marked = true) => {
      const merged = mergeTemplate(source, marked ? withSlots(sample) : sample);
      return {
        // The same house styling a real report gets, so the pages here are the
        // pages that print.
        html: paged(withHouseFonts(merged), marked),
        /** Tokens still in the document after merging: typos, almost always. */
        unfilled: [...merged.matchAll(/\{\{([a-z_]{1,32})\}\}/g)].map((m) => m[1]),
        missingBody: !placeholdersIn(source).includes("report"),
      };
    },
    [sample],
  );

  // The pages are showing from the moment the tab opens, built from the template
  // the editor starts with, and rebuilt from what is on screen when asked.
  const [preview, setPreview] = useState(() => buildPreview(startingHtml));
  /** The template the pages were last drawn from, which is what the logo panel reads. */
  const [source, setSource] = useState(startingHtml);
  const [marks, setMarks] = useState(true);

  /** Draw the pages from this template. */
  const redraw = useCallback(
    (from: string, marked = marks) => {
      setSource(from);
      setPreview(buildPreview(from, marked));
    },
    [buildPreview, marks],
  );

  const document0 = useMemo(
    () => ({
      name: "report-template.html",
      data: new TextEncoder().encode(startingHtml),
    }),
    [startingHtml],
  );

  // With the editor closed, the template is whatever was being worked on.
  const html = useCallback(
    () => editorRef.current?.getHTML() ?? working ?? startingHtml,
    [working, startingHtml],
  );

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
      if (!editing) setWorking(null);
      router.refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err instanceof Error ? err.message : "The draft did not save." });
    } finally {
      setBusy(null);
    }
  }, [router, html, editing]);

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
      if (!editing) setWorking(null);
      router.refresh();
    } catch (err) {
      setNote({
        kind: "bad",
        text: err instanceof Error ? err.message : "Publishing did not work.",
      });
    } finally {
      setBusy(null);
    }
  }, [router, html, editing]);

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
  const showPreview = () => redraw(html());

  /** Put one logo at the top, the bottom, or nowhere, in the template as it stands now. */
  const placeLogo = (id: LogoSlot, to: Place) => {
    const next = movePlace(html(), id, to);
    setWorking(next);
    if (editing) {
      void editorRef.current?.load({ name: "report-template.html", data: new TextEncoder().encode(next) });
    }
    redraw(next);
  };

  const unsaved = working !== null;

  /** Open or close the editor. Closing keeps the work and redraws the pages from it. */
  const toggleEditing = () => {
    if (editing) {
      const current = html();
      if (current.trim()) {
        setWorking(current);
        redraw(current);
      }
    }
    setEditing(!editing);
  };

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

        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={busy !== null}
              >
                {busy === "open" ? "Opening..." : "Open a document"}
              </Button>
              <Button variant="ghost" size="sm" onClick={showPreview} disabled={busy !== null}>
                Refresh pages
              </Button>
            </>
          )}
          {(editing || unsaved) && (
            <>
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
            </>
          )}
          <Button
            variant={editing ? "ghost" : "primary"}
            size="sm"
            onClick={toggleEditing}
            disabled={busy !== null}
            aria-pressed={editing}
          >
            {editing ? "Close editor" : "Edit template"}
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

      {editing && (
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
      )}

      <section className="mt-8 rounded-card border border-forest-900/10 bg-bone-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="display text-[1.0625rem]">Logos and stamp</h2>
            <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
              Where each image prints on a report. The dashed frames in the pages below show it. Move
              one here, then save the draft and publish.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-forest-900/70">
            <input
              type="checkbox"
              checked={marks}
              onChange={(e) => {
                setMarks(e.target.checked);
                redraw(source, e.target.checked);
              }}
              className="h-4 w-4 accent-forest-700"
            />
            Mark them on the pages
          </label>
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-forest-900/8">
          {LOGO_SLOTS.map((slot) => {
            const at = placeOf(source, slot.id);
            return (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-[0.875rem] font-medium text-forest-900">{slot.label}</p>
                  <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-forest-900/55">
                    {slot.note}
                  </p>
                  {at === "none" && slot.missing && (
                    <p className="mt-1 text-[0.8125rem] text-clay-500">{slot.missing}</p>
                  )}
                </div>
                <div className="w-full sm:w-56">
                  <Select
                    value={at}
                    aria-label={`Where ${slot.label.toLowerCase()} goes`}
                    disabled={busy !== null}
                    onChange={(to) => placeLogo(slot.id, to as Place)}
                    options={[
                      { value: "top", label: "Top of the first page" },
                      { value: "bottom", label: "Bottom of the last page" },
                      { value: "none", label: "Not shown" },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="display text-[1.125rem]">
              The report{pages ? `, ${pages} ${pages === 1 ? "page" : "pages"}` : ""}
            </h2>
            <p className="mt-1 text-[0.8125rem] text-forest-900/55">
              A sample report as it prints, with stand-in details and the real letterhead. Click a
              page to read it larger.
              {editing && " Press Refresh pages after editing to see your changes here."}
              {preview.unfilled.length > 0 && (
                <span className="ml-1 text-forest-900/40">
                  Not recognised, so left as written: {preview.unfilled.join(", ")}.
                </span>
              )}
            </p>
          </div>
        </div>

        {preview.missingBody && (
          <p className="mt-3 text-[0.875rem] text-clay-500">
            There is no {"{{report}}"} in the document, so a report built from this would carry no
            writing. Add it before publishing.
          </p>
        )}

        {/* Counts the pages; the thumbnails below need the number to cut the document up. */}
        <iframe
          title="Page counter"
          srcDoc={preview.html}
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute h-0 w-[2400px] opacity-0"
        />

        <div className="mt-4 rounded-card border border-forest-900/12 bg-[#e9e8e2] p-5">
          {pages ? (
            <PageStrip html={preview.html} count={pages} />
          ) : (
            <p className="py-10 text-center text-[0.875rem] text-forest-900/55">
              Laying out the pages
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
