import type { Metadata } from "next";
import { AssessmentFlow } from "@/components/rmi/assessment-flow";
import { Container } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Sustainability self-assessment",
  description:
    "The 53 question Rate My Impact self-assessment across governance, economic, environmental and social practice.",
  robots: { index: false, follow: false },
};

export default async function AssessmentPage({ searchParams }: PageProps<"/rmi/assessment">) {
  const params = await searchParams;
  const raw = params?.ref;
  const reference = typeof raw === "string" ? raw : undefined;

  return (
    <div className="bg-bone-100 pt-28 pb-28 sm:pt-32">
      <Container size="default">
        <AssessmentFlow audience="client" reference={reference} />
      </Container>
    </div>
  );
}
