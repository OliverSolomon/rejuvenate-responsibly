export type StorageBackend = "supabase" | "file";

let warned = false;

/**
 * Which backend holds the data.
 *
 * Supabase when the project URL and the service role key are both present;
 * otherwise the JSON file, so local development works with nothing configured.
 * RMI_STORAGE=file forces the file (for example to keep a laptop off the live
 * database); RMI_STORAGE=supabase insists on Supabase and fails loudly if the
 * key is missing rather than quietly writing to a file nobody is watching.
 */
export function storageBackend(): StorageBackend {
  const forced = process.env.RMI_STORAGE?.trim().toLowerCase();
  const hasKey = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (forced === "file") return "file";
  if (forced === "supabase") {
    if (!hasKey) {
      throw new Error(
        "RMI_STORAGE=supabase but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.",
      );
    }
    return "supabase";
  }

  if (hasKey) return "supabase";

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[rmi:store] SUPABASE_SERVICE_ROLE_KEY is not set, so submissions are being written to a local file. Set it to store data in Supabase.",
    );
  }
  return "file";
}
