import "server-only";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { TeamRole } from "@/utils/supabase/server";

/**
 * The people who can use the dashboard.
 *
 * Everything here goes through the service role, for two reasons: creating an
 * account and setting a password are admin API calls that the browser key
 * cannot make, and the sign-in dates come from `auth.users`, which is not
 * reachable through row level security at all.
 *
 * Owners manage the team. Admins do everything else. The guards below are what
 * actually hold that line, since a route can be called directly, and they also
 * stop the two ways a team can lock itself out: removing the last owner, and
 * removing yourself.
 *
 * Every read and write here is about one company, because more than one firm
 * uses this installation and a company's team is its own. A super admin is the
 * exception twice over: they see across companies, and their own row is hidden
 * from everybody else, so an owner looking at their team sees only the people
 * they put there.
 */

/** Whose team to read: one company, or all of them for a super admin. */
export type TeamView = {
  /** null for every company at once, which only a super admin gets. */
  companyId: string | null;
  /** Super admin rows are left out unless a super admin is looking. */
  includeSuper: boolean;
};

export class TeamError extends Error {
  /** What to answer the browser with. Every message here is safe to show. */
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = "TeamError";
    this.status = status;
  }
}

export type TeamMember = {
  id: string;
  email: string;
  companyId: string;
  name: string | null;
  role: TeamRole;
  addedAt: string;
  invitedBy: string | null;
  invitedAt: string | null;
  lastSignInAt: string | null;
  /** They have been through the link or been given a password and used it. */
  signedIn: boolean;
  /** Their email is confirmed, so the account is usable. */
  confirmed: boolean;
};

/** Everything a freshly added person needs, when there is a link to send. */
export type Invitation = {
  email: string;
  tokenHash: string;
  type: "invite" | "recovery";
};

export const PASSWORD_MIN = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function teamConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new TeamError(
      "Managing the team needs SUPABASE_SERVICE_ROLE_KEY on the server. Without it accounts cannot be created.",
      503,
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function normaliseEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!EMAIL.test(email)) throw new TeamError("That does not look like an email address.", 400);
  return email;
}

export function checkPassword(value: unknown): string {
  const password = typeof value === "string" ? value : "";
  if (password.length < PASSWORD_MIN) {
    throw new TeamError(`A password needs at least ${PASSWORD_MIN} characters.`, 400);
  }
  if (password.length > 200) {
    throw new TeamError("That password is too long.", 400);
  }
  return password;
}

/* -------------------------------------------------------------------------- */
/* the rules                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The two ways a team can lock itself out, as decisions over a list rather than
 * database calls, so they can be read and tested on their own.
 */

export function assertCanRemove(team: TeamMember[], id: string, actorId: string): void {
  const target = team.find((m) => m.id === id);
  if (!target) throw new TeamError("That person is not on the team.", 404);

  if (target.role === "super" && team.filter((m) => m.role === "super").length === 1) {
    throw new TeamError(
      "This is the only super admin, so removing them would leave nobody who can manage the installation.",
      409,
    );
  }

  if (id === actorId) {
    throw new TeamError(
      "You cannot remove yourself. Ask another owner to do it, so nobody locks themselves out by accident.",
      409,
    );
  }

  if (target.role === "owner" && team.filter((m) => m.role === "owner").length === 1) {
    throw new TeamError(
      "This is the only owner, so removing them would leave the team with nobody who can manage it.",
      409,
    );
  }
}

