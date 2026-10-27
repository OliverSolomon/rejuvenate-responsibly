import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamPanel } from "@/components/dashboard/team-panel";
import { pageMeta } from "@/lib/seo";
import { TeamError, listTeam, teamConfigured, type TeamMember } from "@/lib/rmi/team";
import { currentScope, teamView } from "@/lib/rmi/scope";

export const metadata: Metadata = pageMeta({
  title: "Team",
  description: "Who can open the dashboard.",
  path: "/dashboard/settings/team",
  private: true,
});

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const scope = await currentScope();
  if (!scope) redirect("/signin?error=denied&next=/dashboard/settings/team");
  const user = scope.user;

  const configured = teamConfigured();

  let team: TeamMember[] = [];
  let problem: string | null = null;
  if (configured) {
    try {
      team = await listTeam(teamView(scope));
    } catch (error) {
      problem =
        error instanceof TeamError
          ? error.message
          : "The team could not be read from Supabase.";
    }
  }

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="text-[0.8125rem] text-forest-900/55 underline-offset-4 hover:underline"
      >
        Back to settings
      </Link>
      <h1 className="display mt-4 text-[clamp(1.75rem,3.4vw,2.5rem)]">Team</h1>
      <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
        The dashboard is not public and has no sign-up. Everyone here was added by an owner, and
        access ends the moment they are removed.
      </p>

      {problem && (
        <p className="mt-6 rounded-card border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          {problem}
        </p>
      )}

      <div className="mt-8">
        <TeamPanel
          team={team}
          you={{ id: user.id, email: user.email, role: user.role }}
          configured={configured}
        />
      </div>

      <p className="mt-6 max-w-[62ch] text-[0.8125rem] leading-relaxed text-forest-900/50">
        Changing your own password is on its own page, at{" "}
        <Link href="/dashboard/set-password" className="underline-offset-4 hover:underline">
          set password
        </Link>
        . An owner can also set someone else&apos;s, which is the way in when email is switched off.
      </p>
    </div>
  );
}
