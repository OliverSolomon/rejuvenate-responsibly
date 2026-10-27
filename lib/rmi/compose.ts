import "server-only";

import { contentTypeFor, getFile } from "./files";
import { renderMarkdown } from "./markdown";
import { brandAssets, isShared, templateCompany } from "./settings";
import { DEFAULT_COMPANY } from "./scope";
import { readTemplate, reportExpired, reportExpiry, type Assessment } from "./store";
import {
  DEFAULT_TEMPLATE_HTML,
  expiryNoticeHtml,
  firmValues,
  imageTag,
  mergeTemplate,
  withHouseFonts,
  type TemplateValues,
} from "./template";

/**
 * Builds the document a client receives: the report's own writing placed into
 * the published template, with every placeholder filled.
 *
 * One function does it for all three audiences, so the preview an admin signs
 * off, the page the client reads and the PDF that is attached cannot drift
 * apart. Nothing here decides whether a report may be seen; callers do that.
 */

export type ComposedReport = {
  /** A whole HTML document, for an iframe or the editor. */
  html: string;
  /** Which published template built it, or 0 for the built-in one. */
  templateVersion: number;
  expired: boolean;
  expiresAt: string | null;
  /** What to call the file when it is downloaded. */
  filename: string;
};

const longDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/**
 * Images are embedded rather than linked.
 *
 * The document is rendered in three places: an iframe on the client's page, the
 * editor that draws the preview, and the PDF that editor exports. The editor
 * lays out HTML without fetching anything over the network, so a linked logo
 * came out as its own alt text. Embedding costs a third more bytes and makes
 * the document self-contained, which is what a document that gets printed and
 * emailed should be anyway.
 */
async function dataUrl(filePath: string | undefined): Promise<string | undefined> {
  if (!filePath) return undefined;
  const file = await getFile(filePath);
  if (!file) return undefined;
  const type = file.contentType || contentTypeFor(filePath);
  return `data:${type};base64,${Buffer.from(file.bytes).toString("base64")}`;
}

export async function composeReport(
  assessment: Assessment,
  options: { now?: Date } = {},
): Promise<ComposedReport | null> {
  const report = assessment.report;
  if (!report) return null;

  // A company on the shared template gets the installation's letterhead, with
  // its own logo and stamp where it has uploaded them and the installation's
  // where it has not. A company on its own template has nothing to borrow.
  const company = assessment.companyId || DEFAULT_COMPANY;
  const [template, own, house, borrowing] = await Promise.all([
    templateCompany(company).then((owner) => readTemplate(owner)),
    brandAssets(company),
    brandAssets(DEFAULT_COMPANY),
    isShared(company, "template"),
  ]);
  const brand = borrowing
    ? { logo: own.logo ?? house.logo, stamp: own.stamp ?? house.stamp }
    : own;
  const templateHtml = template.published?.html ?? DEFAULT_TEMPLATE_HTML;
  const templateVersion = template.published ? template.version : 0;

  const expires = reportExpiry(report);
  const expired = reportExpired(report, options.now ?? new Date());

  const [logoSrc, stampSrc, clientLogoSrc] = await Promise.all([
    dataUrl(brand.logo?.path),
    dataUrl(brand.stamp?.path),
    dataUrl(assessment.clientLogo),
  ]);

  const values: TemplateValues = {
    ...firmValues(),
    report: renderMarkdown(report.markdown),
    logo: imageTag(logoSrc, "Logo", "logo"),
    stamp: imageTag(stampSrc, "Stamp", "stamp"),
    client_logo: imageTag(
      clientLogoSrc,
      `${assessment.profile.organisation} logo`,
      "client-logo",
    ),
    organisation: assessment.profile.organisation || "This organisation",
    reference: assessment.id,
    tier: assessment.score?.tier ?? "",
    score: assessment.score ? String(Math.round(assessment.score.overall)) : "",
    // Issued is the day it went to the client. Before that, the day it was written.
    issued_date: longDate(report.sentAt ?? report.generatedAt),
    expires_date: expires ? longDate(expires) : "one year after it is issued",
    expiry_notice: expired && expires ? expiryNoticeHtml(expires) : "",
  };

  return {
    // The house fonts go on last, so a template the editor stripped the styling
    // out of still reads in the same type as the rest of the site.
    html: withHouseFonts(mergeTemplate(templateHtml, values)),
    templateVersion,
    expired,
    expiresAt: expires?.toISOString() ?? null,
    filename: `${assessment.id}-impact-report.pdf`,
  };
}
