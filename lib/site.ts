export const site = {
  name: "Rejuvenate Responsibly",
  tagline: "Your social responsibility on autopilot",
  url: "https://rejuvenateresponsibly.com",
  description:
    "Rejuvenate Responsibly is an advisory and consulting firm working at the intersection of business strategy and sustainable practice. We help organisations across East Africa build ESG and CSR into the places where decisions get made.",
  location: "Nairobi, Kenya",
  email: "info@rejuvenateresponsibly.com",
  phones: ["+254 709 000 507", "+254 108 000 507"],
  whatsapp: "https://wa.me/254108000507",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/rejuvenate-responsibly/" },
    { label: "X", href: "https://x.com/ReRejuvenate" },
    { label: "Instagram", href: "https://www.instagram.com/rejuvenate.responsibly/" },
  ],
} as const;

export const nav = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Why Rejuvenate", href: "/why-rejuvenate" },
  { label: "Rate My Impact", href: "/rmi" },
  { label: "Contact", href: "/contact" },
] as const;

export const stats = [
  { value: "93", label: "Weighted indicators in the RMI assessment" },
  { value: "4", label: "Pillars: governance, economic, environmental, social" },
  { value: "17", label: "SDGs mapped across every question" },
] as const;

export const services = [
  {
    slug: "sustainability-strategy",
    image: "/images/solar-windfarm.png",
    imageAlt: "Solar array and wind turbines sharing a single site",
    number: "01",
    title: "Sustainability Strategy Development",
    summary:
      "A roadmap your board can sign off on, and your operations team can run.",
    points: [
      "Bespoke sustainability roadmaps aligned to business objectives",
      "Materiality assessments to identify and rank the ESG issues that matter",
      "Integration of sustainability into corporate vision, mission and values",
    ],
  },
  {
    slug: "esg-advisory",
    image: "/images/windfarm.jpg",
    imageAlt: "Wind turbines across farmland and woodland",
    number: "02",
    title: "ESG Advisory",
    summary:
      "Environmental, social and governance work that survives contact with a regulator.",
    points: [
      "Environmental: decarbonisation pathways, climate risk, circularity, resource efficiency, supply chain",
      "Social: DEI programmes, human rights due diligence, community engagement, labour practices",
      "Governance: board oversight of ESG, ethics frameworks, risk management, transparent reporting",
    ],
  },
  {
    slug: "csr-programmes",
    image: "/images/seychelles.jpg",
    imageAlt: "Aerial view of a forested coastline and a moored sailing boat",
    number: "03",
    title: "CSR Programme Design & Implementation",
    summary:
      "Moving giving from discretionary spend to a measurable part of the business.",
    points: [
      "CSR initiatives aligned to corporate values and stakeholder expectations",
      "Employee engagement programmes around social and environmental causes",
      "Philanthropy and community investment strategy",
    ],
  },
  {
    slug: "reporting-disclosure",
    image: "/images/ship-portrait.jpg",
    imageAlt: "Container ship seen head on, under way",
    number: "04",
    title: "Reporting & Disclosure",
    summary:
      "Disclosure that stands up to assurance, written for the people who read it.",
    points: [
      "GRI, SASB, TCFD and CDP reporting support",
      "ESG report writing, assurance readiness and communication strategy",
      "Benchmarking against industry best practice and NSE disclosure guidance",
    ],
  },
  {
    slug: "sustainable-finance",
    image: "/images/logistics.jpg",
    imageAlt: "Aerial view of a loaded container ship escorted by a tug",
    number: "05",
    title: "Sustainable Finance & Investment",
    summary:
      "Making the capital side of the business speak the same language as the strategy.",
    points: [
      "Green bonds, sustainable investment frameworks and impact investing",
      "ESG integration into financial decision-making and risk assessment",
      "Internal carbon pricing and transition-cost modelling",
    ],
  },
] as const;

export const values = [
  {
    title: "Integrity",
    body: "The highest ethical standards in every engagement, with transparency that earns trust rather than assuming it.",
  },
  {
    title: "Impact",
    body: "Measurable environmental and social outcomes for our clients and the places they operate.",
  },
  {
    title: "Innovation",
    body: "Continuously testing new methods against sustainability challenges that keep changing shape.",
  },
  {
    title: "Collaboration",
    body: "Working alongside your team, co-creating strategy rather than handing over a deck.",
  },
  {
    title: "Excellence",
    body: "Exceptional quality in every piece of advisory work we put our name to.",
  },
] as const;

export const differentiators = [
  {
    title: "One view of the business",
    body: "We close the gap between business strategy and sustainability, so the two stop competing for the same budget.",
  },
  {
    title: "Expert team",
    body: "Consultants drawn from environmental science, social impact, corporate governance and general management.",
  },
  {
    title: "Tailored solutions",
    body: "Every organisation is different. We build for your sector, your regulator and your stage of maturity.",
  },
  {
    title: "Measurable impact",
    body: "We help you track progress, communicate it credibly and demonstrate real value to the people who fund you.",
  },
  {
    title: "Future-ready",
    body: "Regulatory change, stakeholder demands and market shifts. Positioned for, rather than reacted to.",
  },
] as const;

export const approachSteps = [
  {
    step: "Diagnose",
    body: "We start with evidence. The Rate My Impact assessment scores 93 weighted indicators across four pillars, cross-checked against the people who see your operations from the outside.",
  },
  {
    step: "Prioritise",
    body: "A materiality view of which gaps carry regulatory, financial and reputational weight, and which are noise you can safely defer.",
  },
  {
    step: "Build",
    body: "Roadmaps, policies, governance structures and reporting architecture, designed with the team that will own them after we leave.",
  },
  {
    step: "Prove",
    body: "Disclosure aligned to GRI and NSE guidance, with a quarterly dashboard so progress is visible between reporting cycles.",
  },
] as const;

export const faqs = [
  {
    q: "How long does the Rate My Impact assessment take?",
    a: "Most clients finish the 53-question self-assessment in 15 to 20 minutes. It saves as you go, so you can hand a section to a colleague and come back to it later.",
  },
  {
    q: "Why do you also survey our stakeholders?",
    a: "Self-assessment alone tends to be generous. Between three and five stakeholders answer a parallel 40-question survey, and the gap between the two views is usually the most useful finding in the report.",
  },
  {
    q: "What do we get at the end?",
    a: "A scored report on Rejuvenate Responsibly letterhead carrying an Issued by seal. It sets out performance levels for each pillar, the KPI disclosures behind them, a gap analysis and a roadmap, in the same format as our published sample reports.",
  },
  {
    q: "Which frameworks does the scoring map to?",
    a: "Every indicator is mapped to the relevant UN SDG and GRI disclosure, and the report is structured against the NSE Kenya ESG Disclosure Manual.",
  },
  {
    q: "Is our data confidential?",
    a: "Yes. Responses are used to produce your report and are never published or shared without written instruction. Stakeholder responses are reported in aggregate.",
  },
] as const;
