import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Media } from "@/components/ui/media";
import { Container, Section } from "@/components/ui/section";
import { PricingCards } from "@/components/rmi/pricing-cards";
import { ScoreDial } from "@/components/rmi/score-dial";
import { SECTIONS, CLIENT_QUESTIONS, STAKEHOLDER_QUESTIONS } from "@/lib/rmi/questions";
import { faqs } from "@/lib/site";

export const metadata: Metadata = {
  title: "Rate My Impact",
  description:
    "The RMI Sustainability Self-Assessment 2026 scores 53 weighted indicators across governance, economic, environmental and social practice, then checks your answers against your own stakeholders.",
};

const steps = [
  {
    n: "01",
    title: "Pay and get your link",
    body: "Choose a tier and pay through Pesapal. We email your assessment link straight after, along with the glossary of terms.",
  },
  {
    n: "02",
    title: "Answer 53 questions",
    body: "Yes or no, one at a time, with a follow up when the answer is yes. It saves as you go, so you can hand a pillar to a colleague.",
  },
  {
    n: "03",
    title: "Name three to five stakeholders",
    body: "Suppliers, investors, community partners, regulators. They get a shorter 40 question survey about the same practices.",
  },
  {
    n: "04",
    title: "Receive your report",
    body: "Both views are consolidated into a scored report on letterhead, carrying an Issued by seal, with a gap analysis and roadmap.",
  },
];

export default function RmiPage() {
  return (
    <>
      <Section tone="forest" className="pt-32 pb-24 sm:pt-40 sm:pb-32">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-20">
            <div className="flex flex-col items-start gap-7">
              <Eyebrow tone="bone">Rate My Impact · 2026</Eyebrow>
              <h1 className="display text-[clamp(2.6rem,6.2vw,4.6rem)] text-bone-50">
                A sustainability score you can defend
              </h1>
              <p className="max-w-[54ch] text-[1.0625rem] leading-relaxed text-bone-100/70">
                Most sustainability self-assessments flatter the people filling them in.
                This one asks a follow up every time you say yes, then puts the same
                questions to the people who watch you from the outside.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="#start" variant="lime" size="lg">
                  See pricing
                </ButtonLink>
                <ButtonLink href="/rmi/assessment" variant="dark" size="lg">
                  Preview the assessment
                </ButtonLink>
              </div>
              <dl className="mt-4 grid w-full grid-cols-3 gap-6 border-t border-bone-50/12 pt-8">
                {[
                  { v: CLIENT_QUESTIONS.length, l: "Client questions" },
                  { v: STAKEHOLDER_QUESTIONS.length, l: "Stakeholder questions" },
                  { v: 4, l: "Weighted pillars" },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="font-[family-name:var(--font-serif)] text-4xl text-bone-50">
                      {s.v}
                    </dt>
                    <dd className="mt-1 text-[0.8125rem] text-bone-100/50">{s.l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative rounded-card border border-bone-50/12 bg-forest-800 p-7 sm:p-9">
              <p className="eyebrow text-bone-100/45">What your report opens with</p>
              <div className="my-8 flex justify-center">
                <ScoreDial value={84} size={210} tone="bone" />
              </div>
              <p className="text-center text-[0.9375rem] text-bone-100/70">
                Gold tier · Highly aligned with NSE disclosure guidance
              </p>
              <ul className="mt-8 grid grid-cols-2 gap-3">
                {SECTIONS.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-bone-50/10 bg-forest-900/40 px-4 py-3 text-[0.8125rem] text-bone-100/70"
                  >
                    {s.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="bone" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>How it runs</Eyebrow>
            <h2 className="display max-w-[16ch] text-[clamp(2rem,4.6vw,3.4rem)]">
              Four steps, about three weeks
            </h2>
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-card bg-forest-900/10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="flex flex-col gap-4 bg-bone-100 p-7 sm:p-8">
                <span className="font-[family-name:var(--font-serif)] text-3xl text-forest-900/25">
                  {s.n}
                </span>
                <h3 className="display text-xl">{s.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-forest-900/60">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="paper" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
            <Media
              src="/images/report-seal.jpg"
              alt="Sample Rate My Impact report cover with the Issued by seal"
              swap="report cover photo"
              width={1000}
              height={1000}
              className="aspect-square"
            />
            <div className="flex flex-col items-start gap-6">
              <Eyebrow>The deliverable</Eyebrow>
              <h2 className="display max-w-[15ch] text-[clamp(2rem,4.6vw,3.2rem)]">
                A report your board will read
              </h2>
              <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
                Same structure as the sample reports we publish for Zamara Insurance and
                the I and M Bank Foundation: an executive summary with the headline
                score and tier, then a pillar by pillar breakdown of performance levels
                and KPI disclosures, a gap analysis, and a roadmap with named next
                steps.
              </p>
              <ul className="flex flex-col gap-3 text-[0.9375rem] text-forest-900/65">
                {[
                  "Framework: NSE Kenya ESG Disclosure Manual and GRI Standards",
                  "Every indicator mapped to an SDG and a GRI disclosure",
                  "Performance levels from Emerging to Excellent, per metric",
                  "Issued on letterhead with an Issued by seal",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/rmi/glossary" variant="ghost" className="mt-2">
                Read the glossary
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="bone" id="start" className="scroll-mt-24 py-24 sm:py-32">
        <Container size="wide">
          <div className="flex flex-col items-center gap-6 text-center">
            <Eyebrow>Get started</Eyebrow>
            <h2 className="display max-w-[16ch] text-[clamp(2rem,4.6vw,3.4rem)]">
              Choose how far you want to go
            </h2>
            <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
              Payment runs through Pesapal. Your assessment link arrives by email as soon
              as the payment clears.
            </p>
          </div>
          <PricingCards />
          <p className="mx-auto mt-10 max-w-[60ch] text-center text-[0.8125rem] leading-relaxed text-forest-900/45">
            Prices exclude VAT. If your organisation needs an invoice or a purchase
            order before payment, contact us and we will raise one.
          </p>
        </Container>
      </Section>

      <Section tone="forest" className="py-24 sm:py-32">
        <Container size="default">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow tone="bone">Questions</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.6vw,3.2rem)] text-bone-50">
              Before you start
            </h2>
          </div>
          <dl className="mt-12 divide-y divide-bone-50/12 border-y border-bone-50/12">
            {faqs.map((f) => (
              <div key={f.q} className="grid gap-3 py-7 sm:grid-cols-[0.9fr_1.3fr] sm:gap-10">
                <dt className="display text-[1.15rem] text-bone-50">{f.q}</dt>
                <dd className="text-[0.9375rem] leading-relaxed text-bone-100/65">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>
    </>
  );
}
