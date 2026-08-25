/**
 * Lender identity — logos, monogram fallbacks and head-office locations.
 *
 * Real supplied marks live in `public/assets/lenders/<slug>.png`, normalised to
 * a 256px square: filled brand tiles bleed to the edge, marks on transparent or
 * white backgrounds get padding on a white field. A lender with no supplied
 * file falls back to a monogram badge.
 *
 * This module describes lenders; it does not style them. The prototype returned
 * a CSS string from `badgeStyle()`, which put presentation in the domain layer.
 * Rendering now belongs to the lender badge component, which reads these fields.
 */

import type { LatLng } from "./types";

export const LOGO_BASE = "/assets/lenders/";

export interface Lender {
  readonly name: string;
  /** Monogram shown when no logo file is supplied. */
  readonly initials: string;
  /** Tile background behind the logo or monogram. */
  readonly background: string;
  /** Monogram colour. Unused when a logo is present. */
  readonly foreground: string;
  /** Filename within `LOGO_BASE`, or null to use the monogram. */
  readonly logo: string | null;
}

const lender = (
  name: string,
  initials: string,
  background: string,
  foreground: string | null,
  logo: string | null = null,
): Lender => ({
  name,
  initials,
  background,
  foreground: foreground ?? "rgb(255,255,255)",
  logo,
});

export const LENDERS: readonly Lender[] = [
  lender(
    "Commonwealth Bank",
    "CB",
    "rgb(255,255,255)",
    "rgb(20,20,20)",
    "commonwealth-bank.png",
  ),
  lender("Westpac", "W", "rgb(255,255,255)", "rgb(218,32,44)", "westpac.png"),
  lender("ANZ", "ANZ", "rgb(2,58,93)", null, "anz.png"),
  lender("NAB", "NAB", "rgb(255,255,255)", "rgb(200,16,46)", "nab.png"),
  lender(
    "Macquarie Bank",
    "M",
    "rgb(255,255,255)",
    "rgb(35,31,32)",
    "macquarie-bank.png",
  ),
  lender(
    "Suncorp Bank",
    "S",
    "rgb(255,255,255)",
    "rgb(20,20,20)",
    "suncorp-bank.png",
  ),
  lender(
    "Bank of Queensland",
    "BOQ",
    "rgb(255,255,255)",
    "rgb(0,61,124)",
    "bank-of-queensland.png",
  ),
  lender("St.George Bank", "SG", "rgb(166,202,87)", null, "st-george-bank.png"),
  lender("Bankwest", "BW", "rgb(0,30,65)", null, "bankwest.png"),
  lender("Bendigo Bank", "BB", "rgb(135,14,64)", null, "bendigo-bank.png"),
  lender("AMP Bank", "AMP", "rgb(0,30,65)", null, "amp-bank.png"),
  lender("ING", "ING", "rgb(255,255,255)", "rgb(255,98,0)", "ing.png"),
  lender("ubank", "ub", "rgb(0,255,234)", "rgb(20,20,20)", "ubank.png"),
  lender(
    "Great Southern Bank",
    "GS",
    "rgb(0,56,77)",
    null,
    "great-southern-bank.png",
  ),
  lender(
    "Heritage Bank",
    "H",
    "rgb(255,255,255)",
    "rgb(20,20,20)",
    "heritage-bank.png",
  ),
  lender("Firstmac", "FM", "rgb(0,0,0)", null, "firstmac.png"),
  lender("Pepper Money", "PM", "rgb(222,8,36)", null, "pepper-money.png"),
  lender(
    "Liberty Financial",
    "LF",
    "rgb(0,89,169)",
    null,
    "liberty-financial.png",
  ),
  lender("Lender TBC", "?", "rgba(255,255,255,0.08)", "rgb(160,162,166)"),
];

const byName: ReadonlyMap<string, Lender> = new Map(
  LENDERS.map((l) => [l.name.toLowerCase(), l]),
);

export const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Resolve a lender by name. An unrecognised name gets a derived monogram rather
 * than nothing, so a lender added to the workbook still renders.
 */
export function findLender(name: string): Lender {
  const hit = byName.get(name.toLowerCase().trim());
  if (hit) return hit;

  const words = name.split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return lender(
    name || "Unknown",
    initials || "?",
    "rgba(255,255,255,0.08)",
    "rgb(160,162,166)",
  );
}

/** Full path to a lender's logo, or null when the monogram should be used. */
export const logoPathFor = (name: string): string | null => {
  const { logo } = findLender(name);
  return logo ? `${LOGO_BASE}${logo}` : null;
};

/** Head-office location per lender, used for the lender map layer. */
export const LENDER_OFFICES: Readonly<
  Record<string, { readonly address: string } & LatLng>
> = {
  "Commonwealth Bank": {
    address: "Commonwealth Bank Place, 1 Harbour St, Sydney NSW 2000",
    lat: -33.8688,
    lon: 151.202,
  },
  Westpac: {
    address: "275 Kent St, Sydney NSW 2000",
    lat: -33.8663,
    lon: 151.205,
  },
  NAB: {
    address: "395 Bourke St, Melbourne VIC 3000",
    lat: -37.8145,
    lon: 144.9612,
  },
  ANZ: {
    address: "833 Collins St, Docklands VIC 3008",
    lat: -37.821,
    lon: 144.943,
  },
  "Macquarie Bank": {
    address: "50 Martin Pl, Sydney NSW 2000",
    lat: -33.8675,
    lon: 151.21,
  },
  "Suncorp Bank": {
    address: "80 Ann St, Brisbane QLD 4000",
    lat: -27.466,
    lon: 153.025,
  },
  "Bank of Queensland": {
    address: "100 Skyring Tce, Newstead QLD 4006",
    lat: -27.445,
    lon: 153.043,
  },
  Bankwest: {
    address: "300 Murray St, Perth WA 6000",
    lat: -31.952,
    lon: 115.857,
  },
  "St.George Bank": {
    address: "182 George St, Sydney NSW 2000",
    lat: -33.864,
    lon: 151.208,
  },
  "Bendigo Bank": {
    address: "2 Bendigo Bank Pl, Bendigo VIC 3550",
    lat: -36.758,
    lon: 144.279,
  },
  "Heritage Bank": {
    address: "400 Ruthven St, Toowoomba QLD 4350",
    lat: -27.561,
    lon: 151.954,
  },
  "AMP Bank": {
    address: "33 Alfred St, Sydney NSW 2000",
    lat: -33.8615,
    lon: 151.211,
  },
  ING: {
    address: "60 Margaret St, Sydney NSW 2000",
    lat: -33.866,
    lon: 151.207,
  },
  ubank: {
    address: "367 Collins St, Melbourne VIC 3000",
    lat: -37.817,
    lon: 144.96,
  },
  "Pepper Money": {
    address: "177 Pacific Hwy, North Sydney NSW 2060",
    lat: -33.838,
    lon: 151.207,
  },
  "Liberty Financial": {
    address: "201 Kent St, Sydney NSW 2000",
    lat: -33.867,
    lon: 151.204,
  },
  Firstmac: {
    address: "486 Ann St, Brisbane QLD 4000",
    lat: -27.462,
    lon: 153.029,
  },
  "Great Southern Bank": {
    address: "100 Wickham St, Fortitude Valley QLD 4006",
    lat: -27.458,
    lon: 153.033,
  },
};

export const lenderOffice = (name: string) => LENDER_OFFICES[name] ?? null;
