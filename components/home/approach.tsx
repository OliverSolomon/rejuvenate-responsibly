import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { approachSteps } from "@/lib/site";

export function Approach() {
  return (
    <Section tone="bone" className="py-24 sm:py-32">
      <Container size="wide">
        <div className="flex flex-col items-start gap-6">
          <Eyebrow>Our approach</Eyebrow>
          <h2 className="display max-w-[16ch] text-[clamp(2rem,4.6vw,3.4rem)]">
            Four moves, in this order
          </h2>
          <p className="max-w-[54ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
            We combine deep sector expertise with a pragmatic methodology, and we build
            internal capability as we go, so the work keeps running after the
            engagement closes.
          </p>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-card bg-forest-900/10 sm:grid-cols-2 lg:grid-cols-4">
          {approachSteps.map((s, i) => (
            <li
              key={s.step}
              className="group flex flex-col gap-4 bg-bone-100 p-7 transition-colors duration-500 hover:bg-bone-50 sm:p-8"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-forest-900 text-[0.75rem] text-lime-400 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-forest-900/12 transition-colors group-hover:bg-lime-500"
                />
              </span>
              <h3 className="display text-2xl">{s.step}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-forest-900/60">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
