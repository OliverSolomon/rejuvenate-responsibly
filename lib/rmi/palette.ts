/**
 * A company's colours, fitted to the house theme.
 *
 * A firm uploads a logo and wants the dashboard to look like theirs. Taking the
 * logo's colours literally wrecks the design: a bright corporate blue where the
 * deep forest ink belongs makes text unreadable and panels shout. So only the
 * hue is taken from the logo. Every ramp keeps the lightness and the chroma of
 * the house ramp it replaces, which is what holds the contrast, the panels and
 * the quiet greys together whatever colour somebody uploads.
 *
 * Three seeds drive it: the ink (panels and body copy), the accent (buttons and
 * highlights) and the paper (the warm background). The maths is OKLCH, because
 * a hue rotation there keeps the apparent lightness, which is the whole point.
 */

export type PaletteSeeds = {
  /** Panels and body copy. The darkest colour in the logo, usually. */
  ink: string;
  /** Buttons, highlights, the chart accent. */
  accent: string;
  /** The warm paper behind everything. */
  paper: string;
};

export type Palette = {
  seeds: PaletteSeeds;
  /** CSS custom property name to hex, ready to write into a style tag. */
  vars: Record<string, string>;
};

/* -------------------------------------------------------------------------- */
/* colour space                                                               */
/* -------------------------------------------------------------------------- */

