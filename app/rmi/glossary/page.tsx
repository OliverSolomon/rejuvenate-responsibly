import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { glossary } from "@/lib/rmi/glossary";

export const metadata: Metadata = {
  title: "Rate My Impact glossary",
  description:
    "Definitions and consistency checks for the terms used in the Rate My Impact Sustainability Self-Assessment.",
};

export default function GlossaryPage() {
  return (
    <>
      <Section tone="bone" className="pt-32 pb-16 sm:pt-40">
        <Container size="default">
          <Eyebrow>Reference</Eyebrow>
          <h1 className="display mt-6 text-[clamp(2.4rem,6vw,4rem)]">
            Survey glossary
          </h1>
          <p className="mt-6 max-w-[56ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
            Keep this open while you answer. Where a term has a consistency check, that
            is the bar you need to clear before answering yes.
          </p>
          <div className="mt-8">
            <ButtonLink href="/rmi/assessment" variant="ghost">
              Back to the assessment
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <Section tone="bone" className="pb-28">
        <Container size="default">
          <div className="flex flex-col gap-16">
            {glossary.map((group) => (
              <section key={group.group}>
                <h2 className="display text-2xl">{group.group}</h2>
                <dl className="mt-6 divide-y divide-forest-900/10 border-y border-forest-900/10">
                  {group.entries.map((entry) => (
                    <div key={entry.term} className="grid gap-3 py-7 sm:grid-cols-[0.8fr_1.4fr] sm:gap-10">
                      <dt className="font-medium text-forest-900">{entry.term}</dt>
                      <dd className="flex flex-col gap-3">
                        <p className="text-[0.9375rem] leading-relaxed text-forest-900/70">
                          {entry.definition}
                        </p>
                        {entry.check && (
                          <p className="rounded-xl bg-lime-50 px-4 py-3 text-[0.875rem] leading-relaxed text-forest-700">
                            <span className="font-medium">Consistency check. </span>
                            {entry.check}
                          </p>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
