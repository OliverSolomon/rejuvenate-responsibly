/**
 * Every kind of email the site sends. Each can be switched off on its own from
 * the dashboard, on top of the master switch that stops them all. No server
 * imports here: the settings form uses the list too.
 */
export const EMAIL_KINDS = [
  {
    id: "assessment",
    label: "Assessment link",
    description: "Sent to the person who starts an assessment, and again when they ask to resume it.",
  },
  {
    id: "invite",
    label: "Stakeholder invitations",
    description: "The short survey sent to each stakeholder an assessment owner adds.",
  },
  {
    id: "report",
    label: "Report ready",
    description: "Tells the assessment owner their report is written, or that an admin has sent it.",
  },
  {
    id: "notice",
    label: "Delivery notices",
    description: "The note an admin sends when stakeholder invitations did not get through.",
  },
  {
    id: "enquiry",
    label: "Contact form enquiries",
    description: "Messages from the website contact form, delivered to the contact inbox.",
  },
] as const;

export type EmailKind = (typeof EMAIL_KINDS)[number]["id"];

export const EMAIL_KIND_IDS: readonly EmailKind[] = EMAIL_KINDS.map((k) => k.id);

export const isEmailKind = (v: string): v is EmailKind =>
  (EMAIL_KIND_IDS as readonly string[]).includes(v);
