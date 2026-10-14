import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Talk to Rejuvenate Responsibly";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "Contact us",
    title: "Talk to Rejuvenate Responsibly",
    subtitle: "ESG advisory, CSR design, reporting and the RMI assessment.",
    photo: "seychelles.jpg",
  });
}
