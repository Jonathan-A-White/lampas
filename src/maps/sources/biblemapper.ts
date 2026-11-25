// src/maps/sources/biblemapper.ts — Bible Mapper (https://biblemapper.com, David P. Barrett) as a MapSource. The maps and the chapters they belong to are
// src/maps/data/biblemapper.json (npm run maps:build, docs/maps.md), read on first use through a dynamic import: its own chunk, never in the precache.
// The pictures are not copied: the card's low-res image is shown from biblemapper.com. The medium and high files are not served under /blog/images; the article has them.
import { bookOf } from '../../data/books';
import type { BibleMapperData, MapCard, MapImageSize, MapRef, MapSource } from '../types';
import { period } from '../period';

const TIMELINE = 'https://biblemapper.com/timeline/';
const IMAGES = 'https://biblemapper.com/blog/images/lo-res/';

let loaded: BibleMapperData | undefined;
let loading: Promise<BibleMapperData> | undefined;

/** The file, loaded once. */
export function loadBibleMapper(): Promise<BibleMapperData> {
  loading ??= import('../data/biblemapper.json').then((module) => {
    loaded = module.default as BibleMapperData;
    return loaded;
  });
  return loading;
}

/** The basenames of a chapter's maps, in the site's order. */
export function mapIdsOf(data: BibleMapperData, book: string, chapter: number): string[] {
  return (data.chapters[book]?.[String(chapter)] ?? []).map((n) => data.ids[n]);
}

/** A map's own year: its start, else its end. */
const yearOf = (map: BibleMapperData['maps'][string] | undefined): number | undefined => map?.start ?? map?.end;

/** How far, in years, a map's date may lie from its book's era and still be the chapter's own time. */
export const ERA_SPAN = 300;

/** The middle of the dates of the book's maps, each map counted once for every chapter that shows it: where the book's maps are mostly set (Isaiah's: 735 BC), or null where none has a date. */
export function bookEra(data: BibleMapperData, book: string): number | null {
  const years = Object.keys(data.chapters[book] ?? {})
    .flatMap((chapter) => mapIdsOf(data, book, Number(chapter)).map((id) => yearOf(data.maps[id])))
    .filter((year): year is number => year !== undefined)
    .sort((a, b) => a - b);
  return years.length === 0 ? null : years[Math.floor((years.length - 1) / 2)];
}

/**
 * The year a chapter is set in (mw-fnvjof.17.313): the date of its maps nearest the book's era. A chapter may name a past event that has a map (Isaiah 1 names Sodom, 2100 BC), and the earliest date
 * would put it there, so where no map of the chapter lies within ERA_SPAN years of the book's era the chapter is set at the era itself. Null for a chapter whose maps have no dates.
 */
export function chapterYear(data: BibleMapperData, book: string, chapter: number): number | null {
  const years = mapIdsOf(data, book, chapter)
    .map((id) => yearOf(data.maps[id]))
    .filter((year): year is number => year !== undefined);
  const era = bookEra(data, book);
  if (years.length === 0 || era === null) return null;
  const near = years.reduce((best, year) => (Math.abs(year - era) < Math.abs(best - era) ? year : best));
  return Math.abs(near - era) <= ERA_SPAN ? near : era;
}

function cardOf(data: BibleMapperData, id: string): MapCard {
  const map = data.maps[id];
  return {
    id,
    source: 'biblemapper',
    title: map.title,
    kind: map.kind,
    ...(map.start === undefined ? {} : { start: map.start }),
    ...(map.end === undefined ? {} : { end: map.end }),
    period: period(map.start, map.end),
    article: map.article,
    places: map.places,
    ...(map.kind === 'video' ? { video: true } : {}),
  };
}

export const bibleMapper: MapSource = {
  id: 'biblemapper',
  name: 'Bible Mapper',
  homepage: 'https://biblemapper.com',
  credit: 'Map by David P. Barrett, biblemapper.com',
  describe: 'The maps of Bible Mapper, shown in the app.',
  default: 'on',
  async mapsFor(ref: MapRef): Promise<MapCard[]> {
    const data = await loadBibleMapper();
    return mapIdsOf(data, ref.book, ref.chapter).map((id) => cardOf(data, id));
  },
  imageUrl(card: MapCard, size: MapImageSize): string | null {
    if (size !== 'low') return null;
    const image = loaded?.maps[card.id]?.image;
    return image ? `${IMAGES}${image.low}` : null;
  },
  timelineCredit: 'Timeline by David P. Barrett, biblemapper.com',
  /** The TimeGlider (https://biblemapper.com/timeline/) takes `?date=` as a year, negative for BC (found in the page's own script, 2026-11-25): a dated map's own start (`card`), else the chapter's own time (chapterYear). */
  timelineUrl(ref: MapRef, card?: MapCard): string | null {
    if (!loaded) return null;
    const year = card?.start ?? chapterYear(loaded, ref.book, ref.chapter);
    return year === null ? null : `${TIMELINE}?date=${year}`;
  },
  allMapsUrl(ref: MapRef): string | null {
    const book = bookOf(ref.book);
    return book ? `https://biblemapper.com/blog/mapfinder/?ref=${encodeURIComponent(`${book.name} ${ref.chapter}`)}` : null;
  },
};
