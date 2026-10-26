// scripts/maps-build.ts — npm run maps:build
// Compacts Bible Mapper's two lists (MapList.json, the maps; MapRefList.json, the maps of each chapter; https://biblemapper.com, free for non-commercial use with a credit
// and a link back, docs/maps.md) into src/maps/data/biblemapper.json. The downloads go to data/raw/biblemapper (git-ignored, skipped when present); the JSON is committed.
// A second run on an unchanged download writes nothing.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeIfChanged } from './data/chapterWriter';
import { parseBibleMapperWithDrops } from './maps/biblemapper';

export const MAP_LIST_URL = 'https://biblemapper.com/blog/mapfinder/MapList.json';
export const MAP_REF_LIST_URL = 'https://biblemapper.com/blog/mapfinder/MapRefList.json';
const MAP_LIST_FILE = 'MapList.json';
const MAP_REF_LIST_FILE = 'MapRefList.json';
/** The site answers a fetch that names no client with a refusal. */
const USER_AGENT = 'Mozilla/5.0 (compatible; lampas-maps-build; +https://lampas.allmymind.org)';

export async function downloadTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

export interface MapsBuildOptions {
  rawDir: string;
  outFile: string;
  /** fetches url into dest; the default uses fetch with a User-Agent */
  download?: (url: string, dest: string) => Promise<void>;
  log?: (line: string) => void;
}

export interface MapsBuildResult {
  written: boolean;
  bytes: number;
  maps: number;
  byKind: Record<string, number>;
  /** the chapters of the 66 books that have a map */
  chaptersWithMaps: number;
  /** the basenames a chapter named and the map list lacks */
  dropped: string[];
}

export async function runMapsBuild(options: MapsBuildOptions): Promise<MapsBuildResult> {
  const { rawDir, outFile, download = downloadTo, log = () => undefined } = options;
  const listPath = join(rawDir, MAP_LIST_FILE);
  const refPath = join(rawDir, MAP_REF_LIST_FILE);
  for (const [url, path] of [[MAP_LIST_URL, listPath], [MAP_REF_LIST_URL, refPath]] as const) {
    if (existsSync(path)) continue;
    log(`downloading ${url}`);
    await download(url, path);
  }
  const { data, dropped } = parseBibleMapperWithDrops(readFileSync(listPath, 'utf8'), readFileSync(refPath, 'utf8'), log);
  const text = JSON.stringify(data);
  const written = writeIfChanged(outFile, text);
  const byKind: Record<string, number> = {};
  for (const map of Object.values(data.maps)) byKind[map.kind] = (byKind[map.kind] ?? 0) + 1;
  const chaptersWithMaps = Object.values(data.chapters).reduce((n, book) => n + Object.keys(book).length, 0);
  const bytes = Buffer.byteLength(text);
  log(`${Object.keys(data.maps).length} maps (${Object.entries(byKind).map(([k, n]) => `${n} ${k}`).join(', ')}), ${chaptersWithMaps} chapters with maps, ${written ? 'written' : 'unchanged'}, ${(bytes / 1024).toFixed(1)} KB`);
  return { written, bytes, maps: Object.keys(data.maps).length, byKind, chaptersWithMaps, dropped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runMapsBuild({ rawDir: 'data/raw/biblemapper', outFile: 'src/maps/data/biblemapper.json', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
