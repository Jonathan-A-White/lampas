// tests/unit/memorize-target.test.ts — the text a verse is memorized in (mw-fu7dqf.1): a per-token {text, lang} sequence for English, Greek and the
// weave of the moment, for a verse or a range from a canonical reference; an Old Testament reference has no text.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { memorizeTarget, tokensOf } from '../../src/memorize/target';
import { versesOf } from '../../src/memorize/refs';
import { stubChapterFetch } from '../support/chapter-fetch';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const v28 = rom8.verses.find((v) => v.n === 28)!;
const texts = (tokens: { text: string }[]): string => tokens.map((t) => t.text).join(' ');

const ENGLISH =
  'And we know that all things work together for the good of those who love Him, who are called according to His purpose.';
const GREEK = v28.g.map((w) => w.t).join(' ');
const weaving = (extra: Record<string, unknown>) => ({
  view: 'english' as const,
  weaveShown: true,
  weaveGrammar: 'any' as const,
  levels: new Map(),
  ...extra,
});

beforeEach(() => {
  stubChapterFetch();
});

describe('tokensOf', () => {
  it('English: every word of every chunk in English order, all en', () => {
    const tokens = tokensOf(v28, 'en');
    expect(texts(tokens)).toBe(ENGLISH);
    expect(new Set(tokens.map((t) => t.lang))).toEqual(new Set(['en']));
    expect(tokens[0]).toEqual({ text: 'And', lang: 'en', chunk: 0 });
    expect(tokens[1]).toEqual({ text: 'we', lang: 'en', chunk: 1 });
  });

  it('Greek: every Greek word in Greek order, all el, each with its place in the verse', () => {
    const tokens = tokensOf(v28, 'el');
    expect(texts(tokens)).toBe(GREEK);
    expect(tokens.map((t) => t.lang)).toEqual(tokens.map(() => 'el'));
    expect(tokens.map((t) => t.word)).toEqual(v28.g.map((_, i) => i));
    expect(tokens[0]).toMatchObject({ text: 'Οἴδαμεν', chunk: 1, word: 0 });
    // τὸν has no English: it belongs to no chunk
    expect(tokens[5]).toMatchObject({ text: 'τὸν', chunk: -1, word: 5 });
  });
});

describe('the weave of the moment', () => {
  it('with οἴδαμεν solid, its Greek stands between English tokens in the drawn order', async () => {
    const target = await memorizeTarget('Rom.8.28', 'weave', weaving({ weave: 'solid', weaveOrder: 'english', solid: new Set(['εἴδω']) }));
    if (!target || target.ot) throw new Error('no target');
    expect(texts(target.tokens)).toBe(ENGLISH.replace('we know', 'Οἴδαμεν'));
    expect(target.tokens.map((t) => t.lang).join(' ')).toBe(
      ['en', 'el', ...Array(ENGLISH.split(' ').length - 3).fill('en')].join(' '),
    );
    expect(target.tokens[1]).toMatchObject({ text: 'Οἴδαμεν', lang: 'el', chunk: 1, word: 0, verse: 28 });
  });

  it('with the Greek order the tokens follow chunkOrder and a moved closing mark sits where chunkText puts it', async () => {
    const solid = new Set(['εἴδω']);
    const target = await memorizeTarget('Rom.8.28', 'weave', weaving({ weave: 'solid', weaveOrder: 'greek', solid }));
    if (!target || target.ot) throw new Error('no target');
    // Greek order: we know (Οἴδαμεν), And, that, of those who, love, Him, ...; the closing full stop moves from 'His purpose.' to the last drawn chunk, 'are.'
    expect(texts(target.tokens)).toBe(
      'Οἴδαμεν And that of those who love Him, all things work together for the good who according to His purpose called are.',
    );

    // 1 Timothy 4:2: the verse's full stop moves to the last drawn chunk, as the Reader draws it
    const moved = await memorizeTarget('1Tim.4.2', 'weave', weaving({ weave: 'solid', weaveOrder: 'greek', solid: new Set() }));
    if (!moved || moved.ot) throw new Error('no target');
    expect(texts(moved.tokens)).toBe('influenced by the hypocrisy of liars, are seared with a hot iron whose consciences.');
  });

  it('a learning word is a Greek token under Solid and learning, and an English one under Solid', async () => {
    const settings = { weaveOrder: 'english' as const, solid: new Set<string>(), learning: new Set(['εἴδω']) };
    const learning = await memorizeTarget('Rom.8.28', 'weave', weaving({ ...settings, weave: 'solid+learning' }));
    const solidOnly = await memorizeTarget('Rom.8.28', 'weave', weaving({ ...settings, weave: 'solid' }));
    if (!learning || learning.ot || !solidOnly || solidOnly.ot) throw new Error('no target');
    expect(learning.tokens[1]).toMatchObject({ text: 'Οἴδαμεν', lang: 'el' });
    expect(solidOnly.tokens[1]).toMatchObject({ text: 'we', lang: 'en' });
    expect(texts(solidOnly.tokens)).toBe(ENGLISH);
  });

  it('follows him: the same verse woven again with a word more solid has that word in Greek (nothing is pinned)', async () => {
    const before = await memorizeTarget('Rom.8.28', 'weave', weaving({ weave: 'solid', solid: new Set(['εἴδω']) }));
    const after = await memorizeTarget('Rom.8.28', 'weave', weaving({ weave: 'solid', solid: new Set(['εἴδω', 'ἀγαπάω']) }));
    if (!before || before.ot || !after || after.ot) throw new Error('no target');
    expect(before.tokens.filter((t) => t.lang === 'el').map((t) => t.text)).toEqual(['Οἴδαμεν']);
    expect(after.tokens.filter((t) => t.lang === 'el').map((t) => t.text)).toEqual(['Οἴδαμεν', 'ἀγαπῶσιν']);
  });

  it('with the weave off, or no settings, every token is English', async () => {
    const off = await memorizeTarget('Rom.8.28', 'weave', weaving({ weave: 'off', solid: new Set(['εἴδω']) }));
    const none = await memorizeTarget('Rom.8.28', 'weave');
    for (const target of [off, none]) {
      if (!target || target.ot) throw new Error('no target');
      expect(texts(target.tokens)).toBe(ENGLISH);
      expect(target.tokens.every((t) => t.lang === 'en')).toBe(true);
    }
  });
});

