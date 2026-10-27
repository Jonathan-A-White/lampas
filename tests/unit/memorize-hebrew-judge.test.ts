// tests/unit/memorize-hebrew-judge.test.ts — a Hebrew recall judged against the pointed words (mw-gdcyf98.15, PROVISIONAL): points and cantillation are ignored, the consonants are strict (as Greek is
// strict on its letters), a final letter and its medial form are the one letter. Jonah 1:1 is the verse.
import { describe, expect, it } from 'vitest';
import type { Verse } from '../../src/data/chapter';
import { judgeSaid, judgeTyped } from '../../src/memorize/judge';
import { tokensOf } from '../../src/memorize/target';

const word = (t: string, e: number) => ({ t, tr: '', s: '', l: '', p: '', e });
const JONAH_1_1: Verse = {
  n: 1,
  g: [word('וַֽיְהִי֙', 2), word('דְּבַר־', 0), word('יְהוָ֔ה', 1), word('אֶל־', 3), word('יוֹנָ֥ה', 4), word('בֶן־', 5), word('אֲמִתַּ֖י', 6), word('לֵאמֹֽר׃', 7)],
  e: [{ t: 'Now the word', g: [1] }, { t: 'of the LORD', g: [2] }, { t: 'came', g: [0] }, { t: 'to', g: [3] }, { t: 'Jonah', g: [4] }, { t: 'son', g: [5] }, { t: 'of Amittai,', g: [6] }, { t: 'saying,', g: [7] }],
};
const TARGET = tokensOf(JONAH_1_1, 'he');

describe('the Hebrew target', () => {
  it('is the verse\'s Hebrew words in Hebrew order, each a Hebrew token', () => {
    expect(TARGET).toHaveLength(8);
    expect(TARGET.every((t) => t.lang === 'he')).toBe(true);
    expect(TARGET[0].text).toBe('וַֽיְהִי֙');
  });
});

describe('judging a Hebrew recall', () => {
  it('passes a recall said right, whole, with its misses empty', () => {
    const said = judgeSaid(TARGET, 'ויהי דבר יהוה אל יונה בן אמתי לאמר');
    expect(said).toMatchObject({ score: 1, passed: true, misses: [] });
    expect(said.asked.every((a) => a.lang === 'he')).toBe(true);
  });

  it('does not count a dropped point: the word said with other points, or none, is right', () => {
    expect(judgeSaid(TARGET, 'וְיִהְי דְּבָר יהוה אל יונה בן אֲמִתַּי לאמר').misses).toEqual([]);
    expect(judgeTyped(TARGET, 'וַיְהִי דְּבַר־יְהוָה אֶל־יוֹנָה בֶן־אֲמִתַּי לֵאמֹר׃').score).toBe(1);
  });

  it('counts a wrong consonant as a miss', () => {
    const said = judgeSaid(TARGET, 'ויהי דבר יהוה אל יונה בן אמתי לאמד');
    expect(said.misses).toEqual([7]);
    expect(said.score).toBeCloseTo(7 / 8);
    expect(said.passed).toBe(false);
  });

  it('counts a word not said as a miss, and passes at nine in ten words in order', () => {
    const said = judgeSaid(TARGET, 'ויהי דבר יהוה יונה בן אמתי לאמר');
    expect(said.misses).toEqual([3]);
    expect(said.passed).toBe(false);
    // a longer verse passes with one word gone
    const long = tokensOf({ ...JONAH_1_1, g: [...JONAH_1_1.g, ...JONAH_1_1.g.slice(0, 4)] }, 'he');
    const longSaid = judgeSaid(long, 'ויהי דבר יהוה יונה בן אמתי לאמר ויהי דבר יהוה אל');
    expect(longSaid.misses).toEqual([3]);
    expect(longSaid.passed).toBe(true);
  });

  it('takes a final letter and its medial form as one', () => {
    const target = tokensOf({ ...JONAH_1_1, g: [word('מֶלֶךְ', 0), word('עַם', 1)] }, 'he');
    expect(judgeTyped(target, 'מלכ עמ').score).toBe(1);
    expect(judgeTyped(target, 'מלך עם').score).toBe(1);
  });
});
