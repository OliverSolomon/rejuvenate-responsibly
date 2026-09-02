import type { ReactNode } from "react";

export function Section({
  children,
  className = "",
  id,
  tone = "bone",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "bone" | "paper" | "forest";
}) {
  const tones = {
    bone: "bg-bone-100 text-forest-900",
    paper: "bg-bone-50 text-forest-900",
    forest: "dark-panel bg-forest-900 text-bone-100",
  } as const;
  return (
    <section id={id} className={`${tones[tone]} ${className}`}>
      {children}
    </section>
  );
}

export function Container({
  children,
  className = "",
  size = "default",
}: {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  } as const;
  return (
    <div className={`mx-auto w-full ${widths[size]} px-5 sm:px-8 ${className}`}>{children}</div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  tone = "forest",
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  tone?: "forest" | "bone";
  className?: string;
}) {
  const alignment = align === "center" ? "items-center text-center" : "items-start";
  const ledeTone = tone === "bone" ? "text-bone-100/70" : "text-forest-900/65";
  return (
    <div className={`flex flex-col gap-5 ${alignment} ${className}`}>
      {eyebrow}
      <h2 className="display text-[clamp(2rem,4.6vw,3.4rem)] max-w-[19ch]">{title}</h2>
      {lede && (
        <p className={`max-w-[52ch] text-[1.0625rem] leading-relaxed ${ledeTone}`}>{lede}</p>
      )}
    </div>
  );
}
