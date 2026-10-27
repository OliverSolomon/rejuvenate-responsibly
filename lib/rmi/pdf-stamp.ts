import "server-only";

import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/**
 * Marks an issued PDF as expired on its way out.
 *
 * The file itself is never changed. A report is valid for a year from the day
 * it was sent, and the document that was issued is the document the client
 * should be able to keep downloading, so the stamp is added to a copy as it is
 * served rather than by rewriting what is stored.
 */

const BAND_HEIGHT = 26;

export async function stampExpired(
  bytes: Uint8Array,
  expiredOn: Date,
): Promise<Uint8Array> {
  const when = expiredOn.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const note = await pdf.embedFont(StandardFonts.Helvetica);

  const heading = "EXPIRED";
  const detail = `This report stopped being current on ${when}.`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    // A band across the top, so it is unmissable however the page is skimmed.
    page.drawRectangle({
      x: 0,
      y: height - BAND_HEIGHT,
      width,
      height: BAND_HEIGHT,
      color: rgb(0.706, 0.325, 0.035),
    });
    page.drawText(heading, {
      x: 18,
      y: height - 18,
      size: 11,
      font,
      color: rgb(1, 1, 1),
    });
    page.drawText(detail, {
      x: 18 + font.widthOfTextAtSize(heading, 11) + 12,
      y: height - 17.5,
      size: 9,
      font: note,
      color: rgb(1, 1, 1),
    });

    // And once across the middle, faint, for a page read on its own.
    const watermark = "EXPIRED";
    const size = Math.min(width, height) * 0.22;
    page.drawText(watermark, {
      x: width / 2 - font.widthOfTextAtSize(watermark, size) / 2,
      y: height / 2 - size / 2,
      size,
      font,
      color: rgb(0.706, 0.325, 0.035),
      opacity: 0.1,
      rotate: degrees(28),
    });
  }

  return pdf.save();
}
