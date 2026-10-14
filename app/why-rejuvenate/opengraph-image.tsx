import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Why organisations choose us";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "Why Rejuvenate",
    title: "Why organisations choose us",
    subtitle: "ESG and CSR advisory built into the places decisions get made.",
    photo: "plains-of-Africa.jpg",
  });
}
