"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CompanyRow } from "@/lib/rmi/companies";

/**
 * The firms using this installation, and which one you are working in.
 *
 * Only a super admin ever sees this panel. Two jobs sit together here because
 * they are the same question asked twice: which companies exist, and which one
 * am I in. Stepping into a company makes the whole dashboard that company's,
 * which is also how the installation's own organisation gets managed on its
 * own, without every other firm's work in the way.
 */
export function CompaniesPanel({
  companies,
  viewing,
  home,
}: {
  companies: CompanyRow[];
  /** The company in view, or null for every company at once. */
  viewing: string | null;
  /** The super admin's own organisation. */
  home: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  async function call(what: string, run: () => Promise<Response>) {
    setBusy(what);
    setError(null);
    try {
      const res = await run();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "That did not work.");
      }
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const look = (companyId: string) =>
    call(`view:${companyId}`, () =>
      fetch("/api/dashboard/companies/view", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      }),
    );

  const patch = (id: string, body: Record<string, unknown>) =>
    call(`patch:${id}`, () =>
      fetch(`/api/dashboard/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

  async function add() {
    const ok = await call("add", () =>
      fetch("/api/dashboard/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: slug || undefined }),
      }),
    );
    if (ok) {
      setName("");
      setSlug("");
      setAdding(false);
    }
  }

  const inView = companies.find((c) => c.id === viewing);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <h2 className="display text-[1.375rem]">Where you are working</h2>
        <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
          {inView
            ? `You are in ${inView.name}. Every page shows that company's work, and the settings you change are theirs. Nobody there can see that you are a super admin.`
            : "You are across every company. The responses, the analytics and the exports hold all of them. Step into one to work in it the way its own owner does."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant={viewing === null ? "primary" : "ghost"}
            size="md"
            disabled={busy !== null}
            onClick={() => look("all")}
          >
            Every company
          </Button>
          {companies.map((company) => (
            <Button
              key={company.id}
              variant={viewing === company.id ? "primary" : "ghost"}
              size="md"
              disabled={busy !== null}
              onClick={() => look(company.id)}
            >
              {company.name}
              {company.id === home ? " (yours)" : ""}
            </Button>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="display text-[1.375rem]">Companies</h2>
            <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
              Each firm has its own link, its own logo and stamp, its own report template, its own
              team and its own currency. Closing one stops it taking new assessments and keeps
              everything it has.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add a company"}
          </Button>
        </div>

        {adding && (
          <div className="mt-5 rounded-2xl border border-forest-900/10 bg-bone-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-[0.8125rem] text-forest-900/70">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Blue Neuron Limited"
                  className="mt-1 w-full rounded-xl border border-forest-900/15 bg-bone-50 px-3 py-2 text-[0.875rem] text-forest-900"
                />
              </label>
              <label className="flex-1 text-[0.8125rem] text-forest-900/70">
                Link name
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="made from the name if you leave it"
                  className="mt-1 w-full rounded-xl border border-forest-900/15 bg-bone-50 px-3 py-2 font-mono text-[0.8125rem] text-forest-900"
                />
              </label>
            </div>
            <p className="mt-2 text-[0.75rem] text-forest-900/50">
              Their assessment link will be /rmi?c=
              <span className="font-mono">{slug || "link-name"}</span>
            </p>
            <div className="mt-3">
              <Button
                variant="primary"
                size="md"
                disabled={busy !== null || name.trim().length < 2}
                onClick={add}
              >
                {busy === "add" ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[0.875rem] text-clay-500">{error}</p>}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-[0.8125rem]">
            <thead>
              <tr className="border-b border-forest-900/10 text-forest-900/50">
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 font-medium">Link</th>
                <th className="py-2 pr-4 font-medium">People</th>
                <th className="py-2 pr-4 font-medium">Assessments</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-forest-900/6 align-top">
                  <td className="py-3 pr-4">
                    {renaming === company.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="rounded-xl border border-forest-900/15 bg-bone-50 px-3 py-1.5 text-[0.8125rem] text-forest-900"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={busy !== null || draftName.trim().length < 2}
                          onClick={async () => {
                            if (await patch(company.id, { name: draftName.trim() })) {
                              setRenaming(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRenaming(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-forest-900">{company.name}</span>
                        {company.isDefault && <Badge tone="strong">Yours</Badge>}
                        {!company.active && <Badge tone="neutral">Closed</Badge>}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[0.75rem] text-forest-900/60">
                    ?c={company.slug}
                  </td>
                  <td className="py-3 pr-4 text-forest-900/70">{company.members}</td>
                  <td className="py-3 pr-4 text-forest-900/70">
                    {company.assessments}
                    {company.assessments > 0 && (
                      <span className="text-forest-900/45"> ({company.submitted} submitted)</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => {
                          setRenaming(company.id);
                          setDraftName(company.name);
                        }}
                      >
                        Rename
                      </Button>
                      {!company.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy !== null}
                          onClick={() => patch(company.id, { active: !company.active })}
                        >
                          {company.active ? "Close" : "Reopen"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[62ch] text-[0.8125rem] leading-relaxed text-forest-900/50">
          To give somebody a company, step into it above and add them on the Team page. They will
          see only that company, and an owner there can manage their own people from then on.
        </p>
      </section>
    </div>
  );
}
