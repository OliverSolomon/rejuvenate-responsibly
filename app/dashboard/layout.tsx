import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardUser } from "@/utils/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { LogoMark } from "@/components/ui/logo";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // The proxy turns away anyone without a session. This is the second gate:
  // a session alone is not enough, the account has to be on the admin list.
  const user = await getDashboardUser();
  if (!user) redirect("/signin?error=denied&next=/dashboard");

  return (
    <div className="min-h-screen bg-bone-100">
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
          <DashboardNav email={user.email} name={user.name} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}
