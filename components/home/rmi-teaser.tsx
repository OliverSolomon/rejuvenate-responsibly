import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { ScoreDial } from "@/components/rmi/score-dial";
import { SECTIONS } from "@/lib/rmi/questions";

const preview = [
  { section: "Governance", level: "Excellent", value: 88 },
  { section: "Economic", level: "Strategic", value: 74 },
  { section: "Environmental", level: "Adequate", value: 61 },
  { section: "Social", level: "Strategic", value: 79 },
];

export function RmiTeaser() {
  return (
    <Section tone="paper" className="py-24 sm:py-32">
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
          <div className="flex flex-col items-start gap-6">
            <Eyebrow>Rate My Impact</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.6vw,3.4rem)] max-w-[15ch]">
              Find out where you really stand
            </h2>
            <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
              The RMI Sustainability Self-Assessment scores {" "}
              <strong className="font-medium text-forest-900">53 weighted indicators</strong>{" "}
              across four pillars, then checks your answers against three to five of your
              own stakeholders. The gap between the two views is usually the most useful
              page in the report.
            </p>
            <ul className="flex flex-col gap-3 text-[0.9375rem] text-forest-900/65">
              {[
                "Every indicator mapped to an SDG and a GRI disclosure",
                "Structured against the NSE Kenya ESG Disclosure Manual",
                "Delivered on letterhead with an 'Issued by' seal",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/rmi" className="mt-2">
              See how it works
            </ButtonLink>
          </div>

          <div className="relative rounded-card border border-forest-900/10 bg-bone-100 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-forest-900/45">Sample output</p>
                <p className="display mt-2 text-2xl">Sustainability score</p>
              </div>
              <span className="rounded-full bg-lime-100 px-3 py-1.5 text-[0.75rem] font-medium text-forest-700">
                Silver tier
              </span>
            </div>

            <div className="my-8 flex justify-center">
              <ScoreDial value={76} size={190} />
            </div>

            <ul className="flex flex-col divide-y divide-forest-900/8">
              {preview.map((p) => (
                <li key={p.section} className="flex items-center gap-4 py-3">
                  <span className="w-28 shrink-0 text-[0.875rem] text-forest-900/70">
                    {p.section}
                  </span>
                  <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-forest-900/8">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-forest-700"
                      style={{ width: `${p.value}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right text-[0.8125rem] text-forest-900/50">
                    {p.level}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[0.75rem] leading-relaxed text-forest-900/40">
              Illustrative figures. Your report covers{" "}
              {SECTIONS.map((s) => s.short).join(", ")} with a gap analysis and roadmap.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
