import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/dashboard/set-password-form";
import { pageMeta } from "@/lib/seo";
import { getDashboardUser } from "@/utils/supabase/server";

export const metadata: Metadata = pageMeta({
  title: "Set your password",
  description: "Choose the password you will sign in with.",
  path: "/dashboard/set-password",
  private: true,
});

export const dynamic = "force-dynamic";

/**
 * Where an invitation link ends up, and where anyone can change their own
 * password afterwards.
 *
 * `first=1` is on the link in the invitation email, which only changes the
 * wording. Whether someone has set a password before is not something worth
 * asking Supabase about to choose a sentence.
 */
export default async function SetPasswordPage({
  searchParams,
}: PageProps<"/dashboard/set-password">) {
  const user = await getDashboardUser();
  if (!user) redirect("/signin?error=denied&next=/dashboard/set-password");

  const params = await searchParams;
  const firstTime = params?.first === "1";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)]">
        {firstTime ? "Welcome" : "Your password"}
      </h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-forest-900/60">
        Signed in as {user.email}.
        {firstTime
          ? " Set a password now and that is the last of the setup."
          : " Changing it here signs out nothing else; you stay signed in on this device."}
      </p>

      <div className="mt-8">
        <SetPasswordForm firstTime={firstTime} />
      </div>

      {!firstTime && (
        <p className="mt-6 text-[0.8125rem] text-forest-900/50">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Back to the dashboard
          </Link>
        </p>
      )}
    </div>
  );
}
