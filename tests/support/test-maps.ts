// tests/support/test-maps.ts — a map source of the tests' own (mw-zbjgn3r.2): Bible Mapper's identity, credit and links (the real bibleMapper's, spread) over a few cards held here,
// so a scenario shows maps with no data file read and no picture fetched. registerTestMaps() puts it in the registry (src/maps/index.ts setMapSources); forgetTestMaps() puts the real one back.
import { setMapSources } from '../../src/maps';
import { period } from '../../src/maps/period';
import { bibleMapper } from '../../src/maps/sources/biblemapper';
import type { MapCard, MapKind, MapRef, MapSource } from '../../src/maps/types';

const card = (id: string, title: string, kind: MapKind, start?: number, end?: number): MapCard => ({
  id,
  source: 'biblemapper',
  title,
  kind,
  ...(start === undefined ? {} : { start }),
  ...(end === undefined ? {} : { end }),
  period: period(start, end),
  article: `https://biblemapper.com/blog/${id.toLowerCase()}/`,
  places: [],
  ...(kind === 'video' ? { video: true } : {}),
});

/** Genesis 10: two events, three regions and a video (six maps and a reading); Romans 8: one region; every other chapter has none. */
export const TEST_CARDS: Record<string, MapCard[]> = {
  'gen.10': [
    card('TowerOfBabel', 'The Tower of Babel', 'event', -2200, -2200),
    card('SodomAndGomorrah', 'Sodom and Gomorrah Are Destroyed', 'event', -2100, -2090),
    card('Mesopotamia', 'Mesopotamia', 'region'),
    card('Ararat', 'Ararat', 'region'),
    card('TableOfNationsHam', 'Table of Nations: Ham’s Descendants', 'region'),
    card('Genesis_10', 'Genesis 10', 'video'),
  ],
  'rom.8': [card('RomanEmpire', 'The Roman Empire', 'region')],
};

export const TEST_IMAGE = 'https://biblemapper.com/blog/images/lo-res/test-map.jpg';

export const testSource: MapSource = {
  ...bibleMapper,
  mapsFor: async (ref: MapRef) => TEST_CARDS[`${ref.book}.${ref.chapter}`] ?? [],
  imageUrl: (_card, size) => (size === 'low' ? TEST_IMAGE : null),
};

export const registerTestMaps = (): void => setMapSources([testSource]);
export const forgetTestMaps = (): void => setMapSources(undefined);
