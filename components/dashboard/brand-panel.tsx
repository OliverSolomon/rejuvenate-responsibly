"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BrandAsset } from "@/lib/rmi/store-types";

const ACCEPT = "image/png,image/jpeg,image/webp";

type Kind = "logo" | "stamp";

const COPY: Record<Kind, { title: string; blurb: string }> = {
  logo: {
    title: "Logo",
    blurb:
      "Printed on the letterhead of every report. A PNG with a transparent background about a thousand pixels wide prints cleanly.",
  },
  stamp: {
    title: "Stamp",
    blurb:
      "The seal at the foot of a report. A square image works best, and transparency keeps it from sitting on a white block.",
  },
};

function Slot({
  kind,
  asset,
  onDone,
}: {
  kind: Kind;
  asset?: BrandAsset;
  onDone: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[kind];

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      // The browser can measure the image; the server cannot without decoding it.
      const size = await new Promise<{ width?: number; height?: number }>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        img.src = url;
      });

      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      if (size.width) form.set("width", String(size.width));
      if (size.height) form.set("height", String(size.height));

      const res = await fetch("/api/dashboard/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The upload did not work.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload did not work.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/uploads?kind=${kind}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "That did not work.");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 p-5 sm:flex-row sm:items-start sm:gap-5">
      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-dashed border-forest-900/20 bg-bone-100 p-2">
        {asset ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/assets/${asset.path}`}
            alt={`${copy.title} as it will print`}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-[0.6875rem] leading-tight text-forest-900/40">
            Nothing yet
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="display text-[0.9375rem]">{copy.title}</p>
        <p className="mt-1 max-w-[46ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
          {copy.blurb}
        </p>
        {asset?.width && asset.height && (
          <p className="mt-1.5 text-[0.75rem] text-forest-900/40 tabular-nums">
            {asset.width} by {asset.height} pixels
          </p>
        )}
        {error && <p className="mt-2 text-[0.8125rem] text-clay-500">{error}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => input.current?.click()}
            disabled={busy}
          >
            {busy ? "Working..." : asset ? "Replace" : "Upload"}
          </Button>
          {asset && (
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>

        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}

/**
 * The logo and stamp the report template draws on, and the way through to the
 * template itself.
 */
export function BrandPanel({
  logo,
  stamp,
  templateState,
}: {
  logo?: BrandAsset;
  stamp?: BrandAsset;
  templateState: { live: "published" | "built-in"; hasDraft: boolean; version: number };
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <h2 className="display text-[1.125rem]">Report appearance</h2>
      <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
        What a client sees on the document. The logo and stamp are uploaded here; where they sit,
        along with the letterhead and footer wording, is set in the template.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Slot kind="logo" asset={logo} onDone={refresh} />
        <Slot kind="stamp" asset={stamp} onDone={refresh} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-forest-900/10 bg-bone-100 p-5">
        <div>
          <p className="display text-[0.9375rem]">Report template</p>
          <p className="mt-1 max-w-[52ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
            {templateState.live === "published"
              ? `Reports are built from your published template, version ${templateState.version}.`
              : "Reports are built from the built-in template. Publish one of your own to take it over."}
            {templateState.hasDraft && " A draft is waiting."}
          </p>
        </div>
        <Link
          href="/dashboard/settings/report-template"
          className="rounded-full bg-forest-900 px-5 py-2.5 text-[0.8125rem] font-medium text-bone-50 transition hover:bg-forest-700"
        >
          {templateState.hasDraft ? "Continue the draft" : "Edit the template"}
        </Link>
      </div>
    </section>
  );
}
