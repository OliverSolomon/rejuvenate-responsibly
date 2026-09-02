export type GlossaryEntry = {
  term: string;
  definition: string;
  check?: string;
};

export type GlossaryGroup = {
  group: string;
  entries: GlossaryEntry[];
};

export const glossary: GlossaryGroup[] = [
  {
    group: "Corporate governance",
    entries: [
      {
        term: "Board oversight",
        definition:
          "The active role of a company's board of directors in reviewing, guiding and monitoring the organisation's sustainability strategy, major plans of action, risk management policies and performance goals.",
        check:
          "To answer yes, the board must have a formal recurring agenda item, or a designated sub-committee such as an ESG or risk committee, officially responsible for sustainability metrics.",
      },
      {
        term: "Materiality assessment",
        definition:
          "The formal process of identifying, refining and assessing the environmental, social and governance issues that could significantly affect your business operations and its stakeholders.",
        check:
          "To qualify as a formal assessment it must involve stakeholder engagement through surveys, interviews or workshops, and be updated at least every two years.",
      },
      {
        term: "FPIC (Free, Prior and Informed Consent)",
        definition:
          "A right granted to Indigenous peoples under the UN Declaration on the Rights of Indigenous Peoples. It allows them to give or withhold consent to a project that may affect them or their territories.",
        check:
          "This requires documented evidence of consultation before any project activities begin, without coercion or manipulation.",
      },
      {
        term: "Whistleblower protection and zero retaliation policy",
        definition:
          "Legally binding frameworks and internal rules that guarantee employees reporting unethical behaviour, fraud or environmental non-compliance are shielded from dismissal, demotion, harassment or bias.",
      },
    ],
  },
  {
    group: "Economic viability and strategy",
    entries: [
      {
        term: "Sustainable strategy",
        definition:
          "A core business plan that builds long-term environmental and social considerations into the financial growth model, so current economic gains do not compromise future resource availability.",
      },
      {
        term: "Financial transparency",
        definition:
          "Timely, accurate and complete public disclosure of financial statements, tax reporting and funding structures, aligned with international accounting standards, to prevent corruption or facilitation payments.",
      },
    ],
  },
  {
    group: "Environmental impact",
    entries: [
      {
        term: "GHG emissions, Scope 1, 2 and 3",
        definition:
          "Greenhouse gas emissions tracking in three categories. Scope 1 covers direct emissions from sources you own or control, such as company vehicles and boilers. Scope 2 covers indirect emissions from purchased electricity, steam, heating or cooling. Scope 3 covers all other indirect emissions in your value chain, such as purchased goods, transport and product disposal.",
      },
      {
        term: "EMS certification (Environmental Management System)",
        definition:
          "A structured framework for managing an organisation's environmental footprint.",
        check:
          "To answer yes, the system should be verified or certified against an international benchmark such as ISO 14001.",
      },
      {
        term: "Water stewardship",
        definition:
          "Use of water that is socially equitable, environmentally sustainable and economically beneficial, achieved through a stakeholder inclusive process involving site and catchment based actions.",
      },
    ],
  },
  {
    group: "Social responsibility",
    entries: [
      {
        term: "Modern slavery and human trafficking",
        definition:
          "The recruitment, movement, harbouring or receiving of children or adults through force, coercion, abuse of vulnerability or deception, for the purpose of exploitation including forced labour and debt bondage.",
        check:
          "Compliance requires active due diligence and auditing of tier 1 and tier 2 supply chains, not only internal corporate policies.",
      },
      {
        term: "Fair labour practices",
        definition:
          "Employment policies guaranteeing safe working environments, fair compensation meaning a living wage rather than the legal minimum, reasonable working hours, and non-discriminatory hiring and promotion.",
      },
    ],
  },
  {
    group: "Framework acronyms",
    entries: [
      {
        term: "GRI (Global Reporting Initiative)",
        definition:
          "The global standard framework businesses use to understand, measure and communicate their impacts on critical sustainability issues.",
      },
      {
        term: "SDG (Sustainable Development Goals)",
        definition:
          "Seventeen interlinked global goals designed by the United Nations as a shared blueprint for peace and prosperity for people and the planet, now and into the future.",
      },
    ],
  },
];
