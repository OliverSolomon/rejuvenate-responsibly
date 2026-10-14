/**
 * Turns lib/rmi/humanizer-skill.md into a TypeScript module, so the skill text
 * ships inside the server bundle rather than being read from disk at runtime
 * (the production build is a standalone output that does not carry loose files).
 *
 * Edit the .md, run `node scripts/build-humanizer.mjs`, commit both.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../lib/rmi/humanizer-skill.md", import.meta.url));
const out = fileURLToPath(new URL("../lib/rmi/humanizer-skill.ts", import.meta.url));

const text = readFileSync(src, "utf8").replace(/\r\n/g, "\n").trim();

writeFileSync(
  out,
  [
    "// Generated from humanizer-skill.md by scripts/build-humanizer.mjs.",
    "// Do not hand-edit: change the Markdown and regenerate.",
    "",
    `export const HUMANIZER_SKILL = ${JSON.stringify(text)};`,
    "",
  ].join("\n"),
);

console.log(`humanizer-skill.ts written (${text.length} characters)`);
