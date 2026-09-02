import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Answers } from "./scoring";

/**
 * File backed store. It is deliberately small and boring so it can be swapped
 * for Postgres, Supabase or an Airtable base without touching the routes:
 * replace the four functions at the bottom of this file.
 *
 * Note for deployment: serverless filesystems are ephemeral, so point
 * RMI_DATA_DIR at a mounted volume, or swap in a real database before launch.
 */

const DATA_DIR = process.env.RMI_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "rmi-submissions.json");

export type Profile = {
  organisation: string;
  contactName: string;
  email: string;
  role: string;
  sector: string;
};

export type ScoreSummary = {
  overall: number;
  coverage: number;
  depth: number;
  tier: string;
  sections: { id: string; score: number }[];
};

export type Submission = {
  id: string;
  audience: "client" | "stakeholder";
  reference: string | null;
  profile: Profile;
  answers: Answers;
  score: ScoreSummary;
  createdAt: string;
};

export type StakeholderInvite = {
  id: string;
  reference: string;
  organisation: string;
  invitedBy: string;
  name: string;
  email: string;
  relationship: string;
  token: string;
  createdAt: string;
};

type Db = {
  submissions: Submission[];
  invites: StakeholderInvite[];
};

async function read(): Promise<Db> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as Db;
  } catch {
    return { submissions: [], invites: [] };
  }
}

async function write(db: Db): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function saveSubmission(
  input: Omit<Submission, "id" | "createdAt">,
): Promise<Submission> {
  const db = await read();
  const record: Submission = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.submissions.push(record);
  await write(db);
  return record;
}

export async function saveInvites(
  invites: Omit<StakeholderInvite, "id" | "token" | "createdAt">[],
): Promise<StakeholderInvite[]> {
  const db = await read();
  const created = invites.map((i) => ({
    ...i,
    id: randomUUID(),
    token: randomUUID().replace(/-/g, "").slice(0, 20),
    createdAt: new Date().toISOString(),
  }));
  db.invites.push(...created);
  await write(db);
  return created;
}

export async function listSubmissions(reference?: string): Promise<Submission[]> {
  const db = await read();
  return reference ? db.submissions.filter((s) => s.reference === reference) : db.submissions;
}

export async function findInvite(token: string): Promise<StakeholderInvite | undefined> {
  const db = await read();
  return db.invites.find((i) => i.token === token);
}
