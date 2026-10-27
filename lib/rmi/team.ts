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
 */

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
  if (role === "owner") return;

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

export async function listTeam(): Promise<TeamMember[]> {
  const [{ data, error }, accounts] = await Promise.all([
    admin()
      .from("rmi_admins")
      .select("id, email, full_name, role, created_at, invited_by, invited_at")
      .order("created_at", { ascending: true }),
    authUsers(),
  ]);
  if (error) throw new TeamError(`The team could not be read: ${error.message}`, 502);

  return (data as AdminRow[]).map((row) => {
    const account = accounts.get(row.id);
    return {
      id: row.id,
      email: row.email,
      name: row.full_name,
      role: row.role === "owner" ? "owner" : "admin",
      addedAt: row.created_at,
      invitedBy: row.invited_by,
      invitedAt: row.invited_at,
      lastSignInAt: account?.last_sign_in_at ?? null,
      signedIn: Boolean(account?.last_sign_in_at),
      confirmed: Boolean(account?.email_confirmed_at ?? account?.confirmed_at),
    };
  });
}

async function member(id: string): Promise<TeamMember> {
  const team = await listTeam();
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
}): Promise<{ member: TeamMember; invitation: Invitation | null }> {
  const email = normaliseEmail(input.email);
  const role: TeamRole = input.role === "owner" ? "owner" : "admin";
  const fullName =
    typeof input.fullName === "string" && input.fullName.trim() ? input.fullName.trim() : null;
  const password = input.password === undefined || input.password === null
    ? null
    : checkPassword(input.password);

  const existing = await listTeam();
  if (existing.some((m) => m.email.toLowerCase() === email)) {
    throw new TeamError("That email is already on the team.", 409);
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
      invited_by: input.by,
      invited_at: new Date().toISOString(),
    });
  if (error) throw new TeamError(`They could not be added to the team: ${error.message}`, 502);

  return { member: await member(userId!), invitation };
}

/** A fresh link for someone who never used the first one, or forgot their password. */
export async function makeInvitation(id: string): Promise<Invitation> {
  const target = await member(id);
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
export async function setMemberPassword(id: string, password: unknown): Promise<TeamMember> {
  const target = await member(id);
  const checked = checkPassword(password);

  const { error } = await admin().auth.admin.updateUserById(target.id, {
    password: checked,
    email_confirm: true,
  });
  if (error) throw new TeamError(`The password could not be set: ${error.message}`, 502);
  return member(id);
}

export async function changeRole(
  id: string,
  role: unknown,
  actorId: string,
): Promise<TeamMember> {
  if (role !== "owner" && role !== "admin") {
    throw new TeamError("A role is either owner or admin.", 400);
  }
  const team = await listTeam();
  assertCanChangeRole(team, id, role, actorId);
  if (team.find((m) => m.id === id)?.role === role) return member(id);

  const { error } = await admin().from("rmi_admins").update({ role }).eq("id", id);
  if (error) throw new TeamError(`The role could not be changed: ${error.message}`, 502);
  return member(id);
}

export async function updateName(id: string, fullName: unknown): Promise<TeamMember> {
  const name =
    typeof fullName === "string" && fullName.trim() ? fullName.trim().slice(0, 120) : null;
  await member(id);
  const { error } = await admin().from("rmi_admins").update({ full_name: name }).eq("id", id);
  if (error) throw new TeamError(`The name could not be changed: ${error.message}`, 502);
  return member(id);
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
export async function removeMember(id: string, actorId: string): Promise<void> {
  assertCanRemove(await listTeam(), id, actorId);

  const { error } = await admin().from("rmi_admins").delete().eq("id", id);
  if (error) throw new TeamError(`They could not be removed: ${error.message}`, 502);
}
