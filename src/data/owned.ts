// src/data/owned.ts — which Logos resources Lampas may offer (mw-qtu3zvz.94): one he says he owns in his Library import (the kept list, `exportRows`), or one on FREE_LOGOS, the resources Logos
// gives every new user. Pure: the repository (ownedResources, src/data/repositories/library.ts) reads the import and hands the set here; with no import kept the set is empty, so only a free resource passes.

/** A resource Logos gives new users free (Logos Basic); each carries the page that says so. */
export interface FreeLogos {
  /** the Logos Resource ID, as the catalogue and an export hold it */
  resource: string;
  title: string;
  /** the address of the page that names it as free */
  source: string;
}

/**
 * The free Logos starter resources, by Resource ID. An entry is added only with the address of a Logos page that names the resource as free; nothing is guessed.
 * Searched 2026-11-12: logos.com/basic and the Logos Basic product pages say "25+" / "40+" resources and name none with its Resource ID, and the Logos forum thread that names the Faithlife Study Bible,
 * Easton's Bible Dictionary and Confessions of St. Augustine (https://community.logos.com/discussion/comment/1326733) gives no Resource ID and answers 403 to a fetch; none of the three is a sermon archive
 * and none is in the catalogue. So the list is empty until a Resource ID is read from a page that says it is free.
 */
export const FREE_LOGOS: readonly FreeLogos[] = [];

/** The Resource IDs the import says he owns. */
export type Owned = ReadonlySet<string>;

export const isFreeLogos = (resource: string): boolean => FREE_LOGOS.some((f) => f.resource === resource);

/** Whether a Logos resource may be offered: it is free, or his import says he owns it. */
export const isOffered = (resource: string, owned: Owned): boolean => isFreeLogos(resource) || owned.has(resource);

/** The books of `entries` that may be offered (isOffered): the Library lists, counts and ticks no others. */
export const offeredEntries = <T extends { resource: string }>(entries: readonly T[], owned: Owned): T[] => entries.filter((entry) => isOffered(entry.resource, owned));

/** The Resource ID a Logos address opens: `https://ref.ly/logosres/LLS:GRGLRSRMNRCH?art=…` or `logosres:LLS:GRGLRSRMNRCH;ref=…`; undefined for any other address. */
export function logosResourceOf(url: string): string | undefined {
  const found = /^(?:https:\/\/ref\.ly\/logosres\/|logosres:)([^?;#]+)/.exec(url);
  if (!found) return undefined;
  try {
    return decodeURIComponent(found[1]);
  } catch {
    return found[1];
  }
}

/** Whether a sermon opened at `url` may be offered: an address that is not into Logos always may; one into Logos only for a resource that is offered. */
export function addressOffered(url: string, owned: Owned): boolean {
  const resource = logosResourceOf(url);
  return resource === undefined || isOffered(resource, owned);
}
