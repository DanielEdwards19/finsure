/**
 * Raw token values for the small number of places that cannot use a CSS
 * utility class — Leaflet marker styling, canvas drawing, and inline SVG.
 *
 * These mirror the custom properties in `app/globals.css`. Both are transcribed
 * from `docs/DESIGN.md` §7, which remains the source of truth.
 */

export const color = {
  surface: "rgb(1,28,34)",
  inset: "rgb(7,8,9)",
  hairline: "rgb(43,45,49)",
  glass: "rgba(0,20,25,0.9)",

  primary: "rgb(255,255,255)",
  secondary: "rgb(160,162,166)",
  tertiary: "rgb(130,130,130)",
  accent: "rgb(255,153,0)",
  link: "#8fb0ff",
  linkHover: "#b5caff",
} as const;

/**
 * The four status tones. Every state indicator in the product resolves to one
 * of these — see `docs/DESIGN.md` §5.4 for the field states that map onto them.
 */
export const TONES = ["good", "warn", "bad", "muted"] as const;

export type Tone = (typeof TONES)[number];

export const tone: Record<Tone, { fill: string; text: string }> = {
  good: { fill: "rgba(120,255,190,.14)", text: "rgb(190,255,225)" },
  warn: { fill: "rgba(255,153,0,.16)", text: "rgb(255,214,150)" },
  bad: { fill: "rgba(255,120,110,.16)", text: "rgb(255,190,185)" },
  muted: { fill: "rgba(255,255,255,.06)", text: "rgb(160,162,166)" },
};

export const gradient = {
  page: "linear-gradient(180deg,#002D37 0%,#004E5F 100%)",
  signIn:
    "linear-gradient(163.884deg,rgb(1,29,34) 13.74%,rgb(0,16,19) 98.76%)",
} as const;

/** Viewport width below which the app switches to the mobile sheet layout. */
export const MOBILE_BREAKPOINT = 860;
