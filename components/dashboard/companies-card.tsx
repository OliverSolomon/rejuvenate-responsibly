import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { companyRows } from "@/lib/rmi/companies";
import { currentScope } from "@/lib/rmi/scope";
import { samplesHidden } from "@/lib/rmi/settings";
import { listAssessments } from "@/lib/rmi/store";

/**
 * Every company on the installation, side by side. Only a super admin sees it:
 * for anyone else there is one company and nothing to compare.
 *
 * Follows Demo and Live like the rest of the dashboard, so the counts are of the
 * sample work in Demo and of real clients in Live, and a sample company only
 * shows in Demo.
 */
export async function CompaniesCard() {
  const scope = await currentScope();
  if (!scope?.isSuper) return null;

  const [rows, assessments, live] = await Promise.all([
    companyRows().catch(() => []),
    listAssessments().catch(() => []),
    samplesHidden(),
  ]);
  const shown = rows.filter((c) => c.sample !== live);
  if (shown.length === 0) return null;

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-[1.25rem]">Companies</h2>
        <Link
          href="/dashboard/settings#companies"
          className="text-[0.8125rem] text-forest-900/60 underline-offset-4 hover:text-forest-900 hover:underline"
        >
          Manage companies
        </Link>
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => {
          const theirs = assessments.filter(
            (a) => (a.companyId || "default") === c.id && (a.sample === true) !== live,
          );
          const submitted = theirs.filter((a) => a.status === "submitted").length;
          return (
            <li key={c.id}>
              <div className="flex h-full flex-col gap-3 rounded-xl border border-forest-900/10 bg-bone-100 p-4">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-forest-900">{c.name}</span>
                  {c.isDefault && <Badge tone="strong">Yours</Badge>}
                  {c.sample && <Badge tone="quiet">Sample</Badge>}
                  {!c.active && <Badge tone="pending">Closed</Badge>}
                </span>
                <dl className="grid grid-cols-3 gap-2 text-[0.75rem] text-forest-900/55">
                  {[
                    ["Assessments", theirs.length],
                    ["Submitted", submitted],
                    ["People", c.members],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="mt-0.5 text-[1.125rem] font-medium tabular-nums text-forest-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
