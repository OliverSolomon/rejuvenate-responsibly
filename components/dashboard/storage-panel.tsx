"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportResult } from "@/lib/rmi/store";

type Tally = { added: number; skipped: number };

export function StoragePanel({
  backend,
  schemaReady,
  problem,
  counts,
  legacy,
}: {
  backend: "supabase" | "file";
  schemaReady: boolean;
  problem: string | null;
  counts: { assessments: number; responses: number } | null;
  legacy: { path: string; assessments: number; responses: number; hasSettings: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const nothingToImport = legacy.assessments === 0 && legacy.responses === 0 && !legacy.hasSettings;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/storage/import", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The import failed.");
      setResult(data.result as ImportResult);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The import failed.");
    } finally {
      setBusy(false);
    }
  }

  const line = (label: string, t: Tally) => `${label}: ${t.added} added, ${t.skipped} already there`;

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[1.375rem]">Storage</h2>
        <Badge tone={backend === "supabase" && schemaReady ? "good" : "pending"}>
          {backend === "supabase" ? "Supabase" : "Local file"}
        </Badge>
      </div>

      {backend === "file" ? (
        <p className="mt-3 max-w-[64ch] text-[0.875rem] leading-relaxed text-forest-900/65">
          Submissions are being written to a file on this machine. Set{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server (Supabase dashboard, Project
          settings, API) and restart to store them in Supabase instead. That key bypasses row level
          security, so it belongs in the server environment only.
        </p>
      ) : !schemaReady ? (
        <p className="mt-3 max-w-[64ch] rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          {problem}
        </p>
      ) : (
        <p className="mt-3 text-[0.875rem] text-forest-900/65">
          Connected. {counts?.assessments ?? 0} assessments and {counts?.responses ?? 0} stakeholder
          responses in the database.
        </p>
      )}

      {backend === "supabase" && schemaReady && (
        <div className="mt-6 border-t border-forest-900/10 pt-6">
          <h3 className="text-[0.9375rem] font-medium text-forest-900">
            Import from the old local file
          </h3>
          <p className="mt-2 max-w-[64ch] text-[0.8125rem] leading-relaxed text-forest-900/60">
            {nothingToImport
              ? "The old local file on this server holds no records, so there is nothing to import."
              : `The old local file holds ${legacy.assessments} assessments and ${legacy.responses} stakeholder responses${legacy.hasSettings ? " and saved settings" : ""}. Importing only adds what is missing. Rows already in Supabase are never overwritten, and the file is left untouched, so it is safe to run more than once.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" disabled={busy || nothingToImport} onClick={run}>
              {busy ? "Importing..." : "Import into Supabase"}
            </Button>
          </div>
          {error && <p className="mt-3 text-[0.875rem] text-clay-500">{error}</p>}
          {result && (
            <ul className="mt-4 flex flex-col gap-1 text-[0.8125rem] text-forest-900/70">
              <li>{line("Assessments", result.assessments)}</li>
              <li>{line("Invitations", result.invitations)}</li>
              <li>{line("Stakeholder responses", result.responses)}</li>
              <li>{line("Reports", result.reports)}</li>
              <li>
                Settings:{" "}
                {result.settings === "imported"
                  ? "imported"
                  : result.settings === "kept"
                    ? "kept the ones already in Supabase"
                    : "none to import"}
              </li>
              {result.samplesIgnored > 0 && (
                <li>{result.samplesIgnored} sample records were not imported.</li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
