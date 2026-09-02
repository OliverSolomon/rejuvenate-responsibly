import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

/**
 * Standard image frame: rounded, clipped, with a slow lift on hover. The
 * `className` sets the aspect ratio at each breakpoint and the image covers it.
 */
export function Media({
  src,
  alt,
  className = "",
  imgClassName = "",
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
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
        sizes={sizes}
        priority={priority}
        className={`h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.035] ${imgClassName}`}
      />
    </figure>
  );
}
