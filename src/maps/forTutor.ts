// src/maps/forTutor.ts — the maps as the Bible talk's request tells the tutor of them (mw-zbjgn3r.4, `maps`): the cards mapsFor answers for the chapter of the passage it holds, each as
// {id, title, period, places}, at most MAX_TUTOR_MAPS. `places` are the names of the card that the held verse or range speaks, in the order it speaks them (Bible Mapper marks a doubtful one with a `?`, a note or
// a bracket, which are dropped), empty for a chapter; the cards that speak the passage come first. A video and a link-only source's row are left out: a map link opens a map in the app, and those open in the browser or in Logos.
import type { MapCard } from './types';

/** The most maps a request lists: the tutor links one by its id, the app draws it only if the chapter has it. */
export const MAX_TUTOR_MAPS = 12;

/** One map as the tutor is told of it: the `id` is what a `map` link names, exactly as given. */
export interface TutorMap {
  id: string;
  title: string;
  period: string;
  places: string[];
}

/** A place as the passage would write it: 'Sodom?' -> 'Sodom', 'Jericho (OT)' -> 'Jericho', 'Bethel [al-Bira]' -> 'Bethel'. */
const nameOf = (place: string): string => place.replace(/\s*[([].*$/, '').replace(/\?+/g, '').trim();

const escape = (name: string): string => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The names of the card's places that `text` speaks, once each, in the order the text speaks them. */
function matched(card: MapCard, text: string): string[] {
  const names = [...new Set(card.places.map(nameOf).filter((n) => n.length > 0))];
  const at = (name: string): number => text.search(new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, 'iu'));
  return names
    .map((name) => ({ name, at: at(name) }))
    .filter((found) => found.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((found) => found.name);
}

/** The maps to tell the tutor of, from the chapter's cards. `text` is the held verse's or range's English; leave it out for a chapter, whose maps name no place. */
export function mapsForTutor(cards: readonly MapCard[], text?: string): TutorMap[] {
  const maps = cards
    .filter((card) => card.kind !== 'video' && card.open === undefined)
    .map((card) => ({ id: card.id, title: card.title, period: card.period, places: text === undefined ? [] : matched(card, text) }));
  // a stable sort: the cards that speak the passage most first, the rest in the order the source gave them
  return maps.map((map, i) => ({ map, i })).sort((a, b) => b.map.places.length - a.map.places.length || a.i - b.i).slice(0, MAX_TUTOR_MAPS).map(({ map }) => map);
}
