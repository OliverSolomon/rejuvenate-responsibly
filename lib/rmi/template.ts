import { site } from "@/lib/site";

/**
 * The report template: the letterhead and footer a report is wrapped in.
 *
 * A template is one HTML document authored in the editor, with placeholders
 * where the report's own content goes. Merging is a text substitution, which
 * keeps it predictable and means nothing in the template can run.
 *
 * The merged document is rendered in an iframe, both in preview and for the
 * client, so the template's own styling cannot collide with the site's and what
 * is on screen is what prints.
 */

/**
 * The site's own fonts, declared under their real names.
 *
 * next/font serves these same files under a generated family name that only the
 * site's CSS knows, which is no use to a report: the document is standalone,
 * rendered in an iframe and printed, so it needs a family name it can ask for.
 * Injected into every composed document, whatever template built it, so a
 * letterhead an admin designed is in the house type as well.
 *
 * The editor is the exception. It lays out HTML without fetching anything, so
 * the PDF it renders uses its own font rather than these. The report on screen
 * and the report on paper differ in type for that reason, which is why the
 * template editor says the look is set with the editor's own tools.
 */
export const FONT_FACE_CSS = `
@font-face {
  font-family: "Inter Tight";
  src: url("/fonts/inter-tight-latin-wght-normal.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: "Schibsted Grotesk";
  src: url("/fonts/schibsted-grotesk-latin-wght-normal.woff2") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: "Instrument Serif";
  src: url("/fonts/instrument-serif-latin-400-normal.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
`;

/** The stack a report uses, matching the site's body type. */
export const DOCUMENT_FONT_STACK =
  '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** And the stack its headings use, matching the site's display type. */
export const DOCUMENT_DISPLAY_STACK =
  '"Schibsted Grotesk", "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif';

export type PlaceholderId =
  | "report"
  | "logo"
  | "stamp"
  | "client_logo"
  | "organisation"
  | "reference"
  | "tier"
  | "score"
  | "issued_date"
  | "expires_date"
  | "expiry_notice"
  | "firm_name"
  | "firm_email"
  | "firm_location";

export const PLACEHOLDERS: {
  id: PlaceholderId;
  label: string;
  hint: string;
  required?: true;
}[] = [
  {
    id: "report",
    label: "{{report}}",
    hint: "The report itself. Put this where the writing should begin; a template without it cannot be published.",
    required: true,
  },
  { id: "logo", label: "{{logo}}", hint: "Your logo, as uploaded in settings. Nothing appears if none is set." },
  { id: "stamp", label: "{{stamp}}", hint: "Your stamp or seal, as uploaded in settings." },
  {
    id: "client_logo",
    label: "{{client_logo}}",
    hint: "The assessed organisation's own logo, if they added one while filling in the form.",
  },
  { id: "organisation", label: "{{organisation}}", hint: "The assessed organisation's name." },
  { id: "reference", label: "{{reference}}", hint: "The assessment reference, such as RMI-7F3K2Q." },
  { id: "tier", label: "{{tier}}", hint: "The tier awarded: Bronze, Silver, Gold or Platinum." },
  { id: "score", label: "{{score}}", hint: "The overall score out of 100." },
  { id: "issued_date", label: "{{issued_date}}", hint: "The date the report was issued." },
  { id: "expires_date", label: "{{expires_date}}", hint: "The date it stops being current, a year after issue." },
  {
    id: "expiry_notice",
    label: "{{expiry_notice}}",
    hint: "A line saying the report has expired. Empty while the report is still current, so it is safe to leave in.",
  },
  { id: "firm_name", label: "{{firm_name}}", hint: "Rejuvenate Responsibly." },
  { id: "firm_email", label: "{{firm_email}}", hint: "The firm's email address." },
  { id: "firm_location", label: "{{firm_location}}", hint: "The firm's location." },
];

export type TemplateValues = Partial<Record<PlaceholderId, string>>;

/**
 * The editor can split typed text across inline tags, so `{{report}}` may come
 * back as `{{re<span>port</span>}}`. Tags between a pair of braces are dropped
 * before substituting, which puts the token back together.
 */
export function normaliseTemplate(html: string): string {
  return html.replace(/\{\{([\s\S]{0,400}?)\}\}/g, (whole, inner: string) => {
    const bare = inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    return /^[a-z_]{1,32}$/.test(bare) ? `{{${bare}}}` : whole;
  });
}

