"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "./use-assessment";

const ACCEPT = "image/png,image/jpeg,image/webp";

/**
 * The organisation's own logo, added while filling in the assessment and
 * printed on their report.
 *
 * Optional, and said so plainly: nobody should feel they have to go and find a
 * file before answering questions. An upload needs the assessment to exist on
 * the server, so a profile with too little in it is asked for first rather than
 * failing after the file has been chosen.
 */
export function LogoField({
  session,
  ensureSession,
}: {
  session: Session | null;
  ensureSession: () => Promise<Session | null>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On a resumed assessment the logo is already on the server, so ask for it
  // rather than making someone upload the same file twice.
  const id = session?.id;
  const token = session?.token;
  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/rmi/logo?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.path) setPath(data.path);
      } catch {
        // Nothing to show is the same as nothing loaded.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const live = session ?? (await ensureSession());
      if (!live) {
        throw new Error(
          "Fill in your organisation, name and email first, then the logo can be saved against your assessment.",
        );
      }

      const form = new FormData();
      form.set("id", live.id);
      form.set("token", live.token);
      form.set("file", file);

      const res = await fetch("/api/rmi/logo", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The logo did not upload.");
      setPath(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The logo did not upload.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!session) {
      setPath(undefined);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rmi/logo?id=${encodeURIComponent(session.id)}&t=${encodeURIComponent(session.token)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "The logo did not come off.");
      }
      setPath(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The logo did not come off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-forest-900/20 bg-bone-100 p-2">
        {path ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/assets/${path}`}
            alt="Your logo as it will appear on the report"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-[0.625rem] leading-tight text-forest-900/40">
            No logo
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium text-forest-900/70">
          Your logo <span className="font-normal text-forest-900/45">(optional)</span>
        </p>
        <p className="mt-1 max-w-[52ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
          Printed on your report beside ours. A PNG with a transparent background looks best. You
          can add it later or leave it out entirely.
        </p>
        {error && <p className="mt-2 text-[0.8125rem] text-clay-500">{error}</p>}

        <div className="mt-2.5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="text-[0.8125rem] font-medium text-forest-700 underline-offset-4 hover:underline disabled:opacity-50"
          >
            {busy ? "Working..." : path ? "Replace it" : "Add a logo"}
          </button>
          {path && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="text-[0.8125rem] text-forest-900/50 underline-offset-4 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
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
