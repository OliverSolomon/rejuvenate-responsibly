/**
 * The WordCraft editor loads its own .wasm at runtime. Bundlers cannot resolve
 * it for us, so it has to sit under a URL the browser can reach. This copies it
 * out of node_modules into public/wordcraft/ before dev and before a build, so
 * the binary never needs to be committed.
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
