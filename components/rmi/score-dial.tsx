export function ScoreDial({
  value,
  size = 180,
  label = "Overall",
  tone = "forest",
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: "forest" | "bone";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = size * 0.085;
  const r = (size - stroke) / 2;
  // 270° sweep, opening at the bottom
  const circumference = 2 * Math.PI * r;
  const sweep = 0.75;
  const dash = circumference * sweep;
  const track = tone === "bone" ? "rgba(251,250,246,0.18)" : "rgba(13,36,24,0.10)";
  const text = tone === "bone" ? "#fbfaf6" : "#0d2418";
  const sub = tone === "bone" ? "rgba(251,250,246,0.55)" : "rgba(13,36,24,0.5)";

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} score ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-[225deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dialGradient)"
          strokeWidth={stroke}
          strokeDasharray={`${(dash * clamped) / 100} ${circumference}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="dialGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2a6244" />
            <stop offset="100%" stopColor="#97d700" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-[family-name:var(--font-serif)] leading-none"
          style={{ fontSize: size * 0.3, color: text }}
        >
          {Math.round(clamped)}
        </span>
        <span
          className="eyebrow mt-2"
          style={{ color: sub, fontSize: size * 0.058 }}
        >
          {label} / 100
        </span>
      </div>
    </div>
  );
}
