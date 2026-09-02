import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "ghost" | "lime";
type Size = "sm" | "md" | "lg";

const base =
  "group relative inline-flex items-center justify-center gap-2.5 rounded-full font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-forest-900 text-bone-50 hover:bg-forest-800 hover:-translate-y-0.5 shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset]",
  lime: "bg-lime-500 text-forest-950 hover:bg-lime-400 hover:-translate-y-0.5",
  dark: "bg-bone-50 text-forest-950 hover:bg-white hover:-translate-y-0.5",
  ghost:
    "border border-forest-900/20 bg-transparent text-forest-900 hover:border-forest-900/45 hover:bg-forest-900/[0.04]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 pl-5 pr-2 text-[0.875rem]",
  lg: "h-13 pl-6 pr-2.5 text-[0.9375rem]",
};

function Arrow({ variant }: { variant: Variant }) {
  const bg =
    variant === "primary"
      ? "bg-lime-500 text-forest-950"
      : variant === "lime"
        ? "bg-forest-900 text-lime-400"
        : variant === "dark"
          ? "bg-forest-900 text-lime-400"
          : "bg-forest-900/10 text-forest-900";
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 items-center justify-center rounded-full ${bg} transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = true,
  className = "",
}: ButtonLinkProps) {
  const external = href.startsWith("http") || href.startsWith("mailto");
  const cls = `${base} ${variants[variant]} ${arrow ? sizes[size] : sizes[size].replace(/pr-\S+/, "pr-5")} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {arrow && <Arrow variant={variant} />}
    </>
  );
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className = "",
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <button
      {...rest}
      className={`${base} ${variants[variant]} ${arrow ? sizes[size] : sizes[size].replace(/pr-\S+/, "pr-5")} ${className}`}
    >
      <span>{children}</span>
      {arrow && <Arrow variant={variant} />}
    </button>
  );
}
