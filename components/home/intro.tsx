import { Eyebrow } from "@/components/ui/eyebrow";
import { Media } from "@/components/ui/media";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";
import { stats } from "@/lib/site";

export function Intro() {
  return (
    <Section tone="bone" id="introduction" className="scroll-mt-24 py-24 sm:py-32">
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="flex flex-col gap-8">
            <Eyebrow>Introduction</Eyebrow>
            <Media
              src="/images/seedling.webp"
              alt="Two hands cupping soil around a young seedling"
              width={1200}
              height={900}
              className="aspect-4/3"
            />
          </div>

          <div className="flex flex-col justify-center gap-9">
            <p className="display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.12] text-forest-900">
              We are a dedicated advisory and consulting firm working at the
              intersection of business strategy and sustainable practice, turning
              regulatory pressure and stakeholder scrutiny into a plan the business can
              run.
            </p>
            <p className="max-w-[58ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
              Our mission is to guide organisations through the complexity of
              sustainable development, transforming challenges into opportunities for
              growth, resilience and reputation. Our vision is a market where economic
              prosperity and environmental stewardship stop pulling in opposite
              directions.
            </p>

            <dl className="grid gap-8 border-t border-forest-900/10 pt-8 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-2">
                  <dt className="font-[family-name:var(--font-serif)] text-[3rem] leading-none text-forest-900">
                    {s.value}
                  </dt>
                  <dd className="max-w-[22ch] text-[0.875rem] leading-snug text-forest-900/55">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <ButtonLink href="/about" variant="ghost">
                More about us
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
