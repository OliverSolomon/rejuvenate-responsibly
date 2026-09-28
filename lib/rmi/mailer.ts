/**
 * Outbound email. Until a provider key is configured this logs the message so
 * the rest of the flow can be exercised end to end. Swap the body of `send`
 * for whichever provider the hosting partner prefers.
 */

export type Mail = { to: string; subject: string; text: string };

export async function send(mail: Mail): Promise<{ ok: boolean; queued: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.RMI_MAIL_FROM ?? "Rate My Impact <no-reply@rejuvenateresponsibly.com>";

  if (!key) {
    console.info("[rmi:mail] no provider configured, message not sent", {
      to: mail.to,
      subject: mail.subject,
    });
    return { ok: true, queued: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
  });

  return { ok: res.ok, queued: res.ok };
}

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
      "Your answers save as you go, on the server and in the browser you started in. You can close the tab, hand a pillar to a colleague and come back whenever suits.",
      "",
      "Once you submit, you will be asked to add the people who see your operations from the outside. They each get a shorter survey, and both sets of answers go into your report.",
      "",
      "Reply to this email if anything gets in the way.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

export function shareInviteEmail(opts: { link: string }): { subject: string; text: string } {
  return {
    subject: "A short survey about an organisation you work with",
    text: [
      "Hello,",
      "",
      "You have been asked for your view as part of the Rate My Impact Sustainability Self-Assessment 2026.",
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
