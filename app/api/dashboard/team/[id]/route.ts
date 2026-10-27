import { NextResponse } from "next/server";
import {
  TeamError,
  changeRole,
  makeInvitation,
  removeMember,
  setMemberPassword,
  updateName,
} from "@/lib/rmi/team";
import { deliverInvitation } from "@/lib/rmi/team-invite";
import { canManageTeam, currentScope, teamView } from "@/lib/rmi/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One person on the team: their role, their name, their password, their link,
 * or their access.
 *
 * Every one of these is an owner's job. The team module holds the rules that
 * stop a team locking itself out, so this route only has to establish who is
 * asking and hand over what they asked for.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown, fallback: string) {
  const status = error instanceof TeamError ? error.status : 500;
  const message = error instanceof TeamError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

async function owner() {
  const scope = await currentScope();
  if (!scope) {
    return {
      response: NextResponse.json(
        { error: "You are not signed in as an admin." },
        { status: 403 },
      ),
    };
  }
  if (!canManageTeam(scope)) {
    return {
      response: NextResponse.json(
        { error: "Only an owner can change who is on the team." },
        { status: 403 },
      ),
    };
  }
  return { user: scope.user, scope };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await owner();
  if (gate.response) return gate.response;
  const user = gate.user!;
  const view = teamView(gate.scope!);

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "That is not a person's id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body was not JSON." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "role":
        return NextResponse.json({
          member: await changeRole(id, body.role, user.id, view, {
            allowSuper: gate.scope!.isSuper,
          }),
        });

      case "name":
        return NextResponse.json({ member: await updateName(id, body.fullName, view) });

      case "password": {
        const member = await setMemberPassword(id, body.password, view);
        return NextResponse.json({
          member,
          note: "Tell them the password yourself. It is not emailed, because an emailed password is a password in two places.",
        });
      }

      case "invite": {
        const invitation = await makeInvitation(id, view);
        const delivery = await deliverInvitation(invitation, user.name || user.email);
        return NextResponse.json({
          invited: true,
          emailed: delivery.emailed,
          link: delivery.emailed ? undefined : delivery.link,
          ...(delivery.error ? { emailError: delivery.error } : {}),
        });
      }

      default:
        return NextResponse.json(
          { error: "Say what to do: role, name, password or invite." },
          { status: 400 },
        );
    }
  } catch (error) {
    return fail(error, "That did not work.");
  }
}

/** Take the dashboard away. The Supabase account itself is left alone. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await owner();
  if (gate.response) return gate.response;
  const user = gate.user!;
  const view = teamView(gate.scope!);

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "That is not a person's id." }, { status: 400 });
  }

  try {
    await removeMember(id, user.id, view);
    return NextResponse.json({ removed: true });
  } catch (error) {
    return fail(error, "They could not be removed.");
  }
}
