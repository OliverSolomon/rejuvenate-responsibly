import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/section";
import { nav, services, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="dark-panel relative overflow-hidden bg-forest-950 text-bone-100">
      <Container size="wide" className="relative pb-10 pt-20 sm:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <Logo tone="bone" />
            <p className="max-w-[34ch] text-[0.9375rem] leading-relaxed text-bone-100/60">
              {site.tagline}. Advisory and consulting at the intersection of business
              strategy and sustainable practice.
            </p>
            <div className="flex flex-wrap gap-2">
              {site.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full border border-bone-50/15 px-4 py-2 text-[0.8125rem] text-bone-100/75 transition-colors hover:border-lime-500/60 hover:text-lime-300"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Navigate">
            {nav.map((n) => (
              <FooterLink key={n.href} href={n.href}>
                {n.label}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Services">
            {services.map((s) => (
              <FooterLink key={s.slug} href={`/services#${s.slug}`}>
                {s.title.replace(" Development", "").replace(" Design & Implementation", "")}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title="Talk to us">
            <FooterLink href={`mailto:${site.email}`}>{site.email}</FooterLink>
            {site.phones.map((p) => (
              <FooterLink key={p} href={`tel:${p.replace(/\s/g, "")}`}>
                {p}
              </FooterLink>
            ))}
            <FooterLink href={site.whatsapp}>WhatsApp us</FooterLink>
            <li className="pt-2 text-[0.9375rem] text-bone-100/45">{site.location}</li>
          </FooterCol>
        </div>

        <div
          aria-hidden
          className="pointer-events-none mt-16 select-none overflow-hidden"
        >
          <p className="display whitespace-nowrap text-[clamp(3rem,13vw,11rem)] leading-[0.85] text-bone-50/[0.045]">
            REJUVENATE RESPONSIBLY
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-bone-50/10 pt-7 text-[0.8125rem] text-bone-100/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Rejuvenate Responsibly. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
            Nairobi, Kenya
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow mb-5 text-bone-100/40">{title}</h3>
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel");
  const cls =
    "text-[0.9375rem] text-bone-100/70 transition-colors hover:text-lime-300";
  return (
    <li>
      {external ? (
        <a href={href} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener">
          {children}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {children}
        </Link>
      )}
    </li>
  );
}
