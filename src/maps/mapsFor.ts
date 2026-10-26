// src/maps/mapsFor.ts — the maps of a chapter from a list of sources: each source's cards in its own order, the sources in the list's order.
import { matchedPlaceNames } from './placeNames';
import type { MapCard, MapRef, MapSource, Place } from './types';

export async function mapsForSources(sources: readonly MapSource[], ref: MapRef): Promise<MapCard[]> {
  const answers = await Promise.all(sources.map((source) => source.mapsFor(ref)));
  return answers.flat();
}

/**
 * The chapter's cards ranked for a passage: those that show a place of it first (the most places first, ties in the source's order), each with `matched`, the names of the passage's
 * places it shows; the rest after them in their own order. `passage` is undefined for a whole chapter: the order is unchanged and every `matched` is empty.
 */
export function rankByPlaces(cards: readonly MapCard[], passage: readonly Place[] | undefined): MapCard[] {
  const ranked = cards.map((card, index) => ({ card: { ...card, matched: passage ? matchedPlaceNames(card.places, passage) : [] }, index }));
  return ranked.sort((a, b) => b.card.matched.length - a.card.matched.length || a.index - b.index).map((r) => r.card);
}

/** `rankByPlaces` within each source, the sources in the order they first appear: a link-only source's cards are views, not maps that depict the places, and must not outrank a map's. */
export function rankPerSource(cards: readonly MapCard[], passage: readonly Place[] | undefined): MapCard[] {
  const order = [...new Set(cards.map((card) => card.source))];
  return order.flatMap((source) => rankByPlaces(cards.filter((card) => card.source === source), passage));
}
