import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Rate My Impact dashboard";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "Admin",
    title: "Rate My Impact dashboard",
    subtitle: "Responses, reports and settings for the Rejuvenate team.",
    photo: "logistics.jpg",
  });
}
