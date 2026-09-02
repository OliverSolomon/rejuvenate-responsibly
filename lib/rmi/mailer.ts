/**
 * Outbound email. Until an SMTP or API key is configured, this logs the message
 * so the rest of the flow can be exercised end to end. Wire up whichever
 * provider the hosting partner prefers by filling in `send`.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
};

export async function send(mail: Mail): Promise<{ ok: boolean; queued: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RMI_MAIL_FROM ?? "Rate My Impact <no-reply@rejuvenateresponsibly.com>";

  if (!key) {
    console.info("[rmi:mail] no provider configured, message not sent", {
      to: mail.to,
      subject: mail.subject,
    });
    return { ok: true, queued: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
  });

  return { ok: res.ok, queued: res.ok };
}

export function stakeholderInviteEmail(opts: {
  organisation: string;
  invitedBy: string;
  link: string;
}): { subject: string; text: string } {
  return {
    subject: `Rate My Impact: a short survey about ${opts.organisation}`,
    text: [
      "Dear Participant,",
      "",
      `${opts.invitedBy} has asked for your view as part of the Rate My Impact Sustainability Self-Assessment 2026.`,
      "",
      `The survey covers 40 yes or no questions about ${opts.organisation} across governance, economic, environmental and social practice. It takes about 10 minutes, and your answers are reported in aggregate rather than attributed to you by name.`,
      "",
      `Complete the survey here: ${opts.link}`,
      "",
      "A glossary of the terms used is available on the first screen if you need it.",
      "",
      "Thank you for your time and transparency.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}

export function clientAccessEmail(opts: { organisation: string; link: string }) {
  return {
    subject: "Your Rate My Impact assessment is ready",
    text: [
      "Dear Participant,",
      "",
      "Thank you for your payment. The Rate My Impact Sustainability Self-Assessment 2026 is now open for you.",
      "",
      `Start here: ${opts.link}`,
      "",
      `The assessment covers 53 questions across four pillars and takes about 15 minutes. Your answers save as you go, so you can hand a section to a colleague and come back to it.`,
      "",
      `Once you have finished, you will be asked to add between three and five stakeholders. They receive their own short survey, and both sets of answers are consolidated into your report for ${opts.organisation}.`,
      "",
      "If you hit any trouble, reply to this email and we will help.",
      "",
      "The RMI Sustainability Team",
      "Rejuvenate Responsibly",
    ].join("\n"),
  };
}
