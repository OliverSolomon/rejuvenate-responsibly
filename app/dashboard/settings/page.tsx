import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { BrandPanel } from "@/components/dashboard/brand-panel";
import { SamplesPanel } from "@/components/dashboard/samples-panel";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { StoragePanel } from "@/components/dashboard/storage-panel";
import { SAMPLE_CASES } from "@/lib/rmi/samples";
import { kesPerUsd } from "@/lib/rmi/fx";
import { modelCatalogue } from "@/lib/rmi/models";
import { brandAssets, settingsView } from "@/lib/rmi/settings";
import {
  countSamples,
  legacySummary,
  readTemplate,
  storageBackend,
  storageStatus,
} from "@/lib/rmi/store";

export const metadata: Metadata = pageMeta({
  title: "Settings",
  description:
    "Models, storage, email and sample data for Rate My Impact.",
  path: "/dashboard/settings",
  private: true,
});

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const backend = storageBackend();
  const [status, legacy] = await Promise.all([storageStatus(), legacySummary()]);

  // Everything below reads from the database. If the migration has not been run,
  // say so here rather than failing the page on the first missing column.
  const blocked = status !== null && !status.schemaReady;

  const [view, loaded, brand, template] = blocked
    ? [null, { assessments: 0, responses: 0 }, {}, { version: 0 }]
    : await Promise.all([settingsView(), countSamples(), brandAssets(), readTemplate()]);
  const [catalogue, fx] = await Promise.all([modelCatalogue(), kesPerUsd()]);

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
        {view && (
          <SettingsForm
            initial={view}
            models={catalogue.models}
            pricesFrom={catalogue.source}
            fx={fx}
          />
        )}
        {view && (
          <BrandPanel
            logo={brand.logo}
            stamp={brand.stamp}
            templateState={{
              live: template.published ? "published" : "built-in",
              hasDraft: Boolean(template.draft),
              version: template.version,
            }}
          />
        )}
        {view && (
          <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="display text-[1.125rem]">Team</h2>
                <p className="mt-2 max-w-[56ch] text-[0.875rem] leading-relaxed text-forest-900/60">
                  Who can open the dashboard, and how they get in. Owners add and remove people;
                  admins do everything else.
                </p>
              </div>
              <Link
                href="/dashboard/settings/team"
                className="rounded-full bg-forest-900 px-5 py-2.5 text-[0.8125rem] font-medium text-bone-50 transition hover:bg-forest-700"
              >
                Manage the team
              </Link>
            </div>
          </section>
        )}
        {view && <SamplesPanel cases={SAMPLE_CASES} loaded={loaded} />}
      </div>
    </div>
  );
}
