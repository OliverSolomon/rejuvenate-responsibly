type Props = { className?: string; tone?: "lime" | "forest" | "bone" };

/**
 * Wordmark and laurel monogram, redrawn as vector so it stays crisp at any size.
 * The mark keeps the brand lime disc on every surface; only the wordmark
 * changes colour, which is what keeps it legible on both bone and forest.
 */
export function Logo({ className = "", tone = "forest" }: Props) {
  const word =
    tone === "bone" ? "text-bone-50" : tone === "lime" ? "text-lime-500" : "text-forest-900";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className={`flex flex-col leading-[1.05] ${word}`}>
        <span className="font-display text-[0.9rem] font-semibold tracking-[0.01em] uppercase">
          Rejuvenate
        </span>
        <span className="font-display text-[0.9rem] font-semibold tracking-[0.01em] uppercase">
          Responsibly
        </span>
      </span>
    </span>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Rejuvenate Responsibly"
    >
      <circle cx="32" cy="32" r="32" fill="#97d700" />
      <g fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21.5 14.5C13.8 19.6 10.6 28.6 12.6 37.4c1.4 6.2 4.9 10.6 8.4 13" />
        <path d="M42.5 14.5c7.7 5.1 10.9 14.1 8.9 22.9-1.4 6.2-4.9 10.6-8.4 13" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <path d={`M${18.4 - i * 0.6} ${20.5 + i * 6}c-2.7-1.6-5-1.4-6.4.2 1.7 1.6 4.3 1.8 6.4-.2z`} />
            <path d={`M${45.6 + i * 0.6} ${20.5 + i * 6}c2.7-1.6 5-1.4 6.4.2-1.7 1.6-4.3 1.8-6.4-.2z`} />
          </g>
        ))}
        <path d="M29.4 53.2c-1.1 2.6-1.5 4.8-1.2 6.9M34.6 53.2c1.1 2.6 1.5 4.8 1.2 6.9" />
        <path d="M28.9 51.6c1.5-1.3 4.7-1.3 6.2 0-1.5 1.4-4.7 1.4-6.2 0z" />
      </g>
      <text
        x="32"
        y="41.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="25"
        fontFamily="Georgia, 'Times New Roman', serif"
      >
        R
      </text>
    </svg>
  );
}
