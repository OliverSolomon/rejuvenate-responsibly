import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Score your sustainability practice";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "Rate My Impact",
    title: "Score your sustainability practice",
    subtitle: "53 weighted indicators across governance, economic, environmental and social.",
    photo: "windfarm.jpg",
  });
}
