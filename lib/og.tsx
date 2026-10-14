import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

type OgInput = {
  /** Small label above the headline, e.g. the section. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** File under public/images used as the right hand panel. */
  photo?: string;
};

/**
 * One brand card, reused by every section's opengraph-image so a shared link
 * always looks like the same site. Plain system sans: the site fonts are
 * woff2, which the renderer cannot read.
 */
export async function renderOg({
  eyebrow,
  title,
  subtitle,
  photo = "windfarm.jpg",
}: OgInput) {
  let photoSrc: string | null = null;
  try {
    const buf = await readFile(join(process.cwd(), "public", "images", photo));
    const type = photo.endsWith(".png") ? "image/png" : "image/jpeg";
    photoSrc = `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    // The card still reads fine without the photograph.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0d2418",
          color: "#fbfaf6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: photoSrc ? 740 : 1200,
            padding: "64px 56px 56px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 14,
                background: "#c2703f",
              }}
            />
            <div style={{ fontSize: 26, letterSpacing: 2, color: "#dcd8c8" }}>
              {site.name.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 24,
                letterSpacing: 3,
                color: "#3d8760",
                marginBottom: 20,
              }}
            >
              {eyebrow.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: title.length > 40 ? 58 : 72,
                lineHeight: 1.08,
                fontWeight: 700,
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  fontSize: 30,
                  lineHeight: 1.35,
                  marginTop: 24,
                  color: "#dcd8c8",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 24, color: "#9fb8a8" }}>
            {`${site.location} · rejuvenateresponsibly.com`}
          </div>
        </div>

        {photoSrc ? (
          <div style={{ display: "flex", width: 460, height: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc}
              alt=""
              width={460}
              height={630}
              style={{ objectFit: "cover" }}
            />
          </div>
        ) : null}
      </div>
    ),
    ogSize,
  );
}
