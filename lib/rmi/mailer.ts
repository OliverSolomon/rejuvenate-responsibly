/**
 * Outbound email through Mailtrap.
 *
 * Mailtrap runs two separate services on near-identical APIs. Testing catches
 * everything in an inbox so nothing reaches a real person, and needs an inbox
 * id. Sending delivers for real from a verified domain. Point
 * MAILTRAP_INBOX_ID at an inbox to use the first, leave it unset for the
 * second.
 *
 * With no token at all, messages are logged and `queued` comes back false, and
 * the UI tells people to copy their link by hand rather than claiming an email
 * is on its way.
 */

import type { EmailKind } from "./email-kinds";
import { emailAllowed } from "./settings";

/** A file to travel with the message. Mailtrap takes the content base64 encoded. */
export type Attachment = {
  filename: string;
  /** Base64, without a data URL prefix. */
  content: string;
  type: string;
};

/** `kind` decides which dashboard switch governs this message. */
export type Mail = {
  kind: EmailKind;
  to: string;
  subject: string;
  text: string;
  attachments?: Attachment[];
};
export type Delivery = { ok: boolean; queued: boolean; error?: string };

const SENDING = "https://send.api.mailtrap.io/api/send";
const TESTING = "https://sandbox.api.mailtrap.io/api/send";

export function mailConfigured(): boolean {
  return Boolean(process.env.MAILTRAP_TOKEN);
}

function endpoint(): string {
  const inbox = process.env.MAILTRAP_INBOX_ID?.trim();
  return inbox ? `${TESTING}/${inbox}` : SENDING;
}

function sender(): { email: string; name: string } {
  return {
    email: process.env.MAILTRAP_FROM_EMAIL ?? "no-reply@rejuvenateresponsibly.com",
    name: process.env.MAILTRAP_FROM_NAME ?? "Rate My Impact",
  };
}

export async function send(mail: Mail): Promise<Delivery> {
  // The dashboard switch. Reported like a missing token (not queued, not an
  // error) so the UI tells people to pass links on by hand.
  if (!(await emailAllowed(mail.kind))) {
    console.info("[rmi:mail] email is switched off, message not sent", {
      kind: mail.kind,
      to: mail.to,
      subject: mail.subject,
    });
    return { ok: true, queued: false };
  }

  const token = process.env.MAILTRAP_TOKEN;

  if (!token) {
    console.info("[rmi:mail] no Mailtrap token, message not sent", {
      to: mail.to,
      subject: mail.subject,
    });
    return { ok: true, queued: false };
  }

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "Api-Token": token, "content-type": "application/json" },
      body: JSON.stringify({
        from: sender(),
        to: [{ email: mail.to }],
        subject: mail.subject,
        text: mail.text,
        category: "Rate My Impact",
        ...(mail.attachments?.length
          ? {
              attachments: mail.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                type: a.type,
                disposition: "attachment",
              })),
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("[rmi:mail] Mailtrap rejected the message", res.status, detail);
      return { ok: false, queued: false, error: `Mailtrap returned ${res.status}` };
    }

    return { ok: true, queued: true };
  } catch (err) {
    console.error("[rmi:mail] could not reach Mailtrap", err);
    return { ok: false, queued: false, error: "Could not reach the mail provider." };
  }
}

/* The messages themselves live in email-copy so the dashboard can preview them. */
export * from "./email-copy";
