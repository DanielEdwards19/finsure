/**
 * Australian English formatting. Locale is pinned explicitly rather than left to
 * the ambient default, so a value renders identically wherever it is produced.
 */

const AUSTRALIAN_LOCALE = "en-AU";

/** Currency as `$2,420,000`. */
export const money = (amount: number): string =>
  `$${Math.round(amount).toLocaleString(AUSTRALIAN_LOCALE)}`;

/** Abbreviated currency for dense layouts: `$2.4M`, `$780k`. */
export function shortMoney(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `$${millions.toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
  }
  return `$${Math.round(amount / 1_000)}k`;
}

/** Percentage as `84%`. */
export const percent = (fraction: number): string =>
  `${Math.round(fraction * 100)}%`;

/** Dates as `4 August 2026`. */
export const longDate = (date: Date): string =>
  date.toLocaleDateString(AUSTRALIAN_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Pluralise a countable noun: `1 application`, `2 applications`. */
export const plural = (count: number, singular: string, suffix = "s"): string =>
  `${count} ${singular}${count === 1 ? "" : suffix}`;

/**
 * Normalise text for comparison: lower case, punctuation collapsed to spaces.
 * `&` is preserved because it appears in customer names such as
 * "Sarah & Michael Thompson".
 */
export const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
