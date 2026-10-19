// src/resources/logosDevotional.ts — a Logos devotional at a date. A calendar devotional is filed by Logos' DayOfYear data type, so the link is the
// Logos app's own scheme first (`logosres:<id>;ref=DayOfYear.Oct_19`) with the https ref.ly address as the fallback (`?ref=DayOfYear.Oct+19`), built the way
// logos.ts builds a lexicon link: the Resource ID raw in the scheme, URI-encoded in the https path. In a reference a space is `_` in the scheme and `+` in the
// https query (the same rule as the Black page link, docs/resources.md). Logos has no 'today' keyword, so the caller passes the local date.
// UNVERIFIED on a device until the Governor taps one (docs/resources.md 'Devotionals').

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** The link that opens the devotional `resourceId` at `date`'s day of the year (the local month and day). */
export function devotionalLink(resourceId: string, date: Date): { url: string; fallback: string } {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  return {
    url: `logosres:${resourceId};ref=DayOfYear.${month}_${day}`,
    fallback: `https://ref.ly/logosres/${encodeURIComponent(resourceId)}?ref=DayOfYear.${month}+${day}`,
  };
}
