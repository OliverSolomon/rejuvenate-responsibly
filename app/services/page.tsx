import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { Cta } from "@/components/home/cta";
import { Media } from "@/components/ui/media";
import { services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our services",
  description:
    "Sustainability strategy, ESG advisory, CSR programme design, reporting and disclosure, and sustainable finance, from a Nairobi based consultancy.",
};

const art = [
  "/images/data-dashboard.jpg",
  "/images/boardroom.jpg",
  "/images/community.jpg",
  "/images/report-seal.jpg",
  "/images/supply-chain.jpg",
];

export default function ServicesPage() {
  return (
    <>
      <Section tone="bone" className="pt-32 pb-20 sm:pt-40">
        <Container size="wide">
          <Eyebrow>Our services</Eyebrow>
          <h1 className="display mt-6 max-w-[15ch] text-[clamp(2.6rem,6.4vw,4.8rem)]">
            Five practices, one engagement
          </h1>
          <p className="mt-8 max-w-[56ch] text-[1.125rem] leading-relaxed text-forest-900/70">
            A full suite of consulting services built to meet organisations wherever
            they are starting from. Take one, or take the sequence.
          </p>
        </Container>
      </Section>

      <Section tone="bone" className="pb-28">
        <Container size="wide">
          <div className="flex flex-col">
            {services.map((service, i) => (
              <article
                key={service.slug}
                id={service.slug}
                className="grid scroll-mt-28 gap-8 border-t border-forest-900/12 py-14 lg:grid-cols-[0.35fr_0.9fr_0.75fr] lg:gap-12"
              >
                <div className="flex items-start gap-4">
                  <span className="font-[family-name:var(--font-serif)] text-3xl text-forest-900/25">
                    {service.number}
                  </span>
                </div>

                <div className="flex flex-col gap-5">
                  <h2 className="display text-[clamp(1.6rem,3.2vw,2.4rem)]">{service.title}</h2>
                  <p className="text-[1.0625rem] leading-relaxed text-forest-900/70">
                    {service.summary}
                  </p>
                  <ul className="mt-2 flex flex-col gap-3">
                    {service.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-3 text-[0.9375rem] leading-relaxed text-forest-900/60"
                      >
                        <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <Media
                  src={art[i]}
                  alt=""
                  swap="service photo"
                  width={800}
                  height={600}
                  className="aspect-4/3"
                />
              </article>
            ))}
          </div>
        </Container>
      </Section>

      <Cta />
    </>
  );
}
