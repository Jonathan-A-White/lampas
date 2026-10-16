// tests/unit/reading-weave.test.ts — the reading check with the weave on (mw-5r3p30.410): the words shown in Greek are found by their place in the
// English the mill is given ('And we know that God works', And and God in Greek), and an answer is kept without them.
import { describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { passageVerse } from '../../src/data/passage';
import type { Woven } from '../../src/data/weave';
import { outsideWeave, readingText, wovenPlaces, type VerseReadAnswer } from '../../src/services/reading';

const greek = { t: 'x', l: 'x', p: 'x', s: 'x' } as unknown as Verse['g'][number];
const verse = (n: number, chunks: string[]): Verse => ({ n, g: [greek], e: chunks.map((t) => ({ t, g: [0] })) }) as unknown as Verse;
const shown: Woven = { words: [greek], learning: false };

const answer = (words: { word: string; index: number }[], next?: { word: string; index: number }): VerseReadAnswer => ({
  verdict: next ? 'partial' : 'some-to-fix',
  focus_words: words.map((w) => ({ ...w, chunks: [w.word], tip: 'Again.' })),
  note: 'Again.',
  ...(next ? { reached: next.index - 1, next_word: { ...next, chunks: [next.word], tip: 'Next.' } } : {}),
});

describe('wovenPlaces', () => {
  it('names every English word of a chunk shown in Greek, counted as readingText gives them', () => {
    const v = verse(1, ['And', ' we know ', 'that', 'all things']);
    expect(readingText(v)).toBe('And we know that all things');
    expect([...wovenPlaces(v, [shown, shown, null, shown])]).toEqual([0, 1, 2, 4, 5]);
  });

  it('is empty with no weave', () => {
    expect(wovenPlaces(verse(1, ['And']), null).size).toBe(0);
  });

  it("counts a passage's verses one after another", () => {
    const first = verse(1, ['In the beginning', 'was']);
    const second = verse(2, ['He', 'was']);
    const passage = passageVerse({ first: 1, last: 2, verses: [first, second] } as unknown as Parameters<typeof passageVerse>[0]);
    expect([...wovenPlaces(passage, [null, null, shown, null])]).toEqual([4]);
  });
});

describe('outsideWeave', () => {
  const places = new Set([0, 4]);

  it('leaves out the words shown in Greek and keeps the others', () => {
    const kept = outsideWeave(answer([{ word: 'And', index: 0 }, { word: 'know', index: 2 }, { word: 'God', index: 4 }]), places);
    expect(kept.focus_words.map((w) => w.word)).toEqual(['know']);
    expect(kept.verdict).toBe('some-to-fix');
  });

  it('drops a next word shown in Greek and keeps one shown in English', () => {
    expect(outsideWeave(answer([], { word: 'God', index: 4 }), places).next_word).toBeUndefined();
    expect(outsideWeave(answer([], { word: 'know', index: 2 }), places).next_word?.word).toBe('know');
  });

  it('changes nothing with no word shown in Greek', () => {
    const heard = answer([{ word: 'And', index: 0 }]);
    expect(outsideWeave(heard, new Set())).toBe(heard);
  });
});
