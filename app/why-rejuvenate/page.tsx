import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Media } from "@/components/ui/media";
import { Container, Section } from "@/components/ui/section";
import { Cta } from "@/components/home/cta";
import { approachSteps, differentiators } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why Rejuvenate",
  description:
    "Why organisations across East Africa choose Rejuvenate Responsibly for ESG and CSR advisory work.",
};

export default function WhyPage() {
  return (
    <>
      <Section tone="bone" className="pt-32 pb-20 sm:pt-40">
        <Container size="wide">
          <Eyebrow>Why Rejuvenate</Eyebrow>
          <h1 className="display mt-6 max-w-[15ch] text-[clamp(2.6rem,6.4vw,4.8rem)]">
            Because the advice has to hold up
          </h1>
          <p className="mt-8 max-w-[56ch] text-[1.125rem] leading-relaxed text-forest-900/70">
            Regulators, lenders and buyers are all asking harder questions than they were
            three years ago. What follows is what we bring to that.
          </p>
        </Container>
      </Section>

      <Section tone="bone" className="pb-24">
        <Container size="wide">
          <dl className="grid gap-px overflow-hidden rounded-card bg-forest-900/12 sm:grid-cols-2 lg:grid-cols-3">
            {differentiators.map((d, i) => (
              <div key={d.title} className="flex flex-col gap-4 bg-bone-100 p-7 sm:p-9">
                <span className="font-[family-name:var(--font-serif)] text-2xl text-forest-900/25">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="display text-xl">{d.title}</dt>
                <dd className="text-[0.9375rem] leading-relaxed text-forest-900/60">{d.body}</dd>
              </div>
            ))}
            <div className="flex flex-col justify-end gap-4 bg-lime-500 p-7 text-forest-950 sm:p-9">
              <p className="display text-xl">Start with evidence</p>
              <p className="text-[0.9375rem] leading-relaxed text-forest-900/70">
                The Rate My Impact assessment gives us both a shared, scored starting
                point before a single recommendation is made.
              </p>
            </div>
          </dl>
        </Container>
      </Section>

      <Section tone="forest" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
            <div className="flex flex-col gap-8">
              <Eyebrow tone="bone">How we work</Eyebrow>
              <h2 className="display max-w-[13ch] text-[clamp(2rem,4.6vw,3.2rem)] text-bone-50">
                Diagnose, prioritise, build, prove
              </h2>
              <Media
                src="/images/ship.jpg"
                alt="Container ships alongside gantry cranes at a working port"
                width={1200}
                height={800}
                className="mt-auto aspect-3/2"
              />
            </div>
            <ol className="flex flex-col divide-y divide-bone-50/12 border-t border-bone-50/12">
              {approachSteps.map((s, i) => (
                <li key={s.step} className="grid gap-3 py-8 sm:grid-cols-[auto_1fr] sm:gap-8">
                  <span className="font-[family-name:var(--font-serif)] text-2xl text-lime-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-3">
                    <h3 className="display text-2xl text-bone-50">{s.step}</h3>
                    <p className="text-[0.9375rem] leading-relaxed text-bone-100/65">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </Section>

      <Cta />
    </>
  );
}