describe('references', () => {
  it('Rom.8.28-29 gives both verses in order, each token with its verse number', async () => {
    const target = await memorizeTarget('Rom.8.28-29', 'en');
    if (!target || target.ot) throw new Error('no target');
    expect(target.heading).toBe('Romans 8:28-29');
    const verses = [...new Set(target.tokens.map((t) => t.verse))];
    expect(verses).toEqual([28, 29]);
    expect(texts(target.tokens.filter((t) => t.verse === 28))).toBe(ENGLISH);
    expect(texts(target.tokens.filter((t) => t.verse === 29)).startsWith('For those God foreknew')).toBe(true);
  });

  it('a single verse carries its number', async () => {
    const target = await memorizeTarget('Rom.8.28', 'el');
    if (!target || target.ot) throw new Error('no target');
    expect(target.heading).toBe('Romans 8:28');
    expect(target.tokens.every((t) => t.verse === 28)).toBe(true);
    expect(texts(target.tokens)).toBe(GREEK);
  });

  it('a range is each verse its own Verse, never a passage', async () => {
    const found = await versesOf('Rom.8.28-29');
    if (!found || found.ot) throw new Error('no verses');
    expect(found.verses.map((v) => v.n)).toEqual([28, 29]);
    expect(found.verses.every((v) => v.to === undefined)).toBe(true);
    expect(found.book).toBe('rom');
    expect(found.chapter).toBe(8);
  });

  it('Ps.62.1-2 is Old Testament: no verses, ot: true, and no text', async () => {
    expect(await versesOf('Ps.62.1-2')).toEqual({ ot: true, heading: 'Psalm 62:1-2' });
    expect(await memorizeTarget('Ps.62.1-2', 'en')).toEqual({ ot: true, heading: 'Psalm 62:1-2' });
    expect(await memorizeTarget('Gen.1.1', 'weave')).toMatchObject({ ot: true });
  });

  it('Rom.8 (a chapter alone) gives verse 1 only, as the passage player does', async () => {
    const found = await versesOf('Rom.8');
    if (!found || found.ot) throw new Error('no verses');
    expect(found.verses.map((v) => v.n)).toEqual([1]);
    expect(found.heading).toBe('Romans 8:1');
  });

  it('a malformed reference, an unknown book, a chapter or verse that is not there gives null', async () => {
    for (const bad of ['', 'Rom', 'Rom.x', 'Zzz.1.1', 'Rom.99.1', 'Rom.8.99', 'Rom.8.0', 'Romans 8:28']) {
      expect(await versesOf(bad), bad).toBeNull();
      expect(await memorizeTarget(bad, 'en'), bad).toBeNull();
    }
  });

  it('a range that runs past the chapter keeps the verses that are there', async () => {
    const found = await versesOf('Jude.1.24-30');
    if (!found || found.ot) throw new Error('no verses');
    expect(found.verses.map((v) => v.n)).toEqual([24, 25]);
  });
});

vi.setConfig({ testTimeout: 30_000 });
