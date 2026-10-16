// The memory pictures (public/pictures, mapped by src/data/pictures.ts): every mapped file exists and is a
// small flat SVG on the 96 x 96 grid with no text and no raster, and most of the 63 seed words have one.
// The picture queue (scripts/pictures-queue.ts, `npm run pictures:queue`, mw-5r3p30.383): the New Testament's
// dictionary forms with no picture, commonest first, less the skip list in docs/pictures.md; a slice draws its top.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import {
  entryOf,
  formatQueue,
  pictureQueue,
  readSkipList,
  type FrequencyRow,
} from '../../scripts/pictures-queue';
import { normaliseHeadword } from '../../src/data/lemma';
import { pictureFile, pictureUrl, PICTURES } from '../../src/data/pictures';
import { SEED_WORDS } from '../../src/data/seed-words';

const headwords = SEED_WORDS.map((w) => normaliseHeadword(w.lemma));
const entries = Object.entries(PICTURES);
const frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyRow[];
const ntHeadwords = new Set(frequency.map((e) => normaliseHeadword(e.lemma)));
const picturesDoc = readFileSync('docs/pictures.md', 'utf8');
const skips = readSkipList(picturesDoc);
const queue = pictureQueue(frequency, Object.keys(PICTURES), skips);

describe('the memory pictures', () => {
  it('maps lemmas that are seed headwords or New Testament dictionary forms, each to a file under public/pictures', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [lemma, file] of entries) {
      expect(headwords.includes(lemma) || ntHeadwords.has(lemma), `${lemma} is neither a seed headword nor a dictionary form`).toBe(true);
      expect(entryOf(lemma, frequency), `${lemma} is not found in public/data/frequency.json`).toBeDefined();
      expect(file).toMatch(/^[a-z]+\.svg$/);
      expect(existsSync(`public/pictures/${file}`), `${file} is missing`).toBe(true);
    }
  });

  it('keeps every file in the folder in the map, each used once', () => {
    expect(readdirSync('public/pictures').sort()).toEqual(entries.map(([, f]) => f).sort());
  });

  it.each(entries)('%s: a flat SVG on the 96 x 96 grid with no text and no raster, under 2.5 KB', (_lemma, file) => {
    const path = `public/pictures/${file}`;
    const source = readFileSync(path, 'utf8');
    expect(statSync(path).size).toBeLessThan(2.5 * 1024);
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
    expect(doc.querySelector('parsererror'), 'does not parse as XML').toBeNull();
    const svg = doc.documentElement;
    expect(svg.localName).toBe('svg');
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 96 96');
    expect(doc.getElementsByTagName('text')).toHaveLength(0);
    expect(doc.getElementsByTagName('image')).toHaveLength(0);
    expect(doc.getElementsByTagName('script')).toHaveLength(0);
    expect(source).not.toMatch(/data:|href=/);
  });

  it('gives at least 45 of the 63 seed lemmas a picture', () => {
    expect(headwords).toHaveLength(63);
    expect(headwords.filter((h) => pictureFile(h) !== undefined).length).toBeGreaterThanOrEqual(45);
  });

  it('answers a word with no picture with nothing', () => {
    expect(pictureFile('ἀνάστασις')).toBeUndefined();
    expect(pictureUrl('ἀνάστασις')).toBeUndefined();
    expect(pictureUrl('ἀγαπάω')).toBe('/pictures/agapao.svg');
  });

  it('is precached, so a card shows its picture offline', () => {
    expect(injectManifestOptions.globPatterns).toContain('pictures/*.svg');
  });
});

const row = (strongs: string, lemma: string, count: number, proper = false): FrequencyRow => ({ strongs, lemma, count, chapters: 1, proper });
const sample: FrequencyRow[] = [
  row('G2532', 'καί', 9000),
  row('G846', 'αὐτός', 5000),
  row('G3004', 'λέγω', 2300),
  row('G3739', 'ὅς', 1400),
  row('G1138', 'Δαυείδ, Δαυίδ, Δαβίδ', 59, true),
  row('G2097', 'εὐαγγελίζομαι', 55),
  row('G2250', 'ἡμέρα', 389),
];

