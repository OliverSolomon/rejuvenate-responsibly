import type { Metadata } from "next";
import { SamplesPanel } from "@/components/dashboard/samples-panel";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { StoragePanel } from "@/components/dashboard/storage-panel";
import { SAMPLE_CASES } from "@/lib/rmi/samples";
import { settingsView } from "@/lib/rmi/settings";
import { countSamples, legacySummary, storageBackend, storageStatus } from "@/lib/rmi/store";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const backend = storageBackend();
  const [status, legacy] = await Promise.all([storageStatus(), legacySummary()]);

  // Everything below reads from the database. If the migration has not been run,
  // say so here rather than failing the page on the first missing column.
  const blocked = status !== null && !status.schemaReady;

  const [view, loaded] = blocked
    ? [null, { assessments: 0, responses: 0 }]
    : await Promise.all([settingsView(), countSamples()]);

  return (
    <div>
      <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">Settings</h1>
      <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        Storage, payment, report writing and test controls. A value saved here is encrypted and
        wins over the server environment; leave a field alone and the environment applies.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <StoragePanel
          backend={backend}
          schemaReady={status?.schemaReady ?? true}
          problem={status?.problem ?? null}
          counts={status?.counts ?? null}
          legacy={legacy}
        />
        {view && <SettingsForm initial={view} />}
        {view && <SamplesPanel cases={SAMPLE_CASES} loaded={loaded} />}
      </div>
    </div>
  );
}
