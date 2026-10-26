// scripts/maps/biblemapper.ts — the parse of Bible Mapper's two lists (https://biblemapper.com/blog/mapfinder/MapList.json and MapRefList.json) into the compact
// file src/maps/data/biblemapper.json (docs/maps.md). Pure: the download and the writing are scripts/maps-build.ts's.
import { CANON } from '../../src/data/canon';
import type { BibleMapperData, BibleMapperMap, MapKind } from '../../src/maps/types';

interface SourceImage {
  fileLowRes: string;
  fileMediumRes: string;
  fileHighRes: string;
  width: string;
  locationIDs?: Record<string, string>;
}
interface SourceMap {
  start?: string;
  end?: string;
  title: string;
  bloglink: string;
  type: string;
  basename: string;
  fileVideo?: string;
  images?: SourceImage[];
}
interface SourceChapter {
  ChapterNumber: string;
  MapBasenames?: string[];
  AudioVisualReadings?: string[];
}
interface SourceBook {
  BookDisplayName: string;
  MapReferences: SourceChapter[];
}

const KINDS: readonly string[] = ['event', 'region', 'video'];

const year = (text: string | undefined): number | undefined => {
  if (text === undefined || !/^-?\d+$/.test(text.trim())) return undefined;
  return Number.parseInt(text, 10);
};

function compactMap(source: SourceMap): BibleMapperMap {
  if (!KINDS.includes(source.type)) throw new Error(`${source.basename}: the type ${source.type} is not event, region or video`);
  const start = year(source.start);
  const end = year(source.end);
  // the order the fields are written in is the file's order: the file is deterministic
  const ordered: BibleMapperMap = { title: source.title, kind: source.type as MapKind, ...(start === undefined ? {} : { start }), ...(end === undefined ? {} : { end }), article: source.bloglink, places: [] };
  const first = source.images?.[0];
  if (first) ordered.image = { low: first.fileLowRes, medium: first.fileMediumRes, high: first.fileHighRes, width: Math.round(Number.parseFloat(first.width) * 100) / 100 };
  // JavaScript reads the ids of locationIDs in ascending order, which is also the site's alphabetical one
  for (const image of source.images ?? []) for (const name of Object.values(image.locationIDs ?? {})) if (!ordered.places.includes(name)) ordered.places.push(name);
  if (source.fileVideo) ordered.video = source.fileVideo;
  return ordered;
}

/**
 * The compact data of the two lists, and the basenames left out. A basename a chapter names and the map list lacks is left out of the chapter and passed to `warn`;
 * a book that is not one of the 66 (the Apocrypha) is dropped; a chapter left with no map is not written.
 */
export function parseBibleMapperWithDrops(mapListText: string, mapRefListText: string, warn: (line: string) => void = () => undefined): { data: BibleMapperData; dropped: string[] } {
  const list = JSON.parse(mapListText) as { LastUpdated?: string; Maps: SourceMap[] };
  const refs = JSON.parse(mapRefListText) as { Books: SourceBook[] };

  const maps: Record<string, BibleMapperMap> = {};
  const sorted = [...list.Maps].sort((a, b) => (a.basename < b.basename ? -1 : a.basename > b.basename ? 1 : 0));
  for (const source of sorted) maps[source.basename] = compactMap(source);
  const ids = sorted.map((source) => source.basename);

  const chapters: Record<string, Record<string, number[]>> = {};
  const dropped: string[] = [];
  for (const book of CANON) {
    const source = refs.Books.find((b) => b.BookDisplayName === book.name);
    if (!source) continue;
    for (const chapter of [...source.MapReferences].sort((a, b) => Number(a.ChapterNumber) - Number(b.ChapterNumber))) {
      const numbers: number[] = [];
      for (const id of [...(chapter.MapBasenames ?? []), ...(chapter.AudioVisualReadings ?? [])]) {
        if (!(id in maps)) {
          warn(`warning: ${source.BookDisplayName} ${chapter.ChapterNumber} names ${id}, which MapList.json does not have; left out`);
          if (!dropped.includes(id)) dropped.push(id);
        } else if (!numbers.includes(ids.indexOf(id))) numbers.push(ids.indexOf(id));
      }
      if (numbers.length) (chapters[book.code] ??= {})[String(Number(chapter.ChapterNumber))] = numbers;
    }
  }
  return { data: { updated: list.LastUpdated ?? '', ids, maps, chapters }, dropped };
}

export function parseBibleMapper(mapListText: string, mapRefListText: string, warn?: (line: string) => void): BibleMapperData {
  return parseBibleMapperWithDrops(mapListText, mapRefListText, warn).data;
}