describe('the picture queue', () => {
  it('lists the forms with no picture, commonest first, with counts, skipping the skip list', () => {
    const q = pictureQueue(sample, ['καί'], [{ lemma: 'ὅς', reason: 'a relative pronoun' }]);
    expect(q.map((e) => [e.headword, e.count])).toEqual([
      ['αὐτός', 5000],
      ['λέγω', 2300],
      ['ἡμέρα', 389],
      ['Δαυείδ', 59],
      ['εὐαγγελίζομαι', 55],
    ]);
    expect(q[0].rank).toBe(2);
  });

  it('knows a picture keyed by another form of the word: a lexicon lemma, a second spelling, a seed headword', () => {
    // εἶπεν is λέγω's (src/data/lemma.ts), Δαυίδ one of three spellings, εὐαγγελίζω the seed's form of εὐαγγελίζομαι
    const q = pictureQueue(sample, ['εἶπεν', 'Δαυίδ', 'εὐαγγελίζω'], []);
    expect(q.map((e) => e.headword)).toEqual(['καί', 'αὐτός', 'ὅς', 'ἡμέρα']);
  });

  it('prints one line a word: its rank, count, lemma and gloss', () => {
    const text = formatQueue(pictureQueue(sample, ['καί'], []), { ἡμέρα: 'day' });
    const lines = text.trim().split('\n');
    expect(lines.some((l) => /\b5000\b.*αὐτός/.test(l))).toBe(true);
    expect(lines.some((l) => /389.*ἡμέρα.*day/.test(l))).toBe(true);
    expect(lines.findIndex((l) => l.includes('αὐτός'))).toBeLessThan(lines.findIndex((l) => l.includes('ἡμέρα')));
    expect(formatQueue(pictureQueue(sample, ['καί'], []), {}, 2).trim().split('\n').filter((l) => /^\s*\d/.test(l))).toHaveLength(2);
  });

  it('reads the skip list from docs/pictures.md: one dictionary form a line, each with a reason', () => {
    expect(readSkipList('## Nothing honest to draw\n\n- **ὅς** — a relative pronoun\n- **τε** — a light "and"\n\n## Next')).toEqual([
      { lemma: 'ὅς', reason: 'a relative pronoun' },
      { lemma: 'τε', reason: 'a light "and"' },
    ]);
    expect(skips.length).toBeGreaterThan(0);
    for (const skip of skips) {
      expect(skip.reason.length, `${skip.lemma} has no reason`).toBeGreaterThan(10);
      expect(entryOf(skip.lemma, frequency), `${skip.lemma} is not a dictionary form`).toBeDefined();
      expect(pictureFile(skip.lemma), `${skip.lemma} is skipped yet has a picture`).toBeUndefined();
    }
    expect(new Set(skips.map((s) => s.lemma)).size).toBe(skips.length);
  });

  it('runs as npm run pictures:queue, which docs/pictures.md names', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['pictures:queue']).toContain('scripts/pictures-queue.ts');
    expect(picturesDoc).toContain('npm run pictures:queue');
  });

  it('has drawn the slices from the top: no word above the last one drawn is left without a picture or a skip', () => {
    const drawn = entries.map(([lemma]) => lemma).filter((lemma) => !headwords.includes(lemma));
    // slice 1 (mw-5r3p30.383) drew 50 beside the 52 seed pictures
    expect(drawn.length).toBeGreaterThanOrEqual(50);
    const lowest = Math.max(...drawn.map((lemma) => frequency.indexOf(entryOf(lemma, frequency)!) + 1));
    expect(queue[0].rank, `${queue[0].headword} was passed over`).toBeGreaterThan(lowest);
  });
});
