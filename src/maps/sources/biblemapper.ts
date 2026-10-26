// src/maps/sources/biblemapper.ts — Bible Mapper (https://biblemapper.com, David P. Barrett) as a MapSource. The maps and the chapters they belong to are
// src/maps/data/biblemapper.json (npm run maps:build, docs/maps.md), read on first use through a dynamic import: its own chunk, never in the precache.
// The pictures are not copied: the card's low-res image is shown from biblemapper.com. The medium and high files are not served under /blog/images; the article has them.
import type { BibleMapperData, MapCard, MapImageSize, MapRef, MapSource } from '../types';
import { period } from '../period';

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
  async mapsFor(ref: MapRef): Promise<MapCard[]> {
    const data = await loadBibleMapper();
    return mapIdsOf(data, ref.book, ref.chapter).map((id) => cardOf(data, id));
  },
  imageUrl(card: MapCard, size: MapImageSize): string | null {
    if (size !== 'low') return null;
    const image = loaded?.maps[card.id]?.image;
    return image ? `${IMAGES}${image.low}` : null;
  },
};
