import type { ReactNode } from "react";

export function Eyebrow({
  children,
  tone = "forest",
  className = "",
}: {
  children: ReactNode;
  tone?: "forest" | "bone";
  className?: string;
}) {
  const styles =
    tone === "bone"
      ? "border-bone-50/25 text-bone-50/75"
      : "border-forest-900/20 text-forest-700";
  return (
    <span
      className={`eyebrow inline-flex w-fit shrink-0 self-start items-center gap-2 rounded-full border px-3.5 py-1.5 ${styles} ${className}`}
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-lime-500" />
      {children}
    </span>
  );
}
