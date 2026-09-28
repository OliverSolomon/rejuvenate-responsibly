import type { Metadata } from "next";
import { PaymentStatus } from "@/components/rmi/payment-status";
import { Container, Section } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({ searchParams }: PageProps<"/rmi/payment">) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params?.[k];
    return typeof v === "string" ? v : undefined;
  };

  return (
    <Section tone="bone" className="pt-32 pb-28 sm:pt-40">
      <Container size="default">
        <PaymentStatus
          orderTrackingId={pick("OrderTrackingId")}
          merchantReference={pick("OrderMerchantReference")}
        />
      </Container>
    </Section>
  );
}
