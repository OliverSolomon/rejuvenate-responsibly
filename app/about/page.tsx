import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Media } from "@/components/ui/media";
import { Container, Section } from "@/components/ui/section";
import { Cta } from "@/components/home/cta";
import { values } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Rejuvenate Responsibly is an advisory and consulting firm in Nairobi working at the intersection of business strategy and sustainable practice.",
};

export default function AboutPage() {
  return (
    <>
      <Section tone="bone" className="pt-32 pb-20 sm:pt-40">
        <Container size="wide">
          <Eyebrow>About us</Eyebrow>
          <h1 className="display mt-6 max-w-[16ch] text-[clamp(2.6rem,6.4vw,4.8rem)]">
            Guiding sustainable transformation
          </h1>
          <p className="mt-8 max-w-[58ch] text-[1.125rem] leading-relaxed text-forest-900/70">
            We are a dedicated advisory and consulting firm specialising in the
            intersection of business strategy and sustainable practice. We help
            organisations build environmental, social and governance principles and
            corporate social responsibility into how they run day to day, so the work
            drives both positive impact and long-term value.
          </p>
        </Container>
      </Section>

      <Section tone="bone" className="pb-24">
        <Container size="wide">
          <Media
            src="/images/community.jpg"
            alt="Community programme in East Africa"
            swap="team or community photo"
            width={1600}
            height={800}
            className="aspect-16/7"
          />
        </Container>
      </Section>

      <Section tone="paper" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="flex flex-col gap-5">
              <Eyebrow>Our vision</Eyebrow>
              <p className="display text-[clamp(1.5rem,2.8vw,2.15rem)] leading-[1.15]">
                To be the leading partner for organisations committed to a responsible
                future, where economic prosperity and environmental stewardship stop
                pulling against each other.
              </p>
              <p className="text-[1.0625rem] leading-relaxed text-forest-900/65">
                We want a world where businesses do well by operating ethically and
                sustainably, with a real commitment to the societies they draw from.
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <Eyebrow>Our mission</Eyebrow>
              <p className="display text-[clamp(1.5rem,2.8vw,2.15rem)] leading-[1.15]">
                To guide businesses through the complexity of sustainable development,
                turning challenges into openings for growth, resilience and reputation.
              </p>
              <p className="text-[1.0625rem] leading-relaxed text-forest-900/65">
                In practice that means strategy that survives a board meeting, disclosure
                that survives assurance, and internal capability that outlives the
                engagement.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="forest" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow tone="bone">Our values</Eyebrow>
            <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.4rem)] text-bone-50">
              What we hold to
            </h2>
          </div>
          <dl className="mt-14 grid gap-px overflow-hidden rounded-card bg-bone-50/12 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.title} className="flex flex-col gap-4 bg-forest-900 p-7 sm:p-8">
                <span className="font-[family-name:var(--font-serif)] text-2xl text-lime-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="display text-xl text-bone-50">{v.title}</dt>
                <dd className="text-[0.9375rem] leading-relaxed text-bone-100/60">{v.body}</dd>
              </div>
            ))}
            <div className="hidden bg-forest-800 p-8 lg:block">
              <p className="text-[0.9375rem] leading-relaxed text-bone-100/50">
                These are not wall posters. Each one shows up as a decision rule in how we
                scope work, price it and say no to it.
              </p>
            </div>
          </dl>
        </Container>
      </Section>

      <Section tone="bone" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div className="flex flex-col items-start gap-6">
              <Eyebrow>Our approach</Eyebrow>
              <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.2rem)]">
                Tailored, and built with you
              </h2>
            </div>
            <div className="flex flex-col gap-6 text-[1.0625rem] leading-relaxed text-forest-900/70">
              <p>
                Our consultants work closely with your leadership to understand the
                context, the constraints and the ambition. We pair sector expertise with a
                pragmatic method, so recommendations are strategically sound and
                someone in your organisation can own them on Monday.
              </p>
              <p>
                We focus on building internal capability. The measure of a good
                engagement is that the reporting cycle after ours runs without us.
              </p>
              <p>
                Our team comes from environmental science, social impact, corporate
                governance and general management, which is why the advice tends to
                account for the operational cost of the thing being recommended.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Cta />
    </>
  );
}
