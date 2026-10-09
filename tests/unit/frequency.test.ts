// src/data/frequency.ts on the committed public/data/frequency.json (docs/data.md), and the build's counting on the small slices.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildData, isProperNounWord, parseLexicon } from '../../scripts/data-build';
import { forgetFrequency, isProperNoun, loadFrequency, rankOf, type FrequencyEntry } from '../../src/data/frequency';

const file = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyEntry[];

beforeEach(() => {
  forgetFrequency();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) !== '/data/frequency.json') return new Response('not found', { status: 404 });
      return new Response(JSON.stringify(file), { status: 200 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('the committed frequency table', () => {
  it('has καί first and ἐν in the top five', () => {
    expect(file[0].strongs).toBe('G2532');
    expect(file[0].lemma).toBe('καί');
    expect(file.slice(0, 5).map((e) => e.strongs)).toContain('G1722');
  });

  it('gives every entry strongs, lemma, count, chapters and proper, sorted by count descending', () => {
    expect(file.length).toBeGreaterThan(5000);
    for (const e of file) {
      expect(e.strongs).toMatch(/^G[1-9]\d*$/);
      expect(e.lemma.length).toBeGreaterThan(0);
      expect(e.lemma).toBe(e.lemma.normalize('NFC'));
      expect(e.count).toBeGreaterThanOrEqual(1);
      expect(e.chapters).toBeGreaterThanOrEqual(1);
      expect(e.chapters).toBeLessThanOrEqual(Math.min(e.count, 260));
      expect(typeof e.proper).toBe('boolean');
    }
    for (let i = 1; i < file.length; i++) expect(file[i - 1].count).toBeGreaterThanOrEqual(file[i].count);
    expect(new Set(file.map((e) => e.strongs)).size).toBe(file.length);
  });

  it('counts every Greek word of the text once but the article, which it leaves out', () => {
    const total = file.reduce((n, e) => n + e.count, 0);
    expect(total).toBeGreaterThan(115_000);
    expect(total).toBeLessThan(125_000);
    expect(file.some((e) => e.strongs === 'G3588')).toBe(false);
  });
});

describe('loadFrequency, rankOf and isProperNoun', () => {
  it('fetches the table once and shares it', async () => {
    const [a, b] = await Promise.all([loadFrequency(), loadFrequency()]);
    expect(a).toBe(b);
    await loadFrequency();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('ranks from 1 by count, and gives undefined for a number the text lacks', async () => {
    expect(await rankOf('G2532')).toBe(1);
    expect(await rankOf('G1722')).toBeLessThanOrEqual(5);
    expect(await rankOf('G3588')).toBeUndefined(); // the article is left out
    expect(await rankOf('G999999')).toBeUndefined();
    const last = file[file.length - 1];
    expect(await rankOf(last.strongs)).toBe(file.length);
  });

  it('knows names from common words', async () => {
    expect(await isProperNoun('G2424')).toBe(true); // Ἰησοῦς
    expect(await isProperNoun('G5547')).toBe(true); // Χριστός
    expect(await isProperNoun('G3475')).toBe(true); // Μωϋσῆς
    expect(await isProperNoun('G11')).toBe(true); // Ἀβραάμ, indeclinable
    expect(await isProperNoun('G2316')).toBe(false); // θεός
    expect(await isProperNoun('G2532')).toBe(false); // καί
    expect(await isProperNoun('G1473')).toBe(false); // ἐγώ
    expect(await isProperNoun('G999999')).toBe(false);
  });

  it('does not keep a failed load', async () => {
    forgetFrequency();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 500 })));
    await expect(loadFrequency()).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(file), { status: 200 })));
    expect((await loadFrequency()).length).toBe(file.length);
  });
});

describe('the build counts a slice', () => {
  const built = buildData(readFileSync('tests/fixtures/data/msb-slice.tsv', 'utf8'), parseLexicon(readFileSync('tests/fixtures/data/tbesg-slice.txt', 'utf8')));

  it('counts each Strong number over every chapter, with the chapters it appears in', () => {
    const words = built.chapters.flatMap((c) => c.chapter.verses.flatMap((v) => v.g.map((w) => w.s))).filter((s) => s !== 'G3588');
    expect(built.frequency.reduce((n, e) => n + e.count, 0)).toBe(words.length);
    for (const e of built.frequency) {
      expect(e.count).toBe(words.filter((s) => s === e.strongs).length);
      const inChapters = built.chapters.filter((c) => c.chapter.verses.some((v) => v.g.some((w) => w.s === e.strongs))).length;
      expect(e.chapters).toBe(inChapters);
    }
  });

  it('marks a name and no other word', () => {
    const proper = (s: string) => built.frequency.find((e) => e.strongs === s)?.proper;
    expect(proper('G2424')).toBe(true); // Ἰησοῦς, in the slice's John 1 and Matthew 1
    expect(proper('G2316')).toBe(false); // θεός
    expect(isProperNounWord('Ἀβραάμ', ['N-PRI'])).toBe(true);
    expect(isProperNounWord('Παῦλος', ['N-NSM'])).toBe(true);
    expect(isProperNounWord('Παῦλος', ['A-NSM'])).toBe(false);
    expect(isProperNounWord('θεός', ['N-NSM'])).toBe(false);
  });

  it('sorts by count descending, then by Strong number', () => {
    for (let i = 1; i < built.frequency.length; i++) {
      const [a, b] = [built.frequency[i - 1], built.frequency[i]];
      expect(a.count > b.count || (a.count === b.count && Number(a.strongs.slice(1)) < Number(b.strongs.slice(1)))).toBe(true);
    }
  });
});
