// tests/support/test-maps.ts — a map source of the tests' own (mw-zbjgn3r.2): Bible Mapper's identity, credit and links (the real bibleMapper's, spread) over a few cards held here,
// so a scenario shows maps with no data file read and no picture fetched. registerTestMaps() puts it in the registry (src/maps/index.ts setMapSources); forgetTestMaps() puts the real one back.
import { setMapSources } from '../../src/maps';
import { period } from '../../src/maps/period';
import { setPlaceLoader } from '../../src/maps/places';
import { bibleMapper } from '../../src/maps/sources/biblemapper';
import { logosAtlas } from '../../src/maps/sources/logosatlas';
import type { MapCard, MapKind, MapRef, MapSource, Place } from '../../src/maps/types';

const card = (id: string, title: string, kind: MapKind, start?: number, end?: number, places: string[] = []): MapCard => ({
  id,
  source: 'biblemapper',
  title,
  kind,
  ...(start === undefined ? {} : { start }),
  ...(end === undefined ? {} : { end }),
  period: period(start, end),
  article: `https://biblemapper.com/blog/${id.toLowerCase()}/`,
  places,
  ...(kind === 'video' ? { video: true } : {}),
});

/** Genesis 10: two events, three regions and a video (six maps and a reading); Romans 8: one region; every other chapter has none. */
export const TEST_CARDS: Record<string, MapCard[]> = {
  'gen.10': [
    card('TowerOfBabel', 'The Tower of Babel', 'event', -2200, -2200, ['Babel', 'Shinar']),
    card('SodomAndGomorrah', 'Sodom and Gomorrah Are Destroyed', 'event', -2100, -2090),
    card('Mesopotamia', 'Mesopotamia', 'region', undefined, undefined, ['Babylon (OT)', 'Nineveh', 'Ur']),
    card('Ararat', 'Ararat', 'region', undefined, undefined, ['Mount Ararat']),
    card('TableOfNationsHam', 'Table of Nations: Ham’s Descendants', 'region'),
    card('Genesis_10', 'Genesis 10', 'video'),
  ],
  'rom.8': [card('RomanEmpire', 'The Roman Empire', 'region', undefined, undefined, ['Rome', 'Corinth'])],
};

const place = (name: string, verses: [number, number][], ...more: string[]): Place => ({ id: `${name}@test`, name, names: [name, ...more], strongs: [], verses });
/** a place with its position (TIPNR's, from OpenBible.info), as the Logos Atlas centres its map on it */
const at = (name: string, lat: number, lng: number, verses: [number, number][]): Place => ({ ...place(name, verses), lat, lng });

/**
 * The places of the tests' own, by book: Genesis 10:10 names Babylon (also Babel and Shinar) and 10:11 Nineveh; Romans 8:3 names Rome. Genesis 10:19 names Gerar, Admah and Lasha, none of which a test
 * map of Bible Mapper shows, so the sheet of that verse is not ranked (the maps are as Bible Mapper gives them) and the verse 10 and the Romans 8 heading scenarios see the maps that show their places
 * first. Genesis 10:19's and Psalm 147:2's places have a position (the Logos Atlas centres on them): Gerar, Admah and Lasha as TIPNR gives them, Jerusalem and Zion as OpenBible.info does.
 */
export const TEST_PLACES: Record<string, Place[]> = {
  gen: [place('Babylon', [[10, 10]], 'Babel', 'Shinar'), place('Nineveh', [[10, 11]]), at('Gerar', 31.39129, 34.56057, [[10, 19]]), at('Admah', 31.11942, 35.41253, [[10, 19]]), at('Lasha', 31.71815, 35.58483, [[10, 19]])],
  rom: [place('Rome', [[8, 3]])],
  psa: [at('Jerusalem', 31.77765, 35.23548, [[147, 2]]), at('Zion', 31.77, 35.23, [[147, 2]])],
};

export const TEST_IMAGE = 'https://biblemapper.com/blog/images/lo-res/test-map.jpg';

export const testSource: MapSource = {
  ...bibleMapper,
  mapsFor: async (ref: MapRef) => TEST_CARDS[`${ref.book}.${ref.chapter}`] ?? [],
  imageUrl: (_card, size) => (size === 'low' ? TEST_IMAGE : null),
};

/**
 * A link-only source of the tests' own (mw-zbjgn3r.6): no picture, a card that opens elsewhere. Genesis 10 has two (one an app link with its https fallback, one an https address alone),
 * Genesis 11, where Bible Mapper's test cards have none, has one. `needs` is unset: linkSourceNeedingLogos is the same source riding on Logos.
 */
export const LINK_CARDS: Record<string, MapCard[]> = {
  'gen.10': [
    { id: 'AtlasAtShinar', source: 'testlinks', title: 'Test Atlas at Shinar', kind: 'link', period: 'Opens in Logos', article: 'https://atlas.test/shinar', places: [], open: { url: 'logos4:Atlas;id=SHINAR', fallback: 'https://atlas.test/shinar' } },
    { id: 'CommentaryAtGenesis10', source: 'testlinks', title: 'Test Commentary at Genesis 10', kind: 'link', period: 'Opens on the web', article: 'https://atlas.test/commentary', places: [], open: { url: 'https://atlas.test/commentary' } },
  ],
  'gen.11': [{ id: 'AtlasAtBabel', source: 'testlinks', title: 'Test Atlas at Babel', kind: 'link', period: 'Opens on the web', article: 'https://atlas.test/babel', places: [], open: { url: 'https://atlas.test/babel' } }],
};

export const linkSource: MapSource = {
  id: 'testlinks',
  name: 'Test Atlas',
  homepage: 'https://atlas.test',
  credit: 'Pages open on the web',
  describe: 'A link-only atlas of the tests’ own.',
  default: 'on',
  mapsFor: async (ref: MapRef) => LINK_CARDS[`${ref.book}.${ref.chapter}`] ?? [],
  imageUrl: () => null,
};

/** The same link-only source, riding on the Logos study resource: its row is hidden, and it answers nothing, while Logos is Off. */
export const linkSourceNeedingLogos: MapSource = {
  ...linkSource,
  id: 'testlogos',
  name: 'Test Logos Atlas',
  needs: 'logos',
  mapsFor: async (ref: MapRef) => (LINK_CARDS[`${ref.book}.${ref.chapter}`] ?? []).map((c) => ({ ...c, id: `${c.id}-logos`, source: 'testlogos' })),
};

/** Registers the tests' Bible Mapper source (and, with `links`, the link-only one after it; with `logos`, the real Logos Atlas) and their places. */
export const registerTestMaps = ({ links = false, logos = false }: { links?: boolean; logos?: boolean } = {}): void => {
  setMapSources([testSource, ...(links ? [linkSource] : []), ...(logos ? [logosAtlas] : [])]);
  setPlaceLoader(async (book) => TEST_PLACES[book] ?? []);
};
export const forgetTestMaps = (): void => {
  setMapSources(undefined);
  setPlaceLoader(undefined);
};
