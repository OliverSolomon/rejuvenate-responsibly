import "server-only";

import { NextResponse } from "next/server";
import { getDashboardUser, type DashboardUser, type TeamRole } from "@/utils/supabase/server";

/**
 * Which company a dashboard request is about.
 *
 * More than one firm uses this installation, and each sees only its own work.
 * An owner or an admin is pinned to the company on their own row and cannot
 * look at another. A super admin is the exception: they see across all of them,
 * and can step into one company to use the platform the way its owner does.
 *
 * Where things live, which is worth being clear about because it decides who
 * can change what:
 *
 *   Per company   the country and currency, the logo and stamp, the report
 *                 template, the tiers, the team, the email switches, whether
 *                 sample data is showing
 *   Installation  the OpenRouter key and models, the Pesapal credentials, the
 *                 mail provider, Supabase itself
 *
 * The installation settings live on the default company's row, which its own
 * admins and the super admin can change. By default every other company borrows them, along with
 * the report template, so a new firm works from its first day. A super admin can
 * switch that off per company and per thing (see `sharing` in StoredSettings),
 * and from then on that company's own admins keep their own key, account or
 * template, and are told on their dashboard until they have.
 */

export const DEFAULT_COMPANY = "default";


export type Scope = {
  user: DashboardUser;
  role: TeamRole;
  /** True for the one account that can see every company. */
  isSuper: boolean;
  /**
   * The company whose data to show, or null for every company at once, which
   * only a super admin ever gets.
   */
  companyId: string | null;
  /**
   * The company this person belongs to. For a super admin it is the
   * organisation they manage when they step out of the global view.
   */
  homeCompanyId: string;
  /** True when a super admin is looking at one company rather than all. */
  narrowed: boolean;
};

/**
 * Who is asking and what they may see, or null when they may see nothing.
 *
 * Everything that reads company data goes through this rather than reading the
 * user's row itself, so the super admin's view switch is honoured in one place
 * instead of being remembered in several.
 */
export async function currentScope(): Promise<Scope | null> {
  const user = await getDashboardUser();
  if (!user) return null;

  const isSuper = user.role === "super";
  const home = user.companyId || DEFAULT_COMPANY;

  if (!isSuper) {
    return {
      user,
      role: user.role,
      isSuper: false,
      companyId: home,
      homeCompanyId: home,
      narrowed: false,
    };
  }

  // Which companies a super admin is looking at is remembered on their account,
  // so signing out and in again puts them back where they were.
  const chosen = user.prefs.view?.trim();
  const companyId = chosen && chosen !== "all" ? chosen : null;

  return {
    user,
    role: "super",
    isSuper: true,
    companyId,
    homeCompanyId: home,
    narrowed: companyId !== null,
  };
}

/**
 * The company to read and write settings for.
 *
 * A super admin looking at every company still has to be writing somewhere, and
 * their own organisation is the only sensible answer, so the global view falls
 * back to it rather than refusing to save.
 */
export function settingsCompany(scope: Scope): string {
  return scope.companyId ?? scope.homeCompanyId;
}

/**
 * Whose team this person may see.
 *
 * A super admin in the global view sees everyone, including the other super
 * admins. Anybody else sees their own company with the super admin rows left
 * out, which is what makes the installation's owner invisible to the firms
 * using it.
 */
export function teamView(scope: Scope): { companyId: string | null; includeSuper: boolean } {
  return {
    companyId: scope.isSuper ? scope.companyId : scope.homeCompanyId,
    includeSuper: scope.isSuper,
  };
}

/**
 * Members can look at their company's work and change none of it. Every route
 * that writes starts with this, since the interface hiding a button is not what
 * stops a request: the route has to.
 */
export async function memberBlocked(): Promise<NextResponse | null> {
  const user = await getDashboardUser();
  if (user?.role !== "member") return null;
  return NextResponse.json(
    { error: "A member can look but not change anything. Ask an admin of your company." },
    { status: 403 },
  );
}

/** Only a super admin may change the keys the whole installation shares. */
export function canConfigureInstallation(scope: Scope): boolean {
  return scope.isSuper;
}

/** Owners manage their own company's team. A super admin manages anyone's. */
export function canManageTeam(scope: Scope): boolean {
  return scope.isSuper || scope.role === "owner";
}


/**
 * Live or demo.
 *
 * Live is the real platform: real clients only, and the banners for anything
 * not set up. Demo is for showing it to somebody: only the sample submissions,
 * and none of the banners, since a missing key is not something to put in front
 * of a prospect. It is how this person is looking, not a fact about the
 * company, so it is saved on their account like the company view is, and
 * survives signing out. Everyone starts on demo, so nobody's first look at the
 * dashboard is of anything but sample data, and moves to live on purpose.
 */
export type ViewMode = "live" | "demo";

export async function viewMode(): Promise<ViewMode> {
  const user = await getDashboardUser();
  return user?.prefs.mode === "live" ? "live" : "demo";
}
