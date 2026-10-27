// tests/unit/marked-word-drawn.test.ts — a verse card that marks a Greek word (a Review question's 'ὅς in Colossians 3:25 as ὃ', mw-5r3p30.817) draws that word in the English and
// the weave whatever the MSB did with it. A word with no English chunk (37,764 of the 445,641 words of the data) is placed by strayMarks beside its neighbours; this sweeps every verse
// of every chapter file, in both orders, for a word that would be marked and not drawn, or drawn twice.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { chunkOrder, strayMarks } from '../../src/data/weave';

const chapters = (): Chapter[] =>
  readdirSync('public/data')
    .filter((book) => statSync(`public/data/${book}`).isDirectory() && book !== 'ladder')
    .flatMap((book) => readdirSync(`public/data/${book}`).map((file) => JSON.parse(readFileSync(`public/data/${book}/${file}`, 'utf8')) as Chapter));

/** How many times each Greek index of `verse` is drawn when every word is marked: by its chunk, or as a stray. */
function drawnCounts(verse: Verse, order: 'english' | 'greek'): number[] {
  const drawn = chunkOrder(verse, order);
  const counts = verse.g.map(() => 0);
  for (const i of drawn) for (const g of verse.e[i].g) counts[g] += 1;
  const strays = strayMarks(verse, new Set(verse.g.map((_, i) => i)), drawn);
  for (const [chunk, words] of strays.before) {
    expect(drawn).toContain(chunk);
    for (const w of words) counts[w] += 1;
  }
  for (const w of strays.end) counts[w] += 1;
  return counts;
}

describe('every Greek word a card marks is drawn in the English and the weave', () => {
  it('draws each word of every verse of every chapter, whichever order the chunks are in', () => {
    const faults: string[] = [];
    for (const chapter of chapters()) {
      for (const verse of chapter.verses) {
        for (const order of ['english', 'greek'] as const) {
          const counts = drawnCounts(verse, order);
          counts.forEach((n, i) => {
            // a word two chunks both hold is drawn by each: that is the data's, and the word is shown
            if (n === 0) faults.push(`${chapter.code} ${chapter.chapter}:${verse.n} word ${i} (${order}) is not drawn`);
          });
        }
      }
    }
    expect(faults.slice(0, 20)).toEqual([]);
  });
});

describe('where a word with no English of its own is drawn', () => {
  const verse = (e: number[][], words: number): Verse => ({ n: 1, g: Array.from({ length: words }, (_, i) => ({ t: `w${i}`, tr: '', s: '', l: '', p: '' })), e: e.map((g) => ({ t: `c${g.join('')}`, g })) }) as unknown as Verse;

  it('is before the chunk of the next Greek word', () => {
    // Colossians 3:25: ὃ (4) between κομιεῖται (3) and ἠδίκησεν (5), the chunks 'will be repaid for' and 'his wrong,'
    const v = verse([[1], [0], [2], [3], [5], [6], [8], [7], [9]], 10);
    const places = strayMarks(v, new Set([4]), chunkOrder(v, 'english'));
    expect([...places.before]).toEqual([[4, [4]]]);
    expect(places.end).toEqual([]);
  });

  it('is at the end of the drawn chunks when no Greek word follows it', () => {
    const v = verse([[0], [1]], 3);
    const places = strayMarks(v, new Set([2]), chunkOrder(v, 'english'));
    expect(places.before.size).toBe(0);
    expect(places.end).toEqual([2]);
  });

  it('is before the first chunk when no Greek word has a chunk', () => {
    const v = verse([[]], 1);
    expect([...strayMarks(v, new Set([0]), chunkOrder(v, 'english')).before]).toEqual([[0, [0]]]);
  });

  it('leaves a word a chunk holds to its chunk, and a mark outside the verse alone', () => {
    const v = verse([[0], [1]], 2);
    const places = strayMarks(v, new Set([0, 7]), chunkOrder(v, 'english'));
    expect(places.before.size).toBe(0);
    expect(places.end).toEqual([]);
  });
});
