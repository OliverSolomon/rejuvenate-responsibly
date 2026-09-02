import { checkoutUrl, pricing } from "@/lib/rmi/pricing";
import { ButtonLink } from "@/components/ui/button";

export function PricingCards() {
  return (
    <div className="mt-14 grid gap-5 lg:grid-cols-3">
      {pricing.map((tier) => {
        const featured = tier.featured;
        return (
          <div
            key={tier.id}
            className={`flex flex-col rounded-card border p-7 sm:p-8 ${
              featured
                ? "border-forest-900 bg-forest-900 text-bone-100 dark-panel"
                : "border-forest-900/12 bg-bone-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl">{tier.name}</h3>
              {featured && (
                <span className="rounded-full bg-lime-500 px-3 py-1 text-[0.6875rem] font-medium tracking-wide text-forest-950 uppercase">
                  Most chosen
                </span>
              )}
            </div>

            <p
              className={`mt-5 font-[family-name:var(--font-serif)] text-[2.75rem] leading-none ${
                featured ? "text-bone-50" : "text-forest-900"
              }`}
            >
              {tier.currency && (
                <span className="mr-2 align-middle font-sans text-base font-normal opacity-50">
                  {tier.currency}
                </span>
              )}
              {tier.price}
            </p>
            <p className={`mt-2 text-[0.8125rem] ${featured ? "text-bone-100/50" : "text-forest-900/45"}`}>
              {tier.cadence}
            </p>

            <p
              className={`mt-6 text-[0.9375rem] leading-relaxed ${
                featured ? "text-bone-100/70" : "text-forest-900/65"
              }`}
            >
              {tier.summary}
            </p>

            <ul className="mt-7 flex flex-col gap-3 border-t pt-7 border-current/10">
              {tier.includes.map((item) => (
                <li
                  key={item}
                  className={`flex gap-3 text-[0.875rem] leading-snug ${
                    featured ? "text-bone-100/75" : "text-forest-900/70"
                  }`}
                >
                  <svg
                    viewBox="0 0 14 14"
                    aria-hidden
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="m2.5 7.3 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 pt-1">
              {tier.id === "enterprise" ? (
                <ButtonLink href="/contact?intent=rmi-enterprise" variant="ghost" size="lg">
                  Start a conversation
                </ButtonLink>
              ) : (
                <ButtonLink
                  href={checkoutUrl(tier.id)}
                  variant={featured ? "lime" : "primary"}
                  size="lg"
                >
                  Pay with Pesapal
                </ButtonLink>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
