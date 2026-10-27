/**
 * Which firm's link somebody arrived through.
 *
 * Each company hands out `?c=<slug>`, and that slug decides whose work the
 * assessment becomes. It is remembered for the tab because the flow moves
 * between pages, and the person who started on a company's link should still
 * be theirs three steps later even though the query is gone from the address.
 *
 * Nothing is trusted here: the server checks the slug against the open
 * companies before it attributes anything.
 */

const KEY = "rmi:company";

/** The slug on the address now, or the one this tab arrived with. */
export function linkCompany(): string | null {
  if (typeof window === "undefined") return null;

  const fromUrl = new URLSearchParams(window.location.search).get("c")?.trim().toLowerCase();
  if (fromUrl) {
    try {
      window.sessionStorage.setItem(KEY, fromUrl);
    } catch {
      // Private mode. It still works for this page.
    }
    return fromUrl;
  }

  try {
    return window.sessionStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

/** The query to hang off a create call, empty when it is the house link. */
export function companyQuery(): string {
  const slug = linkCompany();
  return slug ? `?c=${encodeURIComponent(slug)}` : "";
}
