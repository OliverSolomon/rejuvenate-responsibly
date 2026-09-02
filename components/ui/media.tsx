import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  /** Note shown in the corner so the team knows what photograph belongs here. */
  swap?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  width?: number;
  height?: number;
};

/**
 * Placeholder-aware media frame. The generated SVGs in /public/images are
 * stand-ins. Drop a real photograph at the same path (or point `src` at it)
 * and everything else keeps working.
 */
export function Media({
  src,
  alt,
  swap,
  className = "",
  imgClassName = "",
  priority = false,
  width = 1400,
  height = 1000,
}: Props) {
  return (
    <figure
      className={`group overflow-hidden rounded-card bg-forest-800 ${
        className.includes("absolute") ? "" : "relative"
      } ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035] ${imgClassName}`}
      />
      {swap && (
        <figcaption className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-forest-950/55 px-3 py-1.5 text-[0.6875rem] tracking-wide text-bone-50/85 backdrop-blur-sm">
          Placeholder · {swap}
        </figcaption>
      )}
    </figure>
  );
}
