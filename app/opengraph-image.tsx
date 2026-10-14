import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "Your social responsibility on autopilot";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOg({
    eyebrow: "ESG and CSR advisory",
    title: "Your social responsibility on autopilot",
    subtitle: "Strategy, reporting and the Rate My Impact assessment for organisations across East Africa.",
    photo: "windfarm.jpg",
  });
}
