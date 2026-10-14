import type { Metadata } from "next";
import { analytics } from "@/lib/rmi/dashboard";
import { Stat } from "@/components/dashboard/stat";
import {
  ActivityChart,
  GapChart,
  PillarChart,
  TierChart,
} from "@/components/dashboard/charts";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const a = await analytics();
  const responseRate =
    a.totals.stakeholders > 0
      ? Math.round((a.totals.responded / a.totals.stakeholders) * 100)
      : 0;

  return (
    <div>
      <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">Analytics</h1>
      <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        Everything across every organisation that has started an assessment.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Organisations" value={a.totals.assessments} />
        <Stat
          label="Submitted"
          value={a.totals.submitted}
          hint={`${a.totals.assessments - a.totals.submitted} still open`}
        />
        <Stat label="Paid" value={a.totals.paid} />
        <Stat label="Stakeholders" value={a.totals.stakeholders} hint="invited" />
        <Stat label="Responses" value={a.totals.responded} hint={`${responseRate}% answered`} />
        <Stat label="Reports" value={a.totals.reports} />
      </div>

      {a.totals.submitted === 0 ? (
        <div className="mt-10 rounded-card border border-forest-900/10 bg-bone-50 p-8 text-center">
          <p className="text-[0.9375rem] text-forest-900/60">
            No assessment has been submitted yet, so there is nothing to chart. The
            numbers appear here as soon as the first one comes in.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <PillarChart data={a.pillars} />
          <TierChart data={a.tiers} />
          <ActivityChart data={a.activity} />
          <GapChart data={a.commonGaps} />
        </div>
      )}
    </div>
  );
}
