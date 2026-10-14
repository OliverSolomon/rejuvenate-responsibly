import { Card } from "@/components/ui/card";

/**
 * A single number with its label. The skill's own advice: when the job is one
 * headline figure, a stat tile beats a chart, so the totals row is tiles.
 */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-[0.75rem] tracking-wide text-forest-900/50 uppercase">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-[2.25rem] leading-none text-forest-900 tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[0.75rem] text-forest-900/45">{hint}</p>}
    </Card>
  );
}
