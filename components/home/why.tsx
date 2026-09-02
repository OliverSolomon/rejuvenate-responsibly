import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { Media } from "@/components/ui/media";
import { differentiators } from "@/lib/site";

export function Why() {
  return (
    <Section tone="forest" className="py-24 sm:py-32">
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="flex flex-col gap-8">
            <Eyebrow tone="bone">Why Rejuvenate</Eyebrow>
            <h2 className="display max-w-[14ch] text-[clamp(2rem,4.6vw,3.4rem)] text-bone-50">
              Advice you can put your name to
            </h2>
            <Media
              src="/images/kisite.jpg"
              alt="A fisherman lifting a woven basket trap from a boat off the Kenyan coast"
              width={1200}
              height={900}
              className="mt-auto aspect-4/3"
            />
          </div>

          <dl className="flex flex-col divide-y divide-bone-50/12 border-t border-bone-50/12">
            {differentiators.map((d) => (
              <div key={d.title} className="group grid gap-3 py-7 sm:grid-cols-[0.9fr_1.4fr] sm:gap-8">
                <dt className="display text-[1.35rem] text-bone-50 transition-colors group-hover:text-lime-300">
                  {d.title}
                </dt>
                <dd className="text-[0.9375rem] leading-relaxed text-bone-100/60">{d.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </Section>
  );
}
