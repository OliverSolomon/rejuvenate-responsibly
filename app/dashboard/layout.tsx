import { redirect } from "next/navigation";
import Link from "next/link";
import { getFeed } from "@/lib/rmi/activity";
import { currentScope, viewMode } from "@/lib/rmi/scope";
import { themeCss } from "@/lib/rmi/settings";
import { listCompanies } from "@/lib/rmi/store";
import { DashboardNav } from "@/components/dashboard/nav";
import { ModeToggle } from "@/components/dashboard/mode-toggle";
import { Notifications } from "@/components/dashboard/notifications";
import { SetupBanner } from "@/components/dashboard/setup-banner";
import { UserMenu } from "@/components/dashboard/user-menu";
import { LogoMark } from "@/components/ui/logo";
import { SupabaseRuntimeConfig } from "@/utils/supabase/runtime-config";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // The proxy turns away anyone without a session. This is the second gate:
  // a session alone is not enough, the account has to be on the admin list.
  const scope = await currentScope();
  if (!scope) redirect("/signin?error=denied&next=/dashboard");
  const user = scope.user;

  // A company that has accepted its own colours gets them on every page, and
  // the theme is scoped to this element so the public site is untouched.
  const [css, companies, feed, mode] = await Promise.all([
    themeCss().catch(() => null),
    // Only a super admin has other companies to choose between.
    scope.isSuper ? listCompanies().catch(() => []) : Promise.resolve([]),
    // A problem reading the feed must never keep anyone out of the dashboard.
    getFeed().catch(() => null),
    viewMode(),
  ]);

  // Which companies a super admin is looking at is set from the account menu,
  // and nowhere else on the dashboard.
  const scopeState =
    scope.companyId === null ? "all" : scope.companyId === scope.homeCompanyId ? "own" : "other";

  return (
    <div className="min-h-screen bg-bone-100" data-rmi-theme>
      {css && <style>{css.replace(":root", "[data-rmi-theme]")}</style>}
      <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-bone-100/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 sm:px-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" aria-label="Dashboard home">
            <LogoMark className="h-8 w-8" />
            <span className="hidden font-display text-[0.8125rem] font-semibold tracking-[0.01em] uppercase sm:block">
              Rate My Impact
            </span>
          </Link>

          <span className="hidden h-5 w-px bg-forest-900/15 md:block" aria-hidden />


          <div className="order-last flex w-full justify-center md:order-none md:w-auto md:flex-1">
            <DashboardNav />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0">
            <ModeToggle mode={mode} />
            {feed && (
              <Notifications
                attention={feed.attention}
                fresh={[...feed.sinceSignIn, ...feed.catchUp]}
              />
            )}
            <UserMenu
              email={user.email}
              name={user.name}
              role={scope.role}
              scope={
                scope.isSuper
                  ? {
                      state: scopeState,
                      ownId: scope.homeCompanyId,
                      current: scope.companyId,
                      companies: companies.map((c) => ({ id: c.id, name: c.name })),
                    }
                  : undefined
              }
            />
          </div>
        </div>
      </header>

      {mode === "demo" ? (
        <div className="border-b border-forest-900/10 bg-forest-900/[0.04]">
          <p className="mx-auto max-w-7xl px-5 py-2 text-[0.8125rem] text-forest-900/65 sm:px-8">
            Demo view. Only the sample submissions are showing, and set-up notices are switched off.
            Switch to Live for the real platform.
          </p>
        </div>
      ) : (
        feed && <SetupBanner items={feed.attention} dismissed={user.prefs.dismissed ?? []} />
      )}

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
      {/* Signing out needs the browser client, same as signing in. */}
      <SupabaseRuntimeConfig />
    </div>
  );
}
