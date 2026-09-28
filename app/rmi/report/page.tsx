import type { Metadata } from "next";
import { ReportView } from "@/components/rmi/report-view";

export const metadata: Metadata = {
  title: "Your report",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ searchParams }: PageProps<"/rmi/report">) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params?.[k];
    return typeof v === "string" ? v : undefined;
  };
  return <ReportView id={pick("id")} token={pick("t")} />;
}
