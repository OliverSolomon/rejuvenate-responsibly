import { NextResponse } from "next/server";
import { saveInvites } from "@/lib/rmi/store";
import { send, stakeholderInviteEmail } from "@/lib/rmi/mailer";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Incoming = {
  organisation: string;
  invitedBy: string;
  reference?: string | null;
  stakeholders: { name: string; email: string; relationship: string }[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: Incoming;
  try {
    body = (await request.json()) as Incoming;
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const list = Array.isArray(body?.stakeholders) ? body.stakeholders : [];
  const clean = list.filter((s) => s?.email && EMAIL.test(s.email.trim()));

  if (clean.length < 3) {
    return NextResponse.json(
      { error: "Please add at least three stakeholders with valid email addresses." },
      { status: 422 },
    );
  }
  if (clean.length > 5) {
    return NextResponse.json(
      { error: "The assessment takes a maximum of five stakeholders." },
      { status: 422 },
    );
  }

  const reference = body.reference ?? null;

  try {
    const invites = await saveInvites(
      clean.map((s) => ({
        reference: reference ?? "",
        organisation: body.organisation ?? "",
        invitedBy: body.invitedBy ?? "",
        name: s.name?.trim() ?? "",
        email: s.email.trim().toLowerCase(),
        relationship: s.relationship?.trim() ?? "",
      })),
    );

    const base = process.env.NEXT_PUBLIC_SITE_URL ?? site.url;
    const results = await Promise.all(
      invites.map((invite) =>
        send({
          to: invite.email,
          ...stakeholderInviteEmail({
            organisation: body.organisation,
            invitedBy: body.invitedBy,
            link: `${base}/rmi/survey?t=${invite.token}`,
          }),
        }),
      ),
    );

    return NextResponse.json(
      {
        invited: invites.length,
        delivered: results.filter((r) => r.queued).length,
        links: invites.map((i) => ({
          email: i.email,
          link: `${base}/rmi/survey?t=${i.token}`,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[rmi] failed to create invites", error);
    return NextResponse.json({ error: "Could not create the invitations." }, { status: 500 });
  }
}
