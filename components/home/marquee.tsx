const items = [
  "GRI Standards",
  "NSE Kenya ESG Disclosure Manual",
  "SASB",
  "TCFD",
  "CDP",
  "UN SDGs",
  "ISO 14001",
  "UN Guiding Principles",
  "AfCFTA alignment",
];

export function FrameworkMarquee() {
  return (
    <div className="overflow-hidden border-y border-forest-900/10 bg-bone-50 py-5">
      <div className="flex w-max marquee-track">
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center gap-10 pr-10"
          >
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-10 whitespace-nowrap text-[0.9375rem] text-forest-900/55"
              >
                {item}
                <span aria-hidden className="h-1 w-1 rounded-full bg-lime-500" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
