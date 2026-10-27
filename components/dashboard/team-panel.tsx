"use client";

import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TeamMember } from "@/lib/rmi/team";
import type { TeamRole } from "@/utils/supabase/server";

const PASSWORD_MIN = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

type Note = { kind: "ok" | "bad"; text: string; link?: string } | null;

/** How someone's account stands, said in one phrase. */
function state(member: TeamMember): { label: string; tone: "good" | "pending" | "quiet" } {
  if (member.signedIn) return { label: "Active", tone: "good" };
  if (member.confirmed) return { label: "Not signed in yet", tone: "pending" };
  return { label: "Invitation outstanding", tone: "pending" };
}

export function TeamPanel({
  team,
  you,
  configured,
  companies,
}: {
  team: TeamMember[];
  /** Every company, for a super admin to place people in. Null for anyone else. */
  companies: { id: string; name: string }[] | null;
  you: { id: string; email: string; role: TeamRole };
  /** Without the service role key no account can be created at all. */
  configured: boolean;
}) {
  const router = useRouter();
  const isSuper = you.role === "super";
  // A super admin manages any team, so the controls are the owner's controls.
  const isOwner = you.role === "owner" || isSuper;

  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TeamRole>("admin");
  const [companyId, setCompanyId] = useState("");
  const [how, setHow] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");

  const canAdd =
    EMAIL.test(email) && (how === "invite" || password.length >= PASSWORD_MIN) && !busy;

  function reset() {
    setEmail("");
    setFullName("");
    setRole("admin");
    setCompanyId("");
    setHow("invite");
    setPassword("");
    setAdding(false);
  }

  async function add() {
    setBusy("add");
    setNote(null);
    try {
      const res = await fetch("/api/dashboard/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          role,
          // Only a super admin gets to choose; for anyone else the server uses their own company.
          ...(isSuper && companyId && role !== "super" ? { companyId } : {}),
          ...(how === "password" ? { password } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "They could not be added.");

      if (!data.invited) {
        setNote({
          kind: "ok",
          text: `${email} can sign in now with the password you set. Tell them what it is; nothing was emailed.`,
        });
      } else if (data.emailed) {
        setNote({ kind: "ok", text: `Invitation sent to ${email}.` });
      } else {
        setNote({
          kind: "bad",
          text: `${email} was added, but the invitation could not be emailed${
            data.emailError ? ` (${data.emailError})` : ""
          }. Send them this link yourself.`,
          link: data.link,
        });
      }
      reset();
      router.refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(null);
    }
  }

  async function act(
    member: TeamMember,
    body: Record<string, unknown>,
    describe: (data: Record<string, unknown>) => Note,
  ) {
    setBusy(member.id);
    setNote(null);
    try {
      const res = await fetch(`/api/dashboard/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not work.");
      setNote(describe(data));
      router.refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(member: TeamMember) {
    setBusy(member.id);
    setNote(null);
    try {
      const res = await fetch(`/api/dashboard/team/${member.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "They could not be removed.");
      setNote({
        kind: "ok",
        text: `${member.email} can no longer reach the dashboard. Their account still exists, so adding them back is one step.`,
      });
      router.refresh();
    } catch (err) {
      setNote({ kind: "bad", text: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(null);
    }
  }

  function setTheirPassword(member: TeamMember) {
    const entered = window.prompt(
      `A new password for ${member.email}. At least ${PASSWORD_MIN} characters, and you will need to tell them what it is.`,
    );
    if (entered === null) return;
    if (entered.length < PASSWORD_MIN) {
      setNote({ kind: "bad", text: `A password needs at least ${PASSWORD_MIN} characters.` });
      return;
    }
    void act(member, { action: "password", password: entered }, () => ({
      kind: "ok",
      text: `Done. Tell ${member.email} the password yourself; it is deliberately not emailed.`,
    }));
  }

  const owners = team.filter((m) => m.role === "owner").length;

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="display text-[1.125rem]">Team</h2>
          <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
            Everyone who can open the dashboard. Owners add and remove people and change roles;
            admins do everything else; members can look at their company&apos;s work and change
            nothing. People an admin adds join that admin&apos;s company; a super admin places them
            in any company. Sign in is by email and password, and there is no way in except from
            this list.
          </p>
        </div>
        {isOwner && !adding && (
          <Button variant="primary" size="sm" onClick={() => setAdding(true)} disabled={!configured}>
            Add someone
          </Button>
        )}
      </div>

      {!configured && (
        <p className="mt-5 rounded-xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          Adding people needs the Supabase service role key on the server. Until it is set, the
          list below is all there is and nobody new can be created.
        </p>
      )}

      {!isOwner && (
        <p className="mt-5 rounded-xl border border-forest-900/10 bg-forest-900/[0.04] p-4 text-[0.8125rem] leading-relaxed text-forest-900/65">
          You are {you.role === "member" ? "a member" : "an admin"}, so this list is read only for
          you. Ask an owner to add or remove anyone. You can still change your own password.
        </p>
      )}

      {note && (
        <div
          className={`mt-5 rounded-xl p-4 text-[0.875rem] leading-relaxed ${
            note.kind === "ok"
              ? "border border-forest-700/25 bg-lime-100/60 text-forest-700"
              : "border border-clay-400/30 bg-clay-400/8 text-clay-500"
          }`}
          role="status"
        >
          <p>{note.text}</p>
          {note.link && (
            <code className="mt-2 block overflow-x-auto rounded-lg bg-bone-100 p-2.5 text-[0.75rem] text-forest-900">
              {note.link}
            </code>
          )}
        </div>
      )}

      {isOwner && adding && (
        <div className="mt-6 rounded-xl border border-forest-900/12 bg-bone-100 p-5">
          <p className="display text-[0.9375rem]">Add someone</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">Email</span>
              <input
                type="email"
                value={email}
                autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 text-[0.9375rem]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">
                Name <span className="font-normal text-forest-900/45">(optional)</span>
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 text-[0.9375rem]"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">Role</span>
              <Select
                value={role}
                onChange={(picked) => setRole(picked as TeamRole)}
                aria-label="Role"
                options={[
                  { value: "member", label: "Member", hint: "Can look, cannot change anything" },
                  { value: "admin", label: "Admin", hint: "Works in the company, cannot manage the team" },
                  { value: "owner", label: "Owner", hint: "Can also manage the team" },
                  ...(isSuper
                    ? [{ value: "super", label: "Super admin", hint: "Sees every company" }]
                    : []),
                ]}
              />
            </label>
            {isSuper && companies && role !== "super" && (
              <label className="flex flex-col gap-2">
                <span className="text-[0.8125rem] font-medium text-forest-900/70">Company</span>
                <Select
                  value={companyId}
                  onChange={setCompanyId}
                  aria-label="Company"
                  placeholder="The company I am managing"
                  options={companies.map((c) => ({ value: c.id, label: c.name }))}
                />
              </label>
            )}
            <label className="flex flex-col gap-2">
              <span className="text-[0.8125rem] font-medium text-forest-900/70">
                How they get in
              </span>
              <Select
                value={how}
                onChange={(v) => setHow(v === "password" ? "password" : "invite")}
                aria-label="How they get in"
                options={[
                  { value: "invite", label: "Email them a link to set their own password" },
                  { value: "password", label: "I will set their password now" },
                ]}
              />
            </label>

            {how === "password" && (
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-[0.8125rem] font-medium text-forest-900/70">
                  Their password
                </span>
                <input
                  type="text"
                  value={password}
                  autoComplete="off"
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 text-[0.9375rem]"
                />
                <span className="text-[0.75rem] leading-relaxed text-forest-900/50">
                  At least {PASSWORD_MIN} characters. It is shown here because you have to pass it
                  on yourself: it is never emailed, since an emailed password is a password in two
                  places. They can change it from the dashboard afterwards.
                </span>
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={add} disabled={!canAdd}>
              {busy === "add" ? "Adding..." : how === "invite" ? "Add and send the link" : "Add them"}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-forest-900/8">
        {team.map((member) => {
          const s = state(member);
          const working = busy === member.id;
          const isYou = member.id === you.id;
          const lastOwner = member.role === "owner" && owners === 1;

          return (
            <li key={member.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[0.9375rem] text-forest-900">
                  <span className="font-medium">{member.name || member.email}</span>
                  <Badge tone={member.role === "admin" || member.role === "member" ? "neutral" : "strong"}>
                    {member.role === "super" ? "super admin" : member.role}
                  </Badge>
                  {isSuper && member.role !== "super" && (
                    <Badge tone="quiet">
                      {companies?.find((c) => c.id === member.companyId)?.name ?? member.companyId}
                    </Badge>
                  )}
                  <Badge tone={s.tone === "good" ? "good" : "pending"}>{s.label}</Badge>
                  {isYou && <span className="text-[0.75rem] text-forest-900/45">that is you</span>}
                </p>
                <p className="mt-1 text-[0.8125rem] text-forest-900/55">
                  {member.name ? `${member.email} · ` : ""}
                  added {fmt(member.addedAt)}
                  {member.invitedBy ? ` by ${member.invitedBy}` : ""}
                  {member.lastSignInAt ? ` · last signed in ${fmt(member.lastSignInAt)}` : ""}
                </p>
              </div>

              {isOwner && (
                <div className="flex flex-wrap gap-2">
                  {!member.signedIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={working || !configured}
                      onClick={() =>
                        void act(member, { action: "invite" }, (data) =>
                          data.emailed
                            ? { kind: "ok", text: `A fresh link is on its way to ${member.email}.` }
                            : {
                                kind: "bad",
                                text: `The link could not be emailed${
                                  data.emailError ? ` (${data.emailError})` : ""
                                }. Pass this on yourself.`,
                                link: typeof data.link === "string" ? data.link : undefined,
                              },
                        )
                      }
                    >
                      Resend the link
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working || !configured}
                    onClick={() => setTheirPassword(member)}
                  >
                    Set a password
                  </Button>

                  {!isYou && !lastOwner && member.role !== "super" && (
                    <div className="w-36">
                      <Select
                        value={member.role}
                        aria-label={`Role for ${member.email}`}
                        className="h-9 text-[0.8125rem]"
                        disabled={working}
                        onChange={(next) =>
                          void act(member, { action: "role", role: next }, () => ({
                            kind: "ok",
                            text: `${member.email} is now ${
                              next === "owner" ? "an owner" : next === "admin" ? "an admin" : "a member"
                            }.`,
                          }))
                        }
                        options={[
                          { value: "member", label: "Member" },
                          { value: "admin", label: "Admin" },
                          { value: "owner", label: "Owner" },
                        ]}
                      />
                    </div>
                  )}

                  {isSuper && companies && !isYou && member.role !== "super" && (
                    <div className="w-48">
                      <Select
                        value={member.companyId}
                        aria-label={`Company for ${member.email}`}
                        className="h-9 text-[0.8125rem]"
                        disabled={working}
                        onChange={(next) =>
                          void act(member, { action: "company", companyId: next }, () => ({
                            kind: "ok",
                            text: `${member.email} now works in ${
                              companies.find((c) => c.id === next)?.name ?? next
                            }.`,
                          }))
                        }
                        options={companies.map((c) => ({ value: c.id, label: c.name }))}
                      />
                    </div>
                  )}

                  {isSuper && !isYou && member.role !== "super" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={working}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Make ${member.email} a super admin? They will see every company and be able to configure the installation.`,
                          )
                        ) {
                          void act(member, { action: "role", role: "super" }, () => ({
                            kind: "ok",
                            text: `${member.email} is now a super admin.`,
                          }));
                        }
                      }}
                    >
                      Make a super admin
                    </Button>
                  )}

                  {!isYou && !lastOwner && (member.role !== "super" || isSuper) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={working}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${member.email} from the dashboard? Their account stays, so you can add them back, but they lose access straight away.`,
                          )
                        ) {
                          void remove(member);
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
