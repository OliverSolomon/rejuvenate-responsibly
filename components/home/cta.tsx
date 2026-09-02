import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section";
import { site } from "@/lib/site";

export function Cta() {
  return (
    <section className="bg-bone-100 px-2 pb-2 sm:px-3 sm:pb-3">
      <Container size="wide" className="px-0 sm:px-0">
        <div className="dark-panel grain relative overflow-hidden rounded-[1.75rem] bg-lime-500 px-6 py-20 text-forest-950 sm:rounded-[2.25rem] sm:px-14 sm:py-28">
          <div className="relative flex flex-col items-start gap-8">
            <p className="eyebrow text-forest-900/60">Ready when you are</p>
            <h2 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,4.5rem)]">
              Rejuvenate your business responsibly
            </h2>
            <p className="max-w-[48ch] text-[1.0625rem] leading-relaxed text-forest-900/70">
              Start with the assessment, or tell us what you are up against and we will
              tell you honestly whether we are the right people for it.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/rmi#start" variant="primary" size="lg">
                Start the assessment
              </ButtonLink>
              <ButtonLink href="/contact" variant="ghost" size="lg">
                Talk to a consultant
              </ButtonLink>
            </div>
            <p className="text-[0.875rem] text-forest-900/55">
              Or reach us directly at{" "}
              <a href={`mailto:${site.email}`} className="underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
