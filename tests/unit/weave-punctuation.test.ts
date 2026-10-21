// A verse's closing mark in a Greek-order weave (mw-5r3p30.698): English pieces move with the Greek order, and a sentence's closing mark
// stays at the end of the sentence's last drawn piece, never before the sentence's own words.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { chunkText, drawnOrder, weaveVerse, wovenInOrder } from '../../src/data/weave';
import { runsOf } from '../../src/speech/readAloud';

const chapter = (path: string): Chapter => JSON.parse(readFileSync(path, 'utf8')) as Chapter;
const verse2 = chapter('public/data/1ti/4.json').verses[1];
const none = { solid: new Set<string>() };
const shown = (verse: Verse, order: 'english' | 'greek'): string => {
  const woven = wovenInOrder(verse, weaveVerse(verse, none), order);
  return drawnOrder(verse, woven.order ? woven : null).map((i) => chunkText(verse, woven, i)).join(' ');
};

describe('the closing mark of 1 Timothy 4:2 in Greek order', () => {
  it('stays at the end of the verse, with no full stop before "whose consciences"', () => {
    const text = shown(verse2, 'greek');
    expect(text).not.toMatch(/\. whose consciences/);
    expect(text).toBe('influenced by the hypocrisy of liars, are seared with a hot iron whose consciences.');
    // read aloud says the same
    const woven = wovenInOrder(verse2, weaveVerse(verse2, none), 'greek');
    expect(runsOf(verse2, 'english', woven).map((r) => r.text).join(' ')).toBe(text);
  });

  it('English order is untouched', () => {
    expect(shown(verse2, 'english')).toBe(verse2.e.map((c) => c.t).join(' '));
  });
});

describe('a verse whose pieces stay in order', () => {
  it('weaves exactly as before: nothing is added to the weave', () => {
    const verse1 = chapter('public/data/1jn/2.json').verses[0];
    const plain = weaveVerse(verse1, none);
    const greek = wovenInOrder(verse1, plain, 'greek');
    expect(greek.texts).toBeUndefined();
    for (const [i, c] of verse1.e.entries()) expect(chunkText(verse1, greek, i)).toBe(c.t);
    expect(shown(verse1, 'greek')).toContain('sin. But if anyone does sin,');
  });
});

describe('sweep: every chapter in public/data', () => {
  /** A woven verse shows a sentence-ending mark before a later piece of its own sentence. */
  const marksBeforeOwnWords = (verse: Verse, texts: (i: number) => string, order: readonly number[]): number => {
    let sentence = 0;
    const of = verse.e.map((c) => {
      const s = sentence;
      if (/[.?!;:]+[”’"')\]]*$/.test(c.t.trim())) sentence += 1;
      return s;
    });
    return order.filter((i, p) => /[.?!;:]+[”’"')\]]*$/.test(texts(i).trim()) && order.slice(p + 1).some((j) => of[j] === of[i])).length;
  };
  it('no verse shows a sentence-ending mark before the rest of its sentence', () => {
    let before = 0;
    let after = 0;
    let verses = 0;
    for (const book of readdirSync('public/data').filter((b) => statSync(`public/data/${b}`).isDirectory())) {
      for (const file of readdirSync(`public/data/${book}`)) {
        if (!/^\d+\.json$/.test(file)) continue;
        for (const verse of chapter(`public/data/${book}/${file}`).verses) {
          verses += 1;
          const woven = wovenInOrder(verse, weaveVerse(verse, none), 'greek');
          const order = drawnOrder(verse, woven);
          if (marksBeforeOwnWords(verse, (i) => verse.e[i].t, order) > 0) before += 1;
          if (marksBeforeOwnWords(verse, (i) => chunkText(verse, woven, i), order) > 0) after += 1;
        }
      }
    }
    console.log(`sweep: ${verses} verses, ${before} show a mark before their own words, ${after} after`);
    expect(before).toBeGreaterThan(0);
    expect(after).toBe(0);
  });
});