export function assertCanChangeRole(
  team: TeamMember[],
  id: string,
  role: TeamRole,
  actorId: string,
): void {
  const target = team.find((m) => m.id === id);
  if (!target) throw new TeamError("That person is not on the team.", 404);
  if (target.role === role) return;

  if (target.role === "super" && team.filter((m) => m.role === "super").length === 1) {
    throw new TeamError(
      "This is the only super admin. Make someone else a super admin first, or nobody would be able to manage the installation.",
      409,
    );
  }

  if (role === "owner" || role === "super") return;

  if (team.filter((m) => m.role === "owner").length === 1 && target.role === "owner") {
    throw new TeamError(
      "This is the only owner. Make someone else an owner first, or the team would have nobody who can manage it.",
      409,
    );
  }
  if (id === actorId) {
    throw new TeamError(
      "You cannot step down to admin yourself. Ask another owner to do it, so it is never done by accident.",
      409,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* reading                                                                     */
/* -------------------------------------------------------------------------- */

type AdminRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_id: string | null;
  created_at: string;
  invited_by: string | null;
  invited_at: string | null;
};

/** Every auth account, keyed by id. One call rather than one per member. */
async function authUsers(): Promise<Map<string, User>> {
  const { data, error } = await admin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    // The list is a nicety: without it nobody can see who has signed in, which
    // is not a reason to refuse to show the team at all.
    console.warn("[rmi:team] could not read the auth accounts", error.message);
    return new Map();
  }
  return new Map(data.users.map((u) => [u.id, u]));
}

export async function listTeam(view: TeamView): Promise<TeamMember[]> {
  let query = admin()
    .from("rmi_admins")
    .select("id, email, full_name, role, company_id, created_at, invited_by, invited_at")
    .order("created_at", { ascending: true });

  // A super admin in the global view sees everyone. Anyone else sees one
  // company, and the filter happens here rather than after the rows arrive so
  // another company's team never reaches this process at all.
  if (view.companyId !== null) query = query.eq("company_id", view.companyId);
  if (!view.includeSuper) query = query.neq("role", "super");

  const [{ data, error }, accounts] = await Promise.all([query, authUsers()]);
  if (error) throw new TeamError(`The team could not be read: ${error.message}`, 502);

  return (data as AdminRow[]).map((row) => {
    const account = accounts.get(row.id);
    return {
      id: row.id,
      email: row.email,
      companyId: row.company_id ?? "default",
      name: row.full_name,
      role: row.role === "super" ? "super" : row.role === "owner" ? "owner" : "admin",
      addedAt: row.created_at,
      invitedBy: row.invited_by,
      invitedAt: row.invited_at,
      lastSignInAt: account?.last_sign_in_at ?? null,
      signedIn: Boolean(account?.last_sign_in_at),
      confirmed: Boolean(account?.email_confirmed_at ?? account?.confirmed_at),
    };
  });
}

async function member(id: string, view: TeamView): Promise<TeamMember> {
  const team = await listTeam(view);
  const found = team.find((m) => m.id === id);
  if (!found) throw new TeamError("That person is not on the team.", 404);
  return found;
}

/* -------------------------------------------------------------------------- */
/* adding someone                                                              */
/* -------------------------------------------------------------------------- */

async function accountFor(email: string): Promise<User | undefined> {
  const accounts = await authUsers();
  return [...accounts.values()].find((u) => u.email?.toLowerCase() === email);
}

/**
 * Add someone to the team.
 *
 * With a password, the account is ready to use at once and the owner tells them
 * what it is. Without one, an invitation is returned for the caller to email:
 * a link that signs them in once and asks them to choose their own.
 */
export async function addMember(input: {
  email: unknown;
  fullName?: unknown;
  role?: unknown;
  password?: unknown;
  by: string;
  /** The company they join. A super admin joins the default company. */
  companyId: string;
  /** True only when a super admin is adding, which is the only way to make one. */
  allowSuper?: boolean;
}): Promise<{ member: TeamMember; invitation: Invitation | null }> {
  const email = normaliseEmail(input.email);
  if (input.role === "super" && !input.allowSuper) {
    throw new TeamError("Only a super admin can add another super admin.", 403);
  }
  const role: TeamRole =
    input.role === "super" ? "super" : input.role === "owner" ? "owner" : "admin";
  // A super admin answers to the installation, not to one firm's team.
  const companyId = role === "super" ? "default" : input.companyId;
  const view: TeamView = { companyId: null, includeSuper: true };
  const fullName =
    typeof input.fullName === "string" && input.fullName.trim() ? input.fullName.trim() : null;
  const password = input.password === undefined || input.password === null
    ? null
    : checkPassword(input.password);

  // Checked across every company: one email is one account, so the same person
  // cannot be on two teams and the error has to say so plainly.
  const existing = await listTeam(view);
  if (existing.some((m) => m.email.toLowerCase() === email)) {
    throw new TeamError("That email already has access to the dashboard.", 409);
  }

  const account = await accountFor(email);
  let userId = account?.id;
  let invitation: Invitation | null = null;

  if (password) {
    if (userId) {
      const { error } = await admin().auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      });
      if (error) throw new TeamError(`The password could not be set: ${error.message}`, 502);
    } else {
      const { data, error } = await admin().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new TeamError(`The account could not be created: ${error?.message ?? "unknown"}`, 502);
      }
      userId = data.user.id;
    }
  } else {
    // An invite creates the account; a recovery link is for one that exists.
    const type: Invitation["type"] = userId ? "recovery" : "invite";
    const { data, error } = await admin().auth.admin.generateLink({ type, email });
    if (error || !data) {
      throw new TeamError(`The invitation could not be made: ${error?.message ?? "unknown"}`, 502);
    }
    userId = userId ?? data.user?.id;
    const tokenHash = data.properties?.hashed_token;
    if (!userId || !tokenHash) {
      throw new TeamError("Supabase did not return an invitation link.", 502);
    }
    invitation = { email, tokenHash, type };
  }

  const { error } = await admin()
    .from("rmi_admins")
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role,
      company_id: companyId,
      invited_by: input.by,
      invited_at: new Date().toISOString(),
    });
  if (error) throw new TeamError(`They could not be added to the team: ${error.message}`, 502);

  return { member: await member(userId!, view), invitation };
}

