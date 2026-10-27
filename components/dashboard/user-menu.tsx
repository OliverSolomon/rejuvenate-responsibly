"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScopeToggle } from "@/components/dashboard/scope-toggle";
import { Select } from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";

const ROLE_LABEL = { super: "Super admin", owner: "Owner", admin: "Admin", member: "Member" } as const;

/**
 * Everything about the person and the way out, behind one button.
 *
 * The bar used to carry the website link, the person's name and the sign-out
 * button as three separate items, which is most of what made it busy. They are
 * all things you reach for rarely, so they live here instead.
 */
export function UserMenu({
  email,
  name,
  role,
  scope,
}: {
  email: string;
  name: string | null;
  role: keyof typeof ROLE_LABEL;
  /** Only a super admin has one: which companies the dashboard shows. */
  scope?: {
    state: "all" | "own" | "other";
    ownId: string;
    /** The company being looked at, or null for all of them. */
    current: string | null;
    companies: { id: string; name: string }[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Look at one company, or all of them. The pages follow the choice. */
  async function viewCompany(companyId: string) {
    const res = await fetch("/api/dashboard/companies/view", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  const initials = (name || email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full bg-forest-900 text-[0.75rem] font-medium text-bone-50 transition-colors hover:bg-forest-700"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-forest-900/10 bg-bone-50 p-2 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-[0.875rem] font-medium text-forest-900">{name ?? email}</p>
            {name && <p className="truncate text-[0.75rem] text-forest-900/55">{email}</p>}
            <p className="mt-1 text-[0.6875rem] tracking-wide text-forest-900/45 uppercase">
              {ROLE_LABEL[role]}
            </p>
          </div>
          <div className="my-1 border-t border-forest-900/10" />
          {scope && (
            <>
              <div className="px-3 py-2">
                <p className="mb-2 text-[0.6875rem] tracking-wide text-forest-900/45 uppercase">
                  Companies shown
                </p>
                <ScopeToggle state={scope.state} ownId={scope.ownId} />
                <div className="mt-2.5">
                  <Select
                    value={scope.current ?? "all"}
                    onChange={(next) => void viewCompany(next)}
                    aria-label="Company to look at"
                    className="h-9 text-[0.8125rem]"
                    options={[
                      { value: "all", label: "All companies" },
                      ...scope.companies.map((c) => ({
                        value: c.id,
                        label: c.id === scope.ownId ? `${c.name} (yours)` : c.name,
                      })),
                    ]}
                  />
                </div>
              </div>
              <div className="my-1 border-t border-forest-900/10" />
            </>
          )}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-[0.8125rem] text-forest-900/80 hover:bg-forest-900/[0.05]"
          >
            View the website
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="block w-full rounded-xl px-3 py-2 text-left text-[0.8125rem] text-forest-900/80 hover:bg-forest-900/[0.05] disabled:opacity-50"
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
