import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { BrandPanel } from "@/components/dashboard/brand-panel";
import { CompaniesPanel } from "@/components/dashboard/companies-panel";
import { OrganisationPanel } from "@/components/dashboard/organisation-panel";
import { SamplesPanel } from "@/components/dashboard/samples-panel";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { SettingsTabs, type Tab } from "@/components/dashboard/settings-tabs";
import { StoragePanel } from "@/components/dashboard/storage-panel";
import { TemplateWorkspace } from "@/components/dashboard/template-workspace";
import { TiersPanel } from "@/components/dashboard/tiers-panel";
import { WebsitePanel } from "@/components/dashboard/website-panel";
import { companyRows } from "@/lib/rmi/companies";
import { canConfigureInstallation, currentScope } from "@/lib/rmi/scope";
import { SAMPLE_CASES } from "@/lib/rmi/samples";
import { ratePerUsd } from "@/lib/rmi/fx";
import { modelCatalogue } from "@/lib/rmi/models";
import {
  brandAssets,
  contactDetails,
  place,
  settingsView,
  socialLinks,
  tiers,
} from "@/lib/rmi/settings";
import {
  countSamples,
  legacySummary,
  readTemplate,
  storageBackend,
  storageStatus,
} from "@/lib/rmi/store";

export const metadata: Metadata = pageMeta({
  title: "Settings",
  description: "Organisation, branding, pricing, report template and email for Rate My Impact.",
  path: "/dashboard/settings",
  private: true,
});

export const dynamic = "force-dynamic";

/** A link out to a page that is too big to live inside a tab. */
function Onward({
  title,
  blurb,
  href,
  action,
}: {
  title: string;
  blurb: string;
  href: string;
  action: string;
}) {
  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display text-[1.125rem]">{title}</h2>
          <p className="mt-2 max-w-[56ch] text-[0.875rem] leading-relaxed text-forest-900/60">
            {blurb}
          </p>
        </div>
        <Link
          href={href}
          className="rounded-full bg-forest-900 px-5 py-2.5 text-[0.8125rem] font-medium text-bone-50 transition hover:bg-forest-700"
        >
          {action}
        </Link>
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const scope = await currentScope();
  const backend = storageBackend();
  const [status, legacy] = await Promise.all([storageStatus(), legacySummary()]);

  // Everything below reads from the database. If the migration has not been run,
  // say so here rather than failing the page on the first missing column.
  const blocked = status !== null && !status.schemaReady;

  const [view, loaded, brand, template, where, contact, socials, priced] = blocked
    ? [null, { assessments: 0, responses: 0 }, {}, { version: 0 }, null, null, [], []]
    : await Promise.all([
        settingsView(),
        countSamples(scope?.companyId ? [scope.companyId] : undefined),
        brandAssets(),
        readTemplate(),
        place(),
        contactDetails(),
        socialLinks(),
        tiers(),
      ]);

  const currency = where?.currency ?? "USD";
  // Model prices are quoted in dollars; the rate turns them into what the
  // organisation bills in.
  const [catalogue, fx] = await Promise.all([modelCatalogue(), ratePerUsd(currency)]);

  // Only the super admin is told that other companies exist at all, so the
  // read is skipped rather than rendered empty for everyone else.
  const companies =
    scope && canConfigureInstallation(scope) && !blocked ? await companyRows() : null;

  const storage = (
    <div className="flex flex-col gap-6">
      <StoragePanel
        backend={backend}
        schemaReady={status?.schemaReady ?? true}
        problem={status?.problem ?? null}
        counts={status?.counts ?? null}
        legacy={legacy}
      />
      <p className="max-w-[62ch] text-[0.8125rem] leading-relaxed text-forest-900/50">
        This tab is the plumbing: where the data lives and which keys are in play. Everything a
        client sees is on the tabs before it.
      </p>
    </div>
  );

  const tabs: Tab[] = [
    {
      id: "organisation",
      label: "Organisation",
      panel: where ? (
        <OrganisationPanel
          country={where.country}
          currency={where.currency}
          currencyChosen={where.currencySource === "dashboard"}
        />
      ) : (
        storage
      ),
    },
    {
      id: "website",
      label: "Website",
      panel: contact ? <WebsitePanel contact={contact} socials={socials} /> : storage,
    },
    {
      id: "branding",
      label: "Branding",
      panel: view ? (
        <BrandPanel
          logo={brand.logo}
          stamp={brand.stamp}
          palette={brand.palette}
          templateState={{
            live: template.published ? "published" : "built-in",
            hasDraft: Boolean(template.draft),
            version: template.version,
          }}
        />
      ) : (
        storage
      ),
    },
    {
      id: "pricing",
      label: "Pricing",
      panel: view ? (
        <div className="flex flex-col gap-6">
          <TiersPanel tiers={priced} currency={currency} />
          <SettingsForm
            initial={view}
            models={catalogue.models}
            pricesFrom={catalogue.source}
            fx={fx}
            section="pricing"
          />
        </div>
      ) : (
        storage
      ),
    },
    {
      id: "reports",
      label: "Report writing",
      panel: view ? (
        <SettingsForm
          initial={view}
          models={catalogue.models}
          pricesFrom={catalogue.source}
          fx={fx}
          section="reports"
        />
      ) : (
        storage
      ),
    },
    {
      id: "template",
      label: "Report template",
      panel: <TemplateWorkspace />,
    },
    {
      id: "email",
      label: "Email",
      panel: view ? (
        <SettingsForm
          initial={view}
          models={catalogue.models}
          pricesFrom={catalogue.source}
          fx={fx}
          section="email"
        />
      ) : (
        storage
      ),
    },
    {
      id: "team",
      label: "Team",
      panel: (
        <Onward
          title="Team"
          blurb="Who can open the dashboard, and how they get in. Owners add and remove people; admins do everything else."
          href="/dashboard/settings/team"
          action="Manage the team"
        />
      ),
    },
    {
      id: "samples",
      label: "Sample data",
      panel: view ? (
        <SamplesPanel cases={SAMPLE_CASES} loaded={loaded} />
      ) : (
        storage
      ),
    },
  ];

  // Between the client-facing tabs and the plumbing, because it is about the
  // installation rather than about any one company's work.
  if (companies && scope) {
    tabs.push({
      id: "companies",
      label: "Companies",
      panel: (
        <CompaniesPanel
          companies={companies}
          viewing={scope.companyId}
          home={scope.homeCompanyId}
        />
      ),
    });
  }

  return (
    <div>
      <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">Settings</h1>
      <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        One subject at a time. For your own keys, a value saved here wins over the server
        environment; leave a field alone and the environment applies.
      </p>

      <div className="mt-8">
        <SettingsTabs tabs={tabs} />
      </div>
    </div>
  );
}
