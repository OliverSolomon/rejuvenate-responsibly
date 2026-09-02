import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest-900 sm:rounded-[2.25rem]">
        <Image
          src="/images/hero-aerial.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(200deg,rgba(8,23,15,0.74)_0%,rgba(8,23,15,0.34)_44%,rgba(8,23,15,0.86)_100%)]"
        />
        <p className="absolute bottom-3 left-4 z-10 rounded-full bg-forest-950/50 px-3 py-1.5 text-[0.6875rem] text-bone-50/70 backdrop-blur-sm">
          Placeholder · aerial or site photograph
        </p>

        <div className="dark-panel relative flex min-h-[88svh] flex-col justify-end px-5 pb-12 pt-36 sm:px-10 sm:pb-16 lg:px-14 lg:pb-20">
          <p className="eyebrow mb-8 flex items-center gap-2.5 text-bone-50/70">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lime-500" />
            ESG and CSR advisory · Nairobi, Kenya
          </p>

          <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:items-end">
            <h1 className="display text-balance text-[clamp(2.6rem,7vw,5.4rem)] text-bone-50">
              Sustainability that
              <br />
              survives the{" "}
              <span className="relative inline-block">
                board meeting
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-lime-500"
                />
              </span>
            </h1>

            <div className="flex flex-col gap-7">
              <p className="max-w-[42ch] text-[1.0625rem] leading-relaxed text-bone-100/80">
                We help organisations move ESG and CSR out of the appendix and into
                strategy, capital allocation and disclosure, with evidence rigorous
                enough to publish.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/rmi#start" variant="lime" size="lg">
                  Rate my impact
                </ButtonLink>
                <ButtonLink href="/services" variant="dark" size="lg">
                  Our services
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
