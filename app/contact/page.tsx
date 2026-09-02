import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Container, Section } from "@/components/ui/section";
import { ContactForm } from "@/components/site/contact-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Talk to Rejuvenate Responsibly about ESG advisory, CSR programme design, reporting and the Rate My Impact assessment.",
};

const intentMap: Record<string, string> = {
  rmi: "Rate My Impact assessment",
  "rmi-enterprise": "Rate My Impact assessment",
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const params = await searchParams;
  const raw = params?.intent;
  const intent = typeof raw === "string" ? intentMap[raw] : undefined;

  return (
    <Section tone="bone" className="pt-32 pb-28 sm:pt-40">
      <Container size="wide">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="flex flex-col gap-8">
            <Eyebrow>Contact us</Eyebrow>
            <h1 className="display text-[clamp(2.4rem,5.4vw,3.8rem)]">
              Ready to rejuvenate your business responsibly?
            </h1>
            <p className="text-[1.0625rem] leading-relaxed text-forest-900/65">
              Tell us where you are and what is in the way. If we are not the right
              people for it, we will say so and point you at someone who is.
            </p>

            <dl className="flex flex-col gap-6 border-t border-forest-900/12 pt-8">
              <div>
                <dt className="eyebrow text-forest-900/40">Email</dt>
                <dd className="mt-2">
                  <a
                    href={`mailto:${site.email}`}
                    className="text-[1.0625rem] underline-offset-4 hover:underline"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-forest-900/40">Phone</dt>
                <dd className="mt-2 flex flex-col gap-1">
                  {site.phones.map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/\s/g, "")}`}
                      className="text-[1.0625rem] underline-offset-4 hover:underline"
                    >
                      {p}
                    </a>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-forest-900/40">WhatsApp</dt>
                <dd className="mt-2">
                  <a
                    href={site.whatsapp}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[1.0625rem] underline-offset-4 hover:underline"
                  >
                    Message us on WhatsApp
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-forest-900/40">Where we are</dt>
                <dd className="mt-2 text-[1.0625rem]">{site.location}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card border border-forest-900/12 bg-bone-50 p-6 sm:p-9">
            <ContactForm defaultTopic={intent} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
