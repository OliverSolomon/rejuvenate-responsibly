"use client";

/**
 * Yes/No control built on real radio inputs. In a page holding ninety-odd of
 * these, native radios give arrow-key movement, screen reader grouping and
 * form semantics for free, which hand-rolled buttons would each have to
 * reimplement.
 */
export function AnswerToggle({
  name,
  legend,
  value,
  onChange,
  size = "md",
  tone = "default",
}: {
  name: string;
  legend: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  size?: "md" | "sm";
  tone?: "default" | "muted";
}) {
  const big = size === "md";
  return (
    <fieldset className="flex shrink-0 gap-2">
      <legend className="sr-only">{legend}</legend>
      {[
        { v: true, label: "Yes" },
        { v: false, label: "No" },
      ].map((opt) => {
        const selected = value === opt.v;
        const id = `${name}-${opt.label.toLowerCase()}`;
        return (
          <div key={opt.label} className="relative">
            <input
              type="radio"
              id={id}
              name={name}
              checked={selected}
              onChange={() => onChange(opt.v)}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <label
              htmlFor={id}
              className={`flex cursor-pointer items-center justify-center rounded-full border text-center font-medium transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest-700 ${
                big ? "h-11 w-[4.5rem] text-[0.9375rem]" : "h-9 w-16 text-[0.875rem]"
              } ${
                selected
                  ? "border-forest-900 bg-forest-900 text-bone-50"
                  : tone === "muted"
                    ? "border-forest-900/15 bg-bone-100 text-forest-900/70 hover:border-forest-900/40"
                    : "border-forest-900/15 bg-bone-50 text-forest-900/70 hover:border-forest-900/40 hover:text-forest-900"
              }`}
            >
              {opt.label}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
