// The memory pictures (public/pictures, mapped by src/data/pictures.ts): every mapped file exists and is a
// small flat SVG on the 96 x 96 grid with no text and no raster, and most of the 63 seed words have one.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import { normaliseHeadword } from '../../src/data/lemma';
import { pictureFile, pictureUrl, PICTURES } from '../../src/data/pictures';
import { SEED_WORDS } from '../../src/data/seed-words';

const headwords = SEED_WORDS.map((w) => normaliseHeadword(w.lemma));
const entries = Object.entries(PICTURES);

describe('the memory pictures', () => {
  it('maps lemmas that are seed headwords, each to a file under public/pictures', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const [lemma, file] of entries) {
      expect(headwords, `${lemma} is not a seed headword`).toContain(lemma);
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