/** Which placeholders a template actually uses. */
export function placeholdersIn(html: string): PlaceholderId[] {
  const found = new Set<PlaceholderId>();
  const known = new Set(PLACEHOLDERS.map((p) => p.id));
  for (const match of normaliseTemplate(html).matchAll(/\{\{([a-z_]{1,32})\}\}/g)) {
    const id = match[1] as PlaceholderId;
    if (known.has(id)) found.add(id);
  }
  return [...found];
}

/**
 * Placeholders that stand for whole blocks rather than a few words.
 *
 * The editor puts every line of a document in a paragraph, so `{{report}}`
 * comes back as `<p>{{report}}</p>`. Substituting inside that would nest
 * headings, lists and tables in a paragraph, which is not valid and which
 * browsers silently rearrange. For these the paragraph around the token is
 * replaced along with it.
 */
const BLOCK_PLACEHOLDERS: PlaceholderId[] = ["report", "expiry_notice"];

const BLOCK_TAGS = "p|div|section|article|h[1-6]|li|td";

/**
 * Replace a block element that holds nothing but one token with the token
 * alone, so the substitution lands at block level.
 */
function unwrapBlocks(html: string): string {
  let out = html;
  for (const id of BLOCK_PLACEHOLDERS) {
    const pattern = new RegExp(
      `<(${BLOCK_TAGS})\\b[^>]*>((?:\\s|&nbsp;|<[^>]*>)*)\\{\\{${id}\\}\\}((?:\\s|&nbsp;|<[^>]*>)*)</\\1>`,
      "gi",
    );
    // Runs until it stops changing, so nested wrappers come off too.
    for (let i = 0; i < 4; i += 1) {
      const next = out.replace(pattern, `{{${id}}}`);
      if (next === out) break;
      out = next;
    }
  }
  return out;
}

/** Substitute every placeholder. An unknown one is left alone so a typo is visible. */
export function mergeTemplate(html: string, values: TemplateValues): string {
  return unwrapBlocks(normaliseTemplate(html)).replace(
    /\{\{([a-z_]{1,32})\}\}/g,
    (whole, id: string) => {
      const value = values[id as PlaceholderId];
      if (value !== undefined) return value;
      // A known placeholder with nothing behind it disappears rather than
      // printing its own name on a document someone is about to send.
      return PLACEHOLDERS.some((p) => p.id === id) ? "" : whole;
    },
  );
}