type Rgb = { r: number; g: number; b: number };
export type Oklch = { l: number; c: number; h: number };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToRgbRaw({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: toGamma(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: toGamma(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: toGamma(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

const inGamut = ({ r, g, b }: Rgb) =>
  r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && b >= -0.001 && b <= 1.001;

/**
 * OKLCH to a hex that exists.
 *
 * A hue rotation can land outside what a screen can show, and clipping the
 * channels there shifts the lightness, which is the one thing worth keeping. So
 * the chroma comes down until the colour fits, and the lightness survives.
 */
export function oklchToHex(colour: Oklch): string {
  let c = colour.c;
  for (let i = 0; i < 24; i += 1) {
    const rgb = oklchToRgbRaw({ ...colour, c });
    if (inGamut(rgb)) return toHex(rgb);
    c *= 0.92;
  }
  return toHex(oklchToRgbRaw({ ...colour, c: 0 }));
}

/* -------------------------------------------------------------------------- */
/* the house ramps                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The theme as it ships, which is also the template.
 *
 * Each step keeps its own lightness and chroma; only the hue is replaced. The
 * names match the CSS custom properties in globals.css, so what comes out of
 * here can be written straight into a style tag.
 */
export const HOUSE = {
  paper: {
    "bone-50": "#fbfaf6",
    "bone-100": "#f4f2ea",
    "bone-200": "#eae7db",
    "bone-300": "#dcd8c8",
  },
  ink: {
    "forest-950": "#08170f",
    "forest-900": "#0d2418",
    "forest-800": "#143221",
    "forest-700": "#1d4630",
    "forest-600": "#2a6244",
    "forest-500": "#3d8760",
  },
  accent: {
    "lime-50": "#f5fce6",
    "lime-100": "#eff9d9",
    "lime-200": "#ddf3ac",
    "lime-300": "#c4e96f",
    "lime-400": "#aade31",
    "lime-500": "#97d700",
    "lime-600": "#7cb100",
    "lime-700": "#5d8500",
  },
} as const;

export type RampName = keyof typeof HOUSE;

/** How far a ramp's chroma may stray from the house ramp's, as a multiplier. */
const CHROMA_RANGE: Record<RampName, [number, number]> = {
  // The paper is a tint, not a colour. Letting it rise would stain every page.
  paper: [0.4, 1.6],
  // The ink carries body copy. Chroma here is what makes text look dyed.
  ink: [0.5, 1.5],
  // The accent is allowed to be itself, within reason.
  accent: [0.6, 1.4],
};

/**
 * One ramp, rebuilt around a seed colour.
 *
 * The hue is the seed's. The chroma follows the house step, scaled by how
 * saturated the seed is next to the house ramp's middle, and held inside the
 * range above so nothing can get loud enough to break the design.
 */
function ramp(name: RampName, seedHex: string): Record<string, string> {
  const steps = HOUSE[name] as Record<string, string>;
  const names = Object.keys(steps);

  const seed = parseHex(seedHex);
  if (!seed) return { ...steps };
  const seedLch = rgbToOklch(seed);

  // A seed with no colour in it, black, white or grey, has no hue to borrow.
  if (seedLch.c < 0.012) return { ...steps };

  const houseMiddle = rgbToOklch(parseHex(steps[names[Math.floor(names.length / 2)]])!);
  const [low, high] = CHROMA_RANGE[name];
  const wanted = houseMiddle.c > 0 ? seedLch.c / houseMiddle.c : 1;
  const scale = Math.min(high, Math.max(low, wanted));

  const out: Record<string, string> = {};
  for (const step of names) {
    const house = rgbToOklch(parseHex(steps[step])!);
    out[step] = oklchToHex({ l: house.l, c: house.c * scale, h: seedLch.h });
  }
  return out;
}

/** Every custom property a company palette sets, from its three seeds. */
export function paletteFrom(seeds: PaletteSeeds): Palette {
  const vars: Record<string, string> = {};
  for (const [step, hex] of Object.entries(ramp("paper", seeds.paper))) {
    vars[`--color-${step}`] = hex;
  }
  for (const [step, hex] of Object.entries(ramp("ink", seeds.ink))) {
    vars[`--color-${step}`] = hex;
  }
  for (const [step, hex] of Object.entries(ramp("accent", seeds.accent))) {
    vars[`--color-${step}`] = hex;
  }
  return { seeds, vars };
}

/** The style tag's contents. Scoped to the element that carries the class. */
export function paletteCss(palette: Palette, selector = ":root"): string {
  const body = Object.entries(palette.vars)
    .map(([name, hex]) => `${name}:${hex}`)
    .join(";");
  return `${selector}{${body}}`;
}

/** The hexes worth showing as a preview, in the order a person reads them. */
export function paletteSwatches(palette: Palette): { label: string; hex: string }[] {
  return [
    { label: "Paper", hex: palette.vars["--color-bone-100"] },
    { label: "Panels", hex: palette.vars["--color-bone-50"] },
    { label: "Ink", hex: palette.vars["--color-forest-900"] },
    { label: "Ink, lighter", hex: palette.vars["--color-forest-600"] },
    { label: "Accent", hex: palette.vars["--color-lime-500"] },
    { label: "Accent, soft", hex: palette.vars["--color-lime-200"] },
  ];
}

/* -------------------------------------------------------------------------- */
/* reading a logo                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The three seeds a logo suggests.
 *
 * Pixels are bucketed by hue and lightness and the busiest buckets win, which
 * is a crude clustering but the right kind of crude: a logo has a handful of
 * flat colours, not a photograph's gradient. Transparent and near-white pixels
 * are skipped, because almost every logo is mostly background.
 *
 * Takes raw RGBA, so the same function serves a canvas in the browser and a
 * decoded image on a server.
 */
export function seedsFromPixels(pixels: Uint8ClampedArray | Uint8Array): PaletteSeeds {
  type Bucket = { n: number; l: number; c: number; h: number };
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 160) continue;

    const lch = rgbToOklch({
      r: pixels[i] / 255,
      g: pixels[i + 1] / 255,
      b: pixels[i + 2] / 255,
    });

    // Paper and near-black carry no hue worth taking.
    if (lch.l > 0.95 || lch.l < 0.06) continue;

    const key = `${Math.round(lch.h / 15)}:${Math.round(lch.l * 8)}`;
    const found = buckets.get(key);
    if (found) {
      found.n += 1;
      found.l += lch.l;
      found.c += lch.c;
      // Hues average badly across the wrap; the bucket is narrow enough that
      // taking the first one is honest.
      continue;
    }
    buckets.set(key, { n: 1, l: lch.l, c: lch.c, h: lch.h });
  }

  const ranked = [...buckets.values()]
    .map((b) => ({ n: b.n, l: b.l / b.n, c: b.c / b.n, h: b.h }))
    .sort((a, b) => b.n - a.n);

  if (ranked.length === 0) {
    return { ink: HOUSE.ink["forest-900"], accent: HOUSE.accent["lime-500"], paper: HOUSE.paper["bone-100"] };
  }

  const coloured = ranked.filter((b) => b.c > 0.03);
  const dominant = coloured[0] ?? ranked[0];

  // The ink wants the darkest common colour, the accent the most saturated one
  // that is not the ink, and the paper follows the accent's hue very faintly.
  const dark = [...ranked].sort((a, b) => a.l - b.l)[0];
  const vivid = [...(coloured.length ? coloured : ranked)].sort((a, b) => b.c - a.c)[0];

  const ink = oklchToHex({ l: 0.22, c: Math.min(dark.c, 0.06), h: dark.c > 0.02 ? dark.h : dominant.h });
  const accent = oklchToHex({ l: 0.82, c: Math.max(vivid.c, 0.1), h: vivid.h });
  const paper = oklchToHex({ l: 0.97, c: 0.012, h: dominant.h });

  return { ink, accent, paper };
}
