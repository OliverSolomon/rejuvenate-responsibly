import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { SignInForm } from "@/components/dashboard/sign-in-form";
import { Container, Section } from "@/components/ui/section";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = pageMeta({
  title: "Sign in",
  description:
    "Sign in to the Rate My Impact admin dashboard.",
  path: "/signin",
  private: true,
});

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params?.[k];
    return typeof v === "string" ? v : undefined;
  };

  return (
    <Section tone="bone" className="pt-32 pb-28 sm:pt-40">
      <Container size="default">
        <div className="mx-auto max-w-md">
          <Eyebrow>Rate My Impact</Eyebrow>
          <h1 className="display mt-6 text-[clamp(2rem,4.6vw,2.75rem)]">Dashboard sign in</h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">
            For the Rejuvenate Responsibly team. Clients reach their own assessment through
            the link we email them and never need an account.
          </p>
          <SignInForm reason={pick("error")} next={pick("next")} />
        </div>
      </Container>
    </Section>
  );
}
