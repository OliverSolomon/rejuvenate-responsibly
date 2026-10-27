// Creates a confirmed Supabase auth user and puts it on the rmi_admins list.
// Usage: node --env-file=.env.local scripts/seed-test-admin.mjs <email> <password> "<Full Name>"
import { createClient } from "@supabase/supabase-js";

const [email, password, fullName] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: seed-test-admin.mjs <email> <password> "<Full Name>"');
  process.exit(1);
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

let { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (error && !/already/i.test(error.message)) throw error;

let id = data?.user?.id;
if (!id) {
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  id = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  if (!id) throw new Error("User exists but could not be found");
  const upd = await admin.auth.admin.updateUserById(id, { password, email_confirm: true });
  if (upd.error) throw upd.error;
}

const { error: rowError } = await admin
  .from("rmi_admins")
  .upsert({ id, email, full_name: fullName });
if (rowError) throw rowError;

console.log(`Admin ready: ${email} (${id})`);
