import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardUser } from "@/utils/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { LogoMark } from "@/components/ui/logo";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  // The proxy turns away anyone without a session. This is the second gate:
  // a session alone is not enough, the account has to be on the admin list.
  const user = await getDashboardUser();
  if (!user) redirect("/signin?error=denied&next=/dashboard");

  return (
    <div className="min-h-screen bg-bone-100">
      <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-bone-100/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full border border-forest-900/15 px-3.5 py-2 text-[0.8125rem] text-forest-900/65 transition-colors hover:border-forest-900/40 hover:text-forest-900"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Website</span>
            </Link>
            <span
              aria-hidden
              className="hidden h-6 w-px bg-forest-900/12 sm:block"
            />
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="flex flex-col leading-none">
                <span className="font-display text-[0.8125rem] font-semibold tracking-[0.01em] uppercase">
                  Rate My Impact
                </span>
                <span className="text-[0.6875rem] text-forest-900/45">
                  Dashboard
                </span>
              </span>
            </Link>
          </div>
          <DashboardNav email={user.email} name={user.name} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
