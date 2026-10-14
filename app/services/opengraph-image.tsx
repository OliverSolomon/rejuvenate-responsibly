import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "ESG, CSR and reporting advisory";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "Our services",
    title: "ESG, CSR and reporting advisory",
    subtitle: "Strategy, programme design, disclosure and sustainable finance.",
    photo: "solar-windfarm.png",
  });
}
