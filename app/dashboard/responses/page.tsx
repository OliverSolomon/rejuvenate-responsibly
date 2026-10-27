import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { organisationRows } from "@/lib/rmi/dashboard";
import { Card } from "@/components/ui/card";
import { currentScope } from "@/lib/rmi/scope";
import { listCompanies } from "@/lib/rmi/store";
import {
  PaymentBadge,
  ReportBadge,
  SampleBadge,
  StatusBadge,
  TierBadge,
  formatDate,
} from "@/components/dashboard/status";

export const metadata: Metadata = pageMeta({
  title: "Responses",
  description:
    "Every organisation's assessment responses, by status.",
  path: "/dashboard/responses",
  private: true,
});

export const dynamic = "force-dynamic";

export default async function ResponsesPage() {
  const scope = await currentScope();
  const rows = await organisationRows();
  // With every company in view each row says whose it is. Which companies to
  // show is chosen from the account menu, not on the page.
  const names =
    scope?.companyId === null
      ? new Map((await listCompanies().catch(() => [])).map((c) => [c.id, c.name]))
      : null;
  // Newest work first. Someone opening this page is looking for what just came in.
  const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">Responses</h1>
          <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
            One row per organisation. Open a row to see the stakeholders it invited, who
            has answered, and the state of its report.
          </p>
        </div>

        {/* A plain link rather than a button: the browser downloads it, and a
            link can be opened in a new tab or copied like anything else. */}
        {sorted.length > 0 && (
          <a
            href="/api/dashboard/export"
            className="shrink-0 rounded-full border border-forest-900/15 px-5 py-2.5 text-[0.8125rem] font-medium text-forest-900/75 transition hover:border-forest-900/40 hover:text-forest-900"
          >
            Export to a spreadsheet
          </a>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <p className="display text-[1.125rem]">Nothing has come in yet</p>
          <p className="mx-auto mt-2 max-w-[42ch] text-[0.875rem] leading-relaxed text-forest-900/55">
            The first organisation to start an assessment will appear here, with its
            score and stakeholder responses as they arrive.
          </p>
        </Card>
      ) : (
        <>
          {/* Table on wide screens. */}
          <Card className="mt-8 hidden overflow-hidden lg:block">
            <table className="w-full border-collapse text-[0.875rem]">
              <thead>
                <tr className="border-b border-forest-900/10 text-left">
                  {[
                    "Organisation",
                    ...(names ? ["Company"] : []),
                    "Sector",
                    "Started",
                    "Status",
                    "Payment",
                    "Score",
                    "Stakeholders",
                    "Report",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[0.6875rem] font-medium tracking-wide text-forest-900/50 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-forest-900/6 last:border-0 hover:bg-forest-900/3"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/dashboard/responses/${r.id}`}
                        className="font-medium text-forest-900 underline-offset-4 hover:underline"
                      >
                        {r.organisation}
                      </Link>
                      {r.sample && (
                        <span className="ml-2 align-middle">
                          <SampleBadge />
                        </span>
                      )}
                      <span className="mt-0.5 block text-[0.75rem] text-forest-900/45">
                        {r.id} · {r.contactName || r.email}
                      </span>
                      {r.undelivered > 0 && (
                        <span className="mt-1 block text-[0.75rem] font-medium text-clay-500">
                          {r.undelivered} invitation{r.undelivered === 1 ? "" : "s"} not delivered
                        </span>
                      )}
                    </td>
                    {names && (
                      <td className="px-4 py-3.5 text-forest-900/70">
                        {names.get(r.companyId) ?? r.companyId}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-forest-900/70">{r.sector || "--"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-forest-900/70">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <PaymentBadge status={r.paymentStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-forest-900">
                          {r.overall === null ? "--" : r.overall}
                        </span>
                        <TierBadge tier={r.tier} />
                      </span>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-forest-900/70">
                      {r.responded} of {r.invited}
                    </td>
                    <td className="px-4 py-3.5">
                      <ReportBadge state={r.reportState} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cards below that, so a phone gets the same information. */}
          <div className="mt-8 grid gap-4 lg:hidden">
            {sorted.map((r) => (
              <Card key={r.id} className="p-5">
                <Link
                  href={`/dashboard/responses/${r.id}`}
                  className="display text-[1.0625rem] underline-offset-4 hover:underline"
                >
                  {r.organisation}
                </Link>
                <p className="mt-1 text-[0.75rem] text-forest-900/45">
                  {names ? `${names.get(r.companyId) ?? r.companyId} · ` : ""}
                  {r.id} · {r.sector || "Sector not given"} · {formatDate(r.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.sample && <SampleBadge />}
                  <StatusBadge status={r.status} />
                  <PaymentBadge status={r.paymentStatus} />
                  <ReportBadge state={r.reportState} />
                  <TierBadge tier={r.tier} />
                </div>
                <p className="mt-3 text-[0.8125rem] text-forest-900/60">
                  Score {r.overall === null ? "not yet" : r.overall} · {r.responded} of{" "}
                  {r.invited} stakeholders answered
                </p>
                {r.undelivered > 0 && (
                  <p className="mt-2 text-[0.8125rem] font-medium text-clay-500">
                    {r.undelivered} invitation{r.undelivered === 1 ? "" : "s"} not delivered
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
