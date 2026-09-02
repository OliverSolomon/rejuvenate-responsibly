import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-forest-900 sm:rounded-[2.25rem]">
        <Image
          src="/images/tigoni2-1-1.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Two scrims: one lifts the copy off the photograph, one keeps the
            top corners dark enough for the header to sit on. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,23,15,0.94)_0%,rgba(8,23,15,0.78)_28%,rgba(8,23,15,0.30)_58%,rgba(8,23,15,0.16)_78%,rgba(8,23,15,0.52)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_15%_100%,rgba(8,23,15,0.55)_0%,transparent_60%)]"
        />

        <div className="dark-panel relative flex min-h-[90svh] flex-col px-5 pb-10 pt-26 sm:px-10 sm:pb-12 sm:pt-28 lg:px-14 lg:pb-14">
          {/* Sits directly under the hairline the header draws */}
          <p className="text-[0.9375rem] text-bone-50/70">
            ESG and CSR advisory, Nairobi
          </p>

          <div className="flex-1" />

          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
            <h1 className="display text-balance text-[clamp(2.7rem,6.6vw,5.4rem)] text-bone-50">
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

            <div className="flex flex-col gap-7 lg:items-end lg:text-right">
              <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-bone-100/80">
                We move ESG and CSR out of the appendix and into strategy, capital
                allocation and disclosure, with evidence rigorous enough to publish.
              </p>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <ButtonLink href="/rmi#start" variant="lime" size="lg">
                  Rate my impact
                </ButtonLink>
                <ButtonLink href="/services" variant="dark" size="lg">
                  Our services
                </ButtonLink>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <a
              href="#introduction"
              className="group inline-flex items-center gap-2 text-[0.875rem] text-bone-50/60 transition-colors hover:text-bone-50"
            >
              Scroll to discover more
              <svg
                aria-hidden
                viewBox="0 0 16 20"
                className="h-4 w-3.5 transition-transform duration-300 group-hover:translate-y-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 1v17M2 12l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
