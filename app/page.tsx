import { Hero } from "@/components/home/hero";
import { FrameworkMarquee } from "@/components/home/marquee";
import { Intro } from "@/components/home/intro";
import { Approach } from "@/components/home/approach";
import { RmiTeaser } from "@/components/home/rmi-teaser";
import { Why } from "@/components/home/why";
import { Cta } from "@/components/home/cta";
import { ServicesAccordion } from "@/components/home/services-accordion";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FrameworkMarquee />
      <Intro />

      <Section tone="forest" className="py-24 sm:py-32">
        <Container size="wide">
          <div className="flex flex-col items-center gap-6 text-center">
            <Eyebrow tone="bone">Services</Eyebrow>
            <h2 className="display max-w-[18ch] text-[clamp(2rem,4.6vw,3.4rem)] text-bone-50">
              Consulting for wherever you are starting from
            </h2>
            <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-bone-100/65">
              Five practice areas, delivered as one engagement or on their own,
              whichever gets you to a defensible position fastest.
            </p>
          </div>
          <ServicesAccordion />
        </Container>
      </Section>

      <Approach />
      <RmiTeaser />
      <Why />
      <Cta />
    </>
  );
}
