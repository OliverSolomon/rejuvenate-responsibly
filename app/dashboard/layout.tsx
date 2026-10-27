import { redirect } from "next/navigation";
import Link from "next/link";
import { currentScope } from "@/lib/rmi/scope";
import { themeCss } from "@/lib/rmi/settings";
import { companyById } from "@/lib/rmi/store";
import { DashboardNav } from "@/components/dashboard/nav";
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
  const [css, viewing] = await Promise.all([
    themeCss().catch(() => null),
    scope.isSuper && scope.companyId ? companyById(scope.companyId) : Promise.resolve(undefined),
  ]);

  return (
    <div className="min-h-screen bg-bone-100" data-rmi-theme>
      {css && <style>{css.replace(":root", "[data-rmi-theme]")}</style>}
      <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-bone-100/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[0.8125rem] font-semibold tracking-[0.01em] uppercase">
                Rate My Impact
              </span>
              <span className="text-[0.6875rem] text-forest-900/45">Dashboard</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {viewing && (
              <span className="hidden rounded-full bg-forest-900/8 px-3 py-1.5 text-[0.75rem] text-forest-900/70 sm:inline">
                Working in {viewing.name}
              </span>
            )}
            <DashboardNav email={user.email} name={user.name} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
      {/* Signing out needs the browser client, same as signing in. */}
      <SupabaseRuntimeConfig />
    </div>
  );
}
