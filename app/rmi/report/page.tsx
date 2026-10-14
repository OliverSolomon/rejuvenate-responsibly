import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ReportView } from "@/components/rmi/report-view";

export const metadata: Metadata = pageMeta({
  title: "Your report",
  description:
    "Your Rate My Impact sustainability report.",
  path: "/rmi/report",
  private: true,
});

export default async function ReportPage({ searchParams }: PageProps<"/rmi/report">) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params?.[k];
    return typeof v === "string" ? v : undefined;
  };
  return <ReportView id={pick("id")} token={pick("t")} />;
}
