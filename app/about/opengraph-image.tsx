import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Strategy and sustainable practice, together";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "About us",
    title: "Strategy and sustainable practice, together",
    subtitle: "An advisory and consulting firm in Nairobi.",
    photo: "savannah.jpg",
  });
}
