import { NextResponse } from "next/server";
import { send } from "@/lib/rmi/mailer";
import { site } from "@/lib/site";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    organisation?: string;
    topic?: string;
    message?: string;
    /** Honeypot. Bots fill it, people never see it. */
    website?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (body.website) {
    // Silently accept so the bot does not learn anything.
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (!body.name?.trim() || !body.email || !EMAIL.test(body.email) || !body.message?.trim()) {
    return NextResponse.json(
      { error: "Please give us a name, a valid email address and a message." },
      { status: 422 },
    );
  }

  await send({
    to: process.env.RMI_CONTACT_INBOX ?? site.email,
    subject: `Website enquiry: ${body.topic || "General"} (${body.organisation || "no organisation"})`,
    text: [
      `Name: ${body.name}`,
      `Email: ${body.email}`,
      `Organisation: ${body.organisation || "not given"}`,
      `Topic: ${body.topic || "not given"}`,
      "",
      body.message,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
