"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  /** Shown under the label in the list, for choices that need a line of explanation. */
  hint?: string;
  /** Options sharing a group are listed under its heading. */
  group?: string;
  disabled?: boolean;
};

/**
 * A dropdown that looks like the rest of the dashboard.
 *
 * The browser's own select hands the open list to the operating system, which
 * paints it in its own colours and fonts however the closed box is styled. This
 * draws the list itself, with the keyboard behaviour a select has: arrows move,
 * Home and End jump, Enter or Space choose, Escape closes, and typing a letter
 * goes to the next option starting with it.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Choose",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Sizing and spacing of the closed box. */
  className?: string;
  "aria-label"?: string;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });

  const selected = options.find((o) => o.value === value);
  const enabled = useMemo(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [options],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option in view as the arrows move it.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [open, active]);

  function show() {
    if (disabled) return;
    const at = options.findIndex((o) => o.value === value && !o.disabled);
    setActive(at >= 0 ? at : (enabled[0] ?? 0));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function step(delta: number) {
    const at = enabled.indexOf(active);
    const next = enabled[Math.min(enabled.length - 1, Math.max(0, (at < 0 ? 0 : at) + delta))];
    if (next !== undefined) setActive(next);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        step(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(enabled[0] ?? 0);
        break;
      case "End":
        e.preventDefault();
        setActive(enabled[enabled.length - 1] ?? 0);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          // Letters typed close together build up a prefix, as in a native select.
          const now = Date.now();
          const text = (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase();
          typed.current = { text, at: now };
          const hit = enabled.find((i) => options[i].label.toLowerCase().startsWith(text));
          if (hit !== undefined) setActive(hit);
        }
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 text-left text-[0.9375rem] text-forest-900",
          "transition-colors duration-150 ease-out hover:border-forest-900/35",
          "focus-visible:border-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-forest-700",
          className ?? "h-11",
        )}
      >
        <span className={cn("truncate", !selected && "text-forest-900/45")}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn(
            "h-3 w-3 shrink-0 text-forest-900/55 transition-transform duration-150 ease-out",
            open && "rotate-180",
          )}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full min-w-48 origin-top overflow-auto rounded-xl border border-forest-900/12 bg-bone-50 p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          {options.map((o, i) => {
            // A heading goes in front of the first option of each group.
            const heading = o.group && o.group !== options[i - 1]?.group ? o.group : null;
            return (
              <li key={o.value} role="presentation">
                {heading && (
                  <p className="px-2.5 pt-2 pb-1 text-[0.6875rem] font-medium tracking-wide text-forest-900/45 uppercase">
                    {heading}
                  </p>
                )}
                <div
                  id={`${id}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={o.value === value}
                  aria-disabled={o.disabled}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-[0.875rem]",
                    i === active && "bg-forest-900/[0.06]",
                    o.value === value ? "font-medium text-forest-900" : "text-forest-900/80",
                    o.disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block">{o.label}</span>
                    {o.hint && (
                      <span className="mt-0.5 block text-[0.75rem] font-normal text-forest-900/50">
                        {o.hint}
                      </span>
                    )}
                  </span>
                  {o.value === value && (
                    <svg aria-hidden viewBox="0 0 12 12" className="mt-1 h-3 w-3 shrink-0 text-forest-700">
                      <path d="m2.5 6.5 2.5 2.5 4.5-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
