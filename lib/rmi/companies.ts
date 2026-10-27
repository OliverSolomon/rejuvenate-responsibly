import "server-only";

import { listAssessments, listCompanies, type Company } from "./store";
import { listTeam, teamConfigured } from "./team";

/**
 * The firms using this installation, as the super admin's page needs them.
 *
 * The counts are what makes the list worth reading: a company with no people
 * and no submissions is one somebody set up and never came back to, and that
 * is only visible next to the ones that are busy.
 */

export type CompanyRow = Company & {
  /** People with dashboard access, super admins excluded. */
  members: number;
  assessments: number;
  submitted: number;
};

/** A slug from a name: lowercase, words joined by hyphens. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugValid(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(value);
}

export async function companyRows(): Promise<CompanyRow[]> {
  const [companies, assessments, team] = await Promise.all([
    listCompanies(),
    listAssessments(),
    // Without the service role there is no team to count, which is not a
    // reason to refuse to show the companies.
    teamConfigured()
      ? listTeam({ companyId: null, includeSuper: false }).catch(() => [])
      : Promise.resolve([]),
  ]);

  return companies.map((company) => {
    const theirs = assessments.filter((a) => (a.companyId || "default") === company.id);
    return {
      ...company,
      members: team.filter((m) => m.companyId === company.id).length,
      assessments: theirs.length,
      submitted: theirs.filter((a) => a.status === "submitted").length,
    };
  });
}
