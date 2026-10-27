import { NextResponse } from "next/server";
import { TeamError, addMember, listTeam } from "@/lib/rmi/team";
import { deliverInvitation } from "@/lib/rmi/team-invite";
import { canManageTeam, currentScope, settingsCompany, teamView } from "@/lib/rmi/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The team list, and adding to it.
 *
 * Reading is open to anyone on the dashboard: knowing who your colleagues are
 * is not privileged. Changing anything is an owner's job, checked here as well
 * as hidden in the interface, because a route can be called directly.
 */

const denied = () =>
  NextResponse.json({ error: "You are not signed in as an admin." }, { status: 403 });

const notOwner = () =>
  NextResponse.json(
    { error: "Only an owner can change who is on the team." },
    { status: 403 },
  );

export async function GET() {
  const scope = await currentScope();
  if (!scope) return denied();

  try {
    return NextResponse.json({ team: await listTeam(teamView(scope)), you: scope.user });
  } catch (error) {
    const status = error instanceof TeamError ? error.status : 500;
    const message =
      error instanceof TeamError ? error.message : "The team could not be read.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const scope = await currentScope();
  if (!scope) return denied();
  if (!canManageTeam(scope)) return notOwner();
  const user = scope.user;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  try {
    const { member, invitation } = await addMember({
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      // Absent means invite them; present means the owner is setting it.
      password: body.password === undefined || body.password === "" ? undefined : body.password,
      by: user.email,
      // An owner's people join the owner's company. Only a super admin chooses
      // one, and without a choice it is the company they are managing.
      companyId:
        scope.isSuper && typeof body.companyId === "string" && body.companyId.trim()
          ? body.companyId.trim()
          : settingsCompany(scope),
      allowSuper: scope.isSuper,
    });

    if (!invitation) {
      return NextResponse.json({ member, invited: false }, { status: 201 });
    }

    const delivery = await deliverInvitation(invitation, user.name || user.email);
    return NextResponse.json(
      {
        member,
        invited: true,
        emailed: delivery.emailed,
        // Shown so an owner can pass it on by hand when email is off or broken.
        link: delivery.emailed ? undefined : delivery.link,
        ...(delivery.error ? { emailError: delivery.error } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    const status = error instanceof TeamError ? error.status : 500;
    const message =
      error instanceof TeamError ? error.message : "They could not be added.";
    return NextResponse.json({ error: message }, { status });
  }
}
