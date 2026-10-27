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

/* -------------------------------------------------------------------------- */
/* messages                                                                   */
/* -------------------------------------------------------------------------- */

export function assessmentAccessEmail(opts: {
  organisation: string;
  code: string;
  link: string;
}): { subject: string; text: string } {
  return {
    subject: `Your Rate My Impact assessment: ${opts.code}`,
    text: [
      "Hello,",
      "",
      `Your Rate My Impact assessment for ${opts.organisation} is open, and this is the reference you will need to get back into it.`,
      "",
      `Assessment ID: ${opts.code}`,
      `Your link: ${opts.link}`,
      "",
      "Keep that link. It is the only way back to your answers, and anyone holding it can see them, so treat it like a password.",
      "",
      "Your answers save as you go, so you can close the tab, hand a pillar to a colleague and come back whenever suits.",
      "",
      "Once you submit, you will be asked to add the people who see your operations from the outside. They each get a shorter survey, and your report is written once they have all answered.",
      "",
      "Reply to this email if anything gets in the way.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

export function shareInviteEmail(opts: {
  organisation: string;
  link: string;
}): { subject: string; text: string } {
  return {
    subject: `A short survey about ${opts.organisation}`,
    text: [
      "Hello,",
      "",
      `${opts.organisation} has asked for your view as part of the Rate My Impact Sustainability Self-Assessment 2026.`,
      "",
      "It is 40 yes or no questions about governance, economic, environmental and social practice. Most people finish in about ten minutes. Your answers are reported alongside the other respondents and are never attributed to you by name.",
      "",
      `Your survey: ${opts.link}`,
      "",
      "The first screen links to a glossary if any of the terms need pinning down.",
      "",
      "Thank you for the time.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

/**
 * Sent by an admin to the person who submitted the assessment, when invitations
 * to their stakeholders did not go through. The admin sees and can edit this
 * text before it leaves; this is only the starting draft.
 */
export function deliveryNoticeEmail(opts: {
  contactName: string;
  organisation: string;
  failed: { email: string; link: string }[];
}): { subject: string; text: string } {
  const many = opts.failed.length > 1;
  return {
    subject: `${many ? "Some survey invitations" : "A survey invitation"} for ${opts.organisation} did not arrive`,
    text: [
      `Hello${opts.contactName ? ` ${opts.contactName.split(" ")[0]}` : ""},`,
      "",
      `We tried to send the Rate My Impact survey to ${many ? "the addresses" : "the address"} below on behalf of ${opts.organisation}, and the ${many ? "messages were" : "message was"} not delivered:`,
      "",
      ...opts.failed.flatMap((f) => [`${f.email}`, `Survey link: ${f.link}`, ""]),
      `Please check ${many ? "each address" : "the address"} for typing mistakes. You can reply to this email with a corrected address and we will send the invitation again, or you can pass the survey link above to ${many ? "each person" : "them"} yourself.`,
      "",
      "Your report is written once everyone you invited has answered, so it is worth sorting this out soon.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

export function reportReadyEmail(opts: {
  organisation: string;
  code: string;
  link: string;
  respondents: number;
  /**
   * Set when an admin sends the report before everyone has answered. The email
   * then says so plainly instead of claiming every stakeholder is in.
   */
  outstanding?: number;
  invited?: number;
}): { subject: string; text: string } {
  const early = (opts.outstanding ?? 0) > 0;
  const opening = early
    ? `The Rejuvenate Responsibly team has finalised your report for ${opts.organisation}, and it is ready for you.`
    : `Every stakeholder you invited has now answered, so your report for ${opts.organisation} has been written and is waiting for you.`;
  return {
    subject: `Your Rate My Impact report is ready: ${opts.code}`,
    text: [
      "Hello,",
      "",
      opening,
      ...(early
        ? [
            "",
            `It is based on answers from ${opts.respondents} of ${opts.invited ?? opts.respondents + (opts.outstanding ?? 0)} stakeholders. ${opts.outstanding} had not responded when it was finalised, so their view is not in it.`,
          ]
        : []),
      "",
      `Read it here: ${opts.link}`,
      "",
      `It covers all four pillars, sets your self-assessment against what your ${opts.respondents} ${opts.respondents === 1 ? "stakeholder" : "stakeholders"} said, and ends with a gap analysis and a roadmap.`,
      "",
      "The page prints straight to PDF if you need a copy to circulate.",
      "",
      "The report is issued on the basis of self-declared responses and the stakeholder survey. It is not an audit. If you would like it validated, reply and we will arrange a diagnostic call.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

/**
 * The invitation a new dashboard user receives.
 *
 * It carries one link, good once, that signs them in long enough to choose a
 * password. Nothing about the dashboard is explained here beyond what they need
 * to get in; the person who added them will have said the rest.
 */
export function teamInviteEmail(opts: {
  /** Who added them, so the email is not from nobody. */
  invitedBy: string;
  link: string;
  /** Returning to an account that already exists reads differently. */
  returning: boolean;
}): { subject: string; text: string } {
  const subject = opts.returning
    ? "Set a new password for the Rate My Impact dashboard"
    : "You have been added to the Rate My Impact dashboard";

  const opening = opts.returning
    ? `${opts.invitedBy} has asked us to send you a new link for the Rate My Impact dashboard.`
    : `${opts.invitedBy} has added you to the Rate My Impact dashboard, where Rejuvenate Responsibly reads the assessments clients have submitted and the reports written from them.`;

  const text = [
    opening,
    "",
    "Open this link to choose your password:",
    opts.link,
    "",
    "The link works once and expires in 24 hours. If it has run out, ask whoever added you to send another.",
    "",
    "After that you sign in with your email address and the password you chose.",
    "",
    "If you were not expecting this, you can ignore it: the link alone does not let anyone else in.",
  ].join("\n");

  return { subject, text };
}
