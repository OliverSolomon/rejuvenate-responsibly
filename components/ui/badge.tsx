import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-forest-900/8 text-forest-900/70",
  good: "bg-lime-100 text-forest-700",
  pending: "bg-clay-400/12 text-clay-500",
  strong: "bg-forest-900 text-bone-50",
  quiet: "border border-forest-900/15 text-forest-900/55",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
