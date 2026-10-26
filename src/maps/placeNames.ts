// src/maps/placeNames.ts — when a place a map names is a place of a verse (docs/maps.md 'Which maps are for this verse'). Bible Mapper writes 'Bethel [al-Bira]', 'Jericho (OT)',
// 'Mount Hermon', 'Sea of Galilee'; TIPNR writes Bethel, Jericho, Hermon, Galilee. A name is compared in two steps: the whole name, normalised, and only where that finds no place
// of the verse, the name without its head word ('mount', 'sea of', 'river'…) or a trailing 'river'.
import type { Place } from './types';

/** Lower case, accents stripped, a bracketed or parenthesised suffix dropped ('Bethel [al-Bira]' → 'bethel'), a trailing '?' dropped, a hyphen or a run of spaces one space. */
export function normalPlaceName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*[[(].*$/, '')
    .replace(/[’`]/g, "'")
    .replace(/\?+\s*$/, '')
    .replace(/[-\s]+/g, ' ')
    .trim();
}

/** The words that name the kind of place, not the place: 'mount hermon' is hermon, 'sea of galilee' is galilee, 'jordan river' is jordan. */
const HEADS = /^(?:mount|mt\.?|mountains? of|sea of|lake|river|brook|valley of|wilderness of|land of|city of|plain of|wadi)\s+/;
const TAIL = /\s+river$/;

/** The normalised name without its head word ('sea of galilee' → 'galilee') or a trailing 'river'; the name itself where it has none. */
export function loosePlaceName(name: string): string {
  const normal = normalPlaceName(name);
  const loose = normal.replace(HEADS, '').replace(TAIL, '');
  return loose === '' ? normal : loose;
}

/**
 * The names of the places of a passage (in the passage's order, each once) that a map's place names show. A map place is first compared whole with the names of each passage
 * place; where that finds none, by its loose form ('Sea of Galilee' → Galilee, only when nothing is named Sea of Galilee), also against the loose forms of the passage's names.
 */
export function matchedPlaceNames(mapPlaces: readonly string[], passage: readonly Place[]): string[] {
  if (mapPlaces.length === 0 || passage.length === 0) return [];
  const strict = passage.map((place) => new Set(place.names.length > 0 ? place.names.map(normalPlaceName) : [normalPlaceName(place.name)]));
  const loose = passage.map((place) => new Set([place.name, ...place.names].map(loosePlaceName)));
  const hit = new Set<number>();
  for (const mapPlace of mapPlaces) {
    const whole = normalPlaceName(mapPlace);
    if (whole === '') continue;
    const exact = strict.flatMap((names, i) => (names.has(whole) ? [i] : []));
    if (exact.length > 0) {
      exact.forEach((i) => hit.add(i));
      continue;
    }
    const key = loosePlaceName(mapPlace);
    loose.forEach((names, i) => {
      if (names.has(key)) hit.add(i);
    });
  }
  return [...new Set(passage.filter((_, i) => hit.has(i)).map((place) => place.name))];
}
