import type { Metadata } from "next";
import { AssessmentFlow } from "@/components/rmi/assessment-flow";
import { Container } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Stakeholder survey",
  description: "A short survey about an organisation you work with.",
  robots: { index: false, follow: false },
};

export default async function SurveyPage({ searchParams }: PageProps<"/rmi/survey">) {
  const params = await searchParams;
  const raw = params?.t;
  const token = typeof raw === "string" ? raw : undefined;

  return (
    <div className="bg-bone-100 pt-28 pb-28 sm:pt-32">
      <Container size="default">
        <AssessmentFlow audience="stakeholder" reference={token} />
      </Container>
    </div>
  );
}
