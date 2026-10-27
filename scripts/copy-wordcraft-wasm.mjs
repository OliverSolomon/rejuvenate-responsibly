/**
 * Two things that have to sit under a URL the browser can reach, copied here
 * before dev and before a build so neither has to be committed twice.
 *
 * The WordCraft editor loads its own .wasm at runtime and bundlers cannot
 * resolve it for us, so it comes out of node_modules.
 *
 * The site's fonts are loaded by next/font, which serves them under a generated
 * family name that only the site's own CSS knows. A report is a standalone
 * document, rendered in an iframe and printed, so it needs the same files under
 * a plain URL and a real family name. These are copies of the same files the
 * site uses, so there is one source of truth in app/fonts.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

const FILES = ["wordcraft_embed_bg.wasm", "wordcraft_embed.js"];

try {
  const pkg = require.resolve("@gamine/wordcraft-react/package.json");
  const from = join(dirname(pkg), "wasm");
  const to = join(process.cwd(), "public", "wordcraft");
  await mkdir(to, { recursive: true });
  for (const name of FILES) {
    await copyFile(join(from, name), join(to, name));
  }
  console.log(`wordcraft: copied ${FILES.length} files to public/wordcraft`);
} catch (error) {
  // A missing editor should not stop the rest of the site from building. The
  // edit page says so itself when the runtime fails to start.
  console.warn("wordcraft: could not copy the wasm runtime.", error.message);
}

/* -------------------------------------------------------------------------- */
/* the site's fonts, for documents that are not the site                      */
/* -------------------------------------------------------------------------- */

const FONTS = [
  "inter-tight-latin-wght-normal.woff2",
  "schibsted-grotesk-latin-wght-normal.woff2",
  "instrument-serif-latin-400-normal.woff2",
];

try {
  const from = join(process.cwd(), "app", "fonts");
  const to = join(process.cwd(), "public", "fonts");
  await mkdir(to, { recursive: true });
  for (const name of FONTS) {
    await copyFile(join(from, name), join(to, name));
  }
  console.log(`fonts: copied ${FONTS.length} files to public/fonts`);
} catch (error) {
  // Reports would fall back to a system font, which is a blemish rather than a
  // reason to stop the build.
  console.warn("fonts: could not copy the font files.", error.message);
}