/** A fresh link for someone who never used the first one, or forgot their password. */
export async function makeInvitation(id: string, view: TeamView): Promise<Invitation> {
  const target = await member(id, view);
  const type: Invitation["type"] = target.confirmed ? "recovery" : "invite";

  const { data, error } = await admin().auth.admin.generateLink({
    type,
    email: target.email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new TeamError(`A new link could not be made: ${error?.message ?? "unknown"}`, 502);
  }
  return { email: target.email, tokenHash, type };
}

/* -------------------------------------------------------------------------- */
/* changing someone                                                            */
/* -------------------------------------------------------------------------- */

/** Set someone's password for them, for when an invitation is not wanted. */
export async function setMemberPassword(
  id: string,
  password: unknown,
  view: TeamView,
): Promise<TeamMember> {
  const target = await member(id, view);
  const checked = checkPassword(password);

  const { error } = await admin().auth.admin.updateUserById(target.id, {
    password: checked,
    email_confirm: true,
  });
  if (error) throw new TeamError(`The password could not be set: ${error.message}`, 502);
  return member(id, view);
}

export async function changeRole(
  id: string,
  role: unknown,
  actorId: string,
  view: TeamView,
  options: { allowSuper?: boolean } = {},
): Promise<TeamMember> {
  if (role !== "owner" && role !== "admin" && role !== "super") {
    throw new TeamError("A role is super admin, owner or admin.", 400);
  }
  if (role === "super" && !options.allowSuper) {
    throw new TeamError("Only a super admin can make someone a super admin.", 403);
  }
  const team = await listTeam(view);
  assertCanChangeRole(team, id, role, actorId);
  if (team.find((m) => m.id === id)?.role === role) return member(id, view);

  // Promoting to super moves them to the installation's own company, which is
  // where the shared keys live and what the global view is anchored to.
  const patch: { role: TeamRole; company_id?: string } =
    role === "super" ? { role, company_id: "default" } : { role };

  const { error } = await admin().from("rmi_admins").update(patch).eq("id", id);
  if (error) throw new TeamError(`The role could not be changed: ${error.message}`, 502);
  return member(id, view);
}

export async function updateName(
  id: string,
  fullName: unknown,
  view: TeamView,
): Promise<TeamMember> {
  const name =
    typeof fullName === "string" && fullName.trim() ? fullName.trim().slice(0, 120) : null;
  await member(id, view);
  const { error } = await admin().from("rmi_admins").update({ full_name: name }).eq("id", id);
  if (error) throw new TeamError(`The name could not be changed: ${error.message}`, 502);
  return member(id, view);
}

/* -------------------------------------------------------------------------- */
/* taking access away                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Take the dashboard away from someone.
 *
 * The Supabase account is left alone on purpose. Access is membership of this
 * table, so removing the row ends it immediately, and keeping the account means
 * adding them back later is one step and nothing recorded against their id
 * loses its reference.
 */
export async function removeMember(id: string, actorId: string, view: TeamView): Promise<void> {
  assertCanRemove(await listTeam(view), id, actorId);

  const { error } = await admin().from("rmi_admins").delete().eq("id", id);
  if (error) throw new TeamError(`They could not be removed: ${error.message}`, 502);
}
