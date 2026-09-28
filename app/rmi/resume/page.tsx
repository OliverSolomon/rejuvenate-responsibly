import type { Metadata } from "next";
import { ResumeForm } from "@/components/rmi/resume-form";
import { Container, Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = {
  title: "Resume your assessment",
  robots: { index: false, follow: false },
};

export default function ResumePage() {
  return (
    <Section tone="bone" className="pt-32 pb-28 sm:pt-40">
      <Container size="default">
        <div className="mx-auto max-w-xl">
          <Eyebrow>Pick up where you left off</Eyebrow>
          <h1 className="display mt-6 text-[clamp(2rem,4.6vw,3rem)]">
            Resume your assessment
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">
            The easiest way back in is the link we emailed you. If you only have the
            reference, paste it here and we will send the link again.
          </p>
          <ResumeForm />
        </div>
      </Container>
    </Section>
  );
}
