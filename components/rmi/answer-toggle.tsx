"use client";

type Props = {
  name: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  size?: "lg" | "sm";
  autoFocus?: boolean;
};

const labels: { value: boolean; label: string; hint: string }[] = [
  { value: true, label: "Yes", hint: "Y" },
  { value: false, label: "No", hint: "N" },
];

export function AnswerToggle({ name, value, onChange, size = "lg", onChangeFocus }: Props & { onChangeFocus?: () => void }) {
  const big = size === "lg";
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`grid gap-3 ${big ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}
    >
      {labels.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(opt.value);
              onChangeFocus?.();
            }}
            className={`group flex items-center justify-between rounded-2xl border text-left transition-all duration-200 ${
              big ? "px-5 py-4.5" : "px-4 py-3.5"
            } ${
              selected
                ? "border-forest-900 bg-forest-900 text-bone-50"
                : "border-forest-900/15 bg-bone-50 text-forest-900 hover:border-forest-900/40 hover:bg-white"
            }`}
          >
            <span className={`font-medium ${big ? "text-[1.0625rem]" : "text-[0.9375rem]"}`}>
              {opt.label}
            </span>
            <span className="flex items-center gap-2.5">
              <kbd
                className={`hidden rounded border px-1.5 py-0.5 text-[0.6875rem] sm:block ${
                  selected
                    ? "border-bone-50/25 text-bone-50/60"
                    : "border-forest-900/15 text-forest-900/35"
                }`}
              >
                {opt.hint}
              </kbd>
              <span
                aria-hidden
                className={`grid h-5 w-5 place-items-center rounded-full border transition-colors ${
                  selected ? "border-lime-500 bg-lime-500" : "border-forest-900/25"
                }`}
              >
                {selected && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 text-forest-950" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m2.5 6.2 2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
