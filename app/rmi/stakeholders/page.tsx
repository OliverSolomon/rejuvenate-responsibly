import type { Metadata } from "next";
import { StakeholderForm } from "@/components/rmi/stakeholder-form";
import { Container } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Add your stakeholders",
  robots: { index: false, follow: false },
};

export default async function StakeholdersPage({
  searchParams,
}: PageProps<"/rmi/stakeholders">) {
  const params = await searchParams;
  const raw = params?.ref;
  const reference = typeof raw === "string" ? raw : undefined;

  return (
    <div className="bg-bone-100 pt-28 pb-28 sm:pt-32">
      <Container size="default">
        <StakeholderForm reference={reference} />
      </Container>
    </div>
  );
}
