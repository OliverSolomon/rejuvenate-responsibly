import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { organisationDetail } from "@/lib/rmi/dashboard";
import { renderMarkdown } from "@/lib/rmi/markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/dashboard/stat";
import { PerceptionChart } from "@/components/dashboard/charts";
import {
  PaymentBadge,
  ReportBadge,
  StatusBadge,
  TierBadge,
  formatDate,
} from "@/components/dashboard/status";

export const metadata: Metadata = {
  title: "Organisation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrganisationPage({ params }: PageProps<"/dashboard/responses/[id]">) {
  const { id } = await params;
  const detail = await organisationDetail(id);
  if (!detail) notFound();

  const { row, assessment, parties, selfScore, perception } = detail;
  const report = assessment.report;
  const everyoneIn = row.invited > 0 && row.responded === row.invited;

  return (
    <div>
      <Link
        href="/dashboard/responses"
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to responses
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="display text-[clamp(1.625rem,3.2vw,2.25rem)]">{row.organisation}</h1>
          <p className="mt-2 text-[0.875rem] text-forest-900/60">
            {row.id} · {row.contactName || "No contact name"} · {row.email}
          </p>
          <p className="mt-1 text-[0.875rem] text-forest-900/60">
            {row.sector || "Sector not given"} · Started {formatDate(row.createdAt)}
            {row.submittedAt ? ` · Submitted ${formatDate(row.submittedAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={row.status} />
          <PaymentBadge status={row.paymentStatus} />
          <ReportBadge state={row.reportState} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Overall"
          value={selfScore ? selfScore.overall : "--"}
          hint={selfScore ? selfScore.tier.level : "Nothing answered yet"}
        />
        <Stat label="Coverage" value={selfScore ? selfScore.coverage : "--"} hint="Practice exists" />
        <Stat label="Depth" value={selfScore ? selfScore.depth : "--"} hint="Practice goes deeper" />
        <Stat
          label="Stakeholders"
          value={`${row.responded} of ${row.invited}`}
          hint={everyoneIn ? "All answers in" : "Still waiting"}
        />
      </div>

      {/* Parties involved */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Parties involved</CardTitle>
        </CardHeader>
        <CardContent>
          {parties.length === 0 ? (
            <p className="text-[0.875rem] text-forest-900/55">
              Nobody has been invited to give a view on this organisation yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr className="border-b border-forest-900/10 text-left">
                    {["Name", "Email", "Relationship", "Invited", "Status", "Their score"].map((h) => (
                      <th
                        key={h}
                        className="py-2.5 pr-4 text-[0.6875rem] font-medium tracking-wide text-forest-900/50 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parties.map((p) => (
                    <tr key={p.email} className="border-b border-forest-900/6 last:border-0">
                      <td className="py-3 pr-4 font-medium text-forest-900">{p.name}</td>
                      <td className="py-3 pr-4 text-forest-900/70">{p.email}</td>
                      <td className="py-3 pr-4 text-forest-900/70">{p.relationship || "--"}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-forest-900/70">
                        {formatDate(p.invitedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={p.respondedAt ? "submitted" : "draft"} />
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-forest-900/70">
                        {p.overall === null ? "--" : p.overall}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pillars and the perception gap */}
      {selfScore && (
        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pillar scores</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr className="border-b border-forest-900/10 text-left">
                    {["Pillar", "Coverage", "Depth", "Score", "Level"].map((h) => (
                      <th
                        key={h}
                        className="py-2.5 pr-4 text-[0.6875rem] font-medium tracking-wide text-forest-900/50 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selfScore.sections.map((s) => (
                    <tr key={s.id} className="border-b border-forest-900/6 last:border-0">
                      <td className="py-2.5 pr-4 text-forest-900">{s.title}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-forest-900/70">{s.coverage}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-forest-900/70">{s.depth}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-forest-900">{s.score}</td>
                      <td className="py-2.5 pr-4">
                        <TierBadge tier={s.level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {perception.length > 0 && row.responded > 0 ? (
            <PerceptionChart data={perception} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your view against theirs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[0.875rem] leading-relaxed text-forest-900/55">
                  This comparison appears once at least one stakeholder has answered.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Gaps */}
      {selfScore && selfScore.gaps.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Where the weight sits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {selfScore.gaps.slice(0, 10).map((g) => (
                <li
                  key={`${g.section}-${g.topic}`}
                  className="flex items-start justify-between gap-3 border-b border-forest-900/6 py-2 text-[0.875rem] last:border-0"
                >
                  <span className="text-forest-900/80">{g.topic}</span>
                  <span className="shrink-0 tabular-nums text-forest-900/45">
                    weight {g.weight}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* The report */}
      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Report</CardTitle>
          {report && (
            <Link
              href={`/dashboard/responses/${row.id}/edit`}
              className="rounded-full bg-forest-900 px-4 py-2 text-[0.8125rem] font-medium text-bone-50 transition hover:bg-forest-700"
            >
              Edit report
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!report ? (
            <p className="max-w-[60ch] text-[0.875rem] leading-relaxed text-forest-900/60">
              No report yet. One is written automatically once the organisation has
              submitted and every invited stakeholder has answered
              {row.invited === 0
                ? ", and this organisation has not invited anyone."
                : everyoneIn
                  ? "."
                  : `, which is ${row.invited - row.responded} answer${
                      row.invited - row.responded === 1 ? "" : "s"
                    } away.`}
            </p>
          ) : (
            <>
              <p className="text-[0.75rem] text-forest-900/45">
                Written {formatDate(report.generatedAt)} by {report.model}
                {report.editedAt ? ` · edited ${formatDate(report.editedAt)}` : ""}
              </p>
              <div
                className="report-body mt-5 max-w-[72ch]"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(report.markdown) }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
