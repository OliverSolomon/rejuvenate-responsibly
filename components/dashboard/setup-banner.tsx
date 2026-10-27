import Link from "next/link";
import type { AttentionItem } from "@/lib/rmi/activity";

/**
 * What is not set up, said at the top of every dashboard page.
 *
 * Only the setup items: a missing key, an empty OpenRouter account. They stop
 * the product doing its job, so they are not something to find by opening a
 * list. Each says what to do, and when only the administrator can fix it, says
 * to contact them rather than offering a link that leads nowhere.
 */
export function SetupBanner({ items }: { items: AttentionItem[] }) {
  const shown = items.filter((i) => i.group === "setup");
  if (shown.length === 0) return null;

  return (
    <div role="alert" className="border-b border-clay-400/30 bg-clay-400/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:px-8">
        {shown.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
          >
            <p className="max-w-[78ch] text-[0.875rem] leading-relaxed text-clay-500">
              <span className="font-medium">{item.title}.</span> {item.detail}
            </p>
            {item.href && (
              <Link
                href={item.href}
                className="shrink-0 text-[0.8125rem] font-medium text-clay-500 underline underline-offset-4"
              >
                {item.action ?? "Open"}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
