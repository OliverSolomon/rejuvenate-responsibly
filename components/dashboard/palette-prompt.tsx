"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  paletteFrom,
  paletteSwatches,
  seedsFromPixels,
  type Palette,
  type PaletteSeeds,
} from "@/lib/rmi/palette";

/**
 * What a logo suggests the dashboard could look like.
 *
 * Reading the logo happens in the browser, because the browser already has a
 * decoder and a canvas and the server would need neither otherwise. Only the
 * hue is taken: the lightness of every shade stays as the house theme sets it,
 * so a company's colours cannot break the contrast of their own dashboard.
 *
 * Nothing is applied until somebody has seen the preview and said yes. That is
 * the point of the prompt rather than a quiet save.
 */
export function PalettePrompt({
  logoUrl,
  current,
}: {
  /** The uploaded logo to read, or absent when there is none yet. */
  logoUrl?: string;
  /** The colours already in use, if this company has accepted some. */
  current?: PaletteSeeds;
}) {
  const router = useRouter();
  const [suggested, setSuggested] = useState<Palette | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!logoUrl) return;

    let live = true;
    const image = new Image();
    // The logo is served from this origin, but the canvas is still tainted
    // without this, and reading the pixels would throw.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!live) return;
      try {
        // Small on purpose: a logo's colours are flat, and a hundred thousand
        // pixels answer the question as well as ten million.
        const scale = Math.min(1, 160 / Math.max(image.naturalWidth, image.naturalHeight));
        const w = Math.max(1, Math.round(image.naturalWidth * scale));
        const h = Math.max(1, Math.round(image.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(image, 0, 0, w, h);

        const { data } = ctx.getImageData(0, 0, w, h);
        setSuggested(paletteFrom(seedsFromPixels(data)));
      } catch {
        setError("The logo could not be read for its colours. The house colours are still in use.");
      }
    };
    image.onerror = () => {
      if (!live) return;
      setError("The logo could not be loaded for its colours.");
    };
    image.src = logoUrl;

    return () => {
      live = false;
    };
  }, [logoUrl]);

  async function save(palette: PaletteSeeds | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palette }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "That did not save.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  if (!logoUrl && !current) return null;

  // Derived rather than held: there is a suggestion, or an error, or the read
  // is still going, and keeping that in state would be a third source of truth.
  const reading = Boolean(logoUrl) && !suggested && !error;
  const inUse = current ? paletteFrom(current) : null;
  const same =
    inUse && suggested
      ? (["ink", "accent", "paper"] as const).every(
          (k) => inUse.seeds[k] === suggested.seeds[k],
        )
      : false;

  return (
    <div className="mt-6 rounded-xl border border-forest-900/10 bg-bone-100 p-5">
      <p className="display text-[0.9375rem]">Dashboard colours</p>

      {inUse && (
        <>
          <p className="mt-1 max-w-[56ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
            This dashboard is using your own colours. Every shade keeps the lightness of the house
            theme, so only the hue is yours.
          </p>
          <Swatches palette={inUse} />
          <div className="mt-3">
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => save(null)}>
              {busy ? "Working..." : "Go back to the house colours"}
            </Button>
          </div>
        </>
      )}

      {!inUse && (
        <p className="mt-1 max-w-[56ch] text-[0.8125rem] leading-relaxed text-forest-900/55">
          {reading
            ? "Reading the colours out of your logo..."
            : suggested
              ? "Taken from your logo. Every shade keeps the lightness of the house theme, so this changes the hue and nothing else. Reports are not affected: they follow the template."
              : "Upload a logo and the dashboard can take its colours from it."}
        </p>
      )}

      {!inUse && suggested && !dismissed && (
        <>
          <Swatches palette={suggested} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => save(suggested.seeds)}
            >
              {busy ? "Applying..." : "Use these for the dashboard"}
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDismissed(true)}>
              Keep the house colours
            </Button>
          </div>
        </>
      )}

      {inUse && suggested && !same && !dismissed && (
        <div className="mt-5 border-t border-forest-900/10 pt-4">
          <p className="text-[0.8125rem] text-forest-900/55">
            Your current logo suggests a different set.
          </p>
          <Swatches palette={suggested} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => save(suggested.seeds)}
            >
              Switch to these
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDismissed(true)}>
              Leave it
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[0.8125rem] text-clay-500">{error}</p>}
    </div>
  );
}

function Swatches({ palette }: { palette: Palette }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {paletteSwatches(palette).map((swatch) => (
        <div key={swatch.label} className="flex items-center gap-2">
          <span
            className="h-8 w-8 rounded-lg border border-forest-900/15"
            style={{ background: swatch.hex }}
            aria-hidden
          />
          <span className="text-[0.75rem] leading-tight text-forest-900/60">
            {swatch.label}
            <br />
            <span className="font-mono text-[0.6875rem] text-forest-900/40">{swatch.hex}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
