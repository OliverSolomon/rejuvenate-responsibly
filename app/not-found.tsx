import { ButtonLink } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/section";

export default function NotFound() {
  return (
    <Section tone="bone" className="pt-40 pb-32">
      <Container size="default">
        <p className="eyebrow text-forest-900/40">404</p>
        <h1 className="display mt-6 text-[clamp(2.4rem,6vw,4rem)]">
          This page has been retired
        </h1>
        <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
          The link may be old, or the page may have moved during the site refresh.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/">Back to the homepage</ButtonLink>
          <ButtonLink href="/contact" variant="ghost">
            Tell us what you were looking for
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