/** An `img` tag for an uploaded asset, or nothing when there is no asset. */
export function imageTag(
  href: string | undefined,
  alt: string,
  className: string,
): string {
  if (!href) return "";
  const safeHref = href.replace(/"/g, "&quot;");
  const safeAlt = alt.replace(/"/g, "&quot;");
  return `<img src="${safeHref}" alt="${safeAlt}" class="${className}" />`;
}

/**
 * The template used until an admin publishes one of their own. It is the
 * letterhead the reports have always carried, written out with placeholders so
 * it can be opened in the editor and changed from there.
 */
export const DEFAULT_TEMPLATE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Sustainability assessment report</title>
<style>
  :root { --ink: #0d2418; --muted: #5c6b62; --rule: #d9ded9; --accent: #1a8656; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 56px 64px;
    font-family: "Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11.5pt;
    line-height: 1.65;
    color: var(--ink);
    background: #fff;
  }
  .letterhead {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--rule);
  }
  .letterhead .marks { display: flex; align-items: center; gap: 16px; }
  .logo { max-height: 56px; width: auto; }
  .client-logo { max-height: 44px; width: auto; }
  .firm {
    font-family: "Schibsted Grotesk", "Inter Tight", Arial, sans-serif;
    font-weight: 600; letter-spacing: 0.01em; text-transform: uppercase; font-size: 10pt;
  }
  .contact { text-align: right; font-size: 8.5pt; color: var(--muted); line-height: 1.5; }
  .meta { margin: 28px 0 0; font-size: 9pt; color: var(--muted); }
  .meta strong { color: var(--ink); font-weight: 600; }
  .expiry { margin: 20px 0 0; }
  .body { margin-top: 28px; }
  h1, h2, h3 {
    font-family: "Schibsted Grotesk", "Inter Tight", "Helvetica Neue", Arial, sans-serif;
    letter-spacing: -0.015em;
  }
  h1 { font-size: 20pt; line-height: 1.2; margin: 0 0 14px; }
  h2 { font-size: 13pt; margin: 26px 0 8px; }
  h3 { font-size: 11.5pt; margin: 20px 0 6px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 5px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 10pt; }
  th, td { border-bottom: 1px solid var(--rule); padding: 7px 9px; text-align: left; }
  th { font-weight: 600; background: #f6f7f5; }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 24px 0; }
  .footer {
    margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--rule);
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
    font-size: 8.5pt; color: var(--muted); line-height: 1.5;
  }
  .stamp { max-height: 96px; width: auto; }
  @page { margin: 18mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <header class="letterhead">
    <div class="marks">
      {{logo}}
      <span class="firm">{{firm_name}}</span>
      {{client_logo}}
    </div>
    <div class="contact">
      <div>{{firm_location}}</div>
      <div>{{firm_email}}</div>
    </div>
  </header>

  <p class="meta">
    <strong>{{organisation}}</strong><br />
    Reference {{reference}} &middot; Issued {{issued_date}} &middot; Valid until {{expires_date}}
  </p>

  <div class="expiry">{{expiry_notice}}</div>

  <div class="body">{{report}}</div>

  <footer class="footer">
    <div>
      <div>Framework: NSE Kenya ESG Disclosure Manual and GRI Standards</div>
      <div>
        This report is issued on the basis of self-declared responses and the
        stakeholder survey. It is not an audit.
      </div>
    </div>
    {{stamp}}
  </footer>
</body>
</html>`;

/**
 * What the editor opens when there is no draft and nothing published.
 *
 * Deliberately plainer than the template above. The editor is a word processor:
 * it reads HTML into a document of paragraphs, tables and runs, and writing it
 * back out drops page level CSS. So the starter is shaped like a document, with
 * a table holding the letterhead row, and the look is set in the editor itself
 * rather than in a stylesheet that would not survive.
 */
export const EDITOR_STARTER_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Sustainability assessment report</title></head>
<body>
  <table style="width:100%;border:none;">
    <tr>
      <td style="width:55%;vertical-align:top;border:none;">
        {{logo}}
        <p><strong>{{firm_name}}</strong></p>
        {{client_logo}}
      </td>
      <td style="width:45%;vertical-align:top;text-align:right;border:none;">
        <p>{{firm_location}}<br />{{firm_email}}</p>
      </td>
    </tr>
  </table>

  <hr />

  <p><strong>{{organisation}}</strong><br />
  Reference {{reference}} &middot; {{tier}} &middot; Score {{score}} out of 100<br />
  Issued {{issued_date}} &middot; Valid until {{expires_date}}</p>

  <p>{{expiry_notice}}</p>

  <p>{{report}}</p>

  <hr />

  <table style="width:100%;border:none;">
    <tr>
      <td style="width:70%;vertical-align:middle;border:none;">
        <p>Framework: NSE Kenya ESG Disclosure Manual and GRI Standards</p>
        <p>This report is issued on the basis of self-declared responses and the
        stakeholder survey. It is not an audit.</p>
      </td>
      <td style="width:30%;vertical-align:middle;text-align:right;border:none;">
        {{stamp}}
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Put the house fonts into a finished document.
 *
 * The style block goes at the end of `head` so it wins over anything the
 * template declared, and the body rule is written as a low specificity default:
 * it sets the type for a document that never asked, without overriding a font
 * an admin chose deliberately on a particular paragraph.
 *
 * A document the editor wrote has no `head` of its own worth the name, so one
 * is made if it is missing. This runs on the merged document, not the template,
 * so it cannot be saved away by an edit.
 */
export function withHouseFonts(html: string): string {
  const style =
    `<style data-house-fonts>${FONT_FACE_CSS}` +
    `body{font-family:${DOCUMENT_FONT_STACK};}` +
    `h1,h2,h3,h4{font-family:${DOCUMENT_DISPLAY_STACK};}` +
    `</style>`;

  if (html.includes("data-house-fonts")) return html;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${style}</head>`);
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (open) => `<head>${style}</head>${open}`);
  }
  return `${style}${html}`;
}

/** The notice that replaces {{expiry_notice}} once a report is past its year. */
export function expiryNoticeHtml(expires: Date): string {
  const when = expires.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    `<div style="border:1px solid #b45309;background:#fef6e7;color:#7c3f06;` +
    `padding:10px 14px;font-size:9pt;line-height:1.5;">` +
    `<strong>This report has expired.</strong> It covers the assessment as it stood ` +
    `on the date it was issued and stopped being current on ${when}. ` +
    `A new assessment is needed for an up to date position.` +
    `</div>`
  );
}

/** The firm's own details, which the template can place but never has to set. */
export function firmValues(): TemplateValues {
  return {
    firm_name: site.name,
    firm_email: site.email,
    firm_location: site.location,
  };
}
