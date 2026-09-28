export type Tier = {
  id: string;
  name: string;
  price: string;
  /** What we charge. null means the tier is quoted, not sold online. */
  amount: number | null;
  currency: string;
  cadence: string;
  summary: string;
  includes: string[];
  featured?: boolean;
};

/**
 * Payment runs through Pesapal, opened server side by /api/rmi/pay. The amount
 * below is what gets charged, so keep it in step with the display price.
 */
export const pricing: Tier[] = [
  {
    id: "essential",
    name: "Essential",
    price: "35,000",
    amount: 35000,
    currency: "KES",
    cadence: "one assessment",
    summary:
      "The scored self-assessment and a written report on letterhead, issued within ten working days.",
    includes: [
      "53 question self-assessment across four pillars",
      "Three stakeholder surveys",
      "Scored report with SDG and GRI mapping",
      "Gap analysis and prioritised roadmap",
      "Issued by seal on Rejuvenate Responsibly letterhead",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "85,000",
    amount: 85000,
    currency: "KES",
    cadence: "one assessment",
    featured: true,
    summary:
      "Everything in Essential, plus an expert validation call and a board ready presentation.",
    includes: [
      "Everything in Essential",
      "Five stakeholder surveys",
      "Perception gap analysis, your view against theirs",
      "Ninety minute expert validation call",
      "Board ready presentation deck",
      "Benchmarking against sector peers",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Talk to us",
    amount: null,
    currency: "",
    cadence: "annual programme",
    summary:
      "For groups, multi entity structures and organisations preparing a first published ESG report.",
    includes: [
      "Everything in Professional",
      "Assessment across multiple entities or subsidiaries",
      "Quarterly ESG monitoring dashboard",
      "Full diagnostic and assurance readiness review",
      "Support through the NSE disclosure cycle",
    ],
  },
];

