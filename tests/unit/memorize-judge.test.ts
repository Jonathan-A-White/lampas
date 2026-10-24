// tests/unit/memorize-judge.test.ts — judging a said, typed or recorded recall against a target token sequence (mw-fu7dqf.6): 90% of the words heard in order,
// the misses marked by token, the Weave rule (a token asked in Greek is a miss when its English is heard), a verse-read answer read as a Weave recall's judgement.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { asked, judgeReading, judgeSaid, judgeTyped } from '../../src/memorize/judge';
import { tokensOf, type Token } from '../../src/memorize/target';
import type { FocusWord, VerseReadAnswer } from '../../src/services/reading';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const v28 = rom8.verses.find((v) => v.n === 28)!;
const english = tokensOf(v28, 'en');
const greek = tokensOf(v28, 'el');
const GREEK_UNACCENTED = 'οιδαμεν δε οτι τοις αγαπωσιν τον θεον παντα συνεργει εις αγαθον τοις κατα προθεσιν κλητοις ουσιν';
const said = (tokens: Token[], without: number[] = []): string => tokens.filter((_, i) => !without.includes(i)).map((t) => t.text).join(' ');
const words = (n: number, lang: 'en' | 'el' = 'en'): Token[] => Array.from({ length: n }, (_, i): Token => ({ text: `word${i}`, lang, chunk: i }));
const focus = (index: number): FocusWord => ({ word: `word${index}`, index, chunks: ['word'], tip: 'say it clearly' });
const answer = (a: Partial<VerseReadAnswer> & Pick<VerseReadAnswer, 'verdict'>): VerseReadAnswer => ({ focus_words: [], note: 'ok', ...a });

describe('judgeSaid', () => {
  it('Rom.8.28 in English said whole passes with a score of 1', () => {
    const j = judgeSaid(english, said(english));
    expect(english).toHaveLength(23);
    expect(j).toMatchObject({ score: 1, passed: true, misses: [] });
  });

  it('is not troubled by case, punctuation or words said twice or added', () => {
    const j = judgeSaid(english, `um ${said(english).toUpperCase()} amen amen`);
    expect(j).toMatchObject({ score: 1, passed: true, misses: [] });
  });

  it('with "for" and "good" dropped marks those two token indexes; two of 23 is still a pass', () => {
    const j = judgeSaid(english, said(english, [8, 10]));
    expect(english[8].text).toBe('for');
    expect(english[10].text).toBe('good');
    expect(j.misses).toEqual([8, 10]);
    expect(j.score).toBeCloseTo(21 / 23);
    expect(j.passed).toBe(true);
  });

  it('with three words of 23 dropped (over a tenth) fails, and the Greek verse of sixteen words fails on two', () => {
    expect(judgeSaid(english, said(english, [8, 9, 10]))).toMatchObject({ misses: [8, 9, 10], passed: false });
    const j = judgeSaid(greek, said(greek, [7, 9]));
    expect(j).toMatchObject({ misses: [7, 9], passed: false });
  });

  it('one word dropped of twenty or more passes with that index marked', () => {
    const target = words(24);
    const j = judgeSaid(target, said(target, [11]));
    expect(j).toMatchObject({ misses: [11], passed: true });
    expect(j.score).toBeCloseTo(23 / 24);
  });

  it('a score at exactly 90% passes', () => {
    const target = words(10);
    expect(judgeSaid(target, said(target, [4])).passed).toBe(true);
    expect(judgeSaid(target, said(target, [4, 5])).passed).toBe(false);
  });

  it('Greek said in the Modern spelling without accents passes against the accented target', () => {
    const j = judgeSaid(greek, GREEK_UNACCENTED);
    expect(j).toMatchObject({ score: 1, passed: true, misses: [] });
  });

  it('nothing heard misses every token and fails', () => {
    expect(judgeSaid(english, '')).toMatchObject({ score: 0, passed: false, misses: english.map((_, i) => i), heardWords: [] });
  });

  it('gives the words heard, folded', () => {
    expect(judgeSaid(words(2), 'Word0, WORD1!').heardWords).toEqual(['word0', 'word1']);
  });

  it('a token that folds to nothing is not asked of him and is never a miss', () => {
    const target: Token[] = [{ text: 'one', lang: 'en', chunk: 0 }, { text: '—', lang: 'en', chunk: 0 }, { text: 'two', lang: 'en', chunk: 1 }];
    expect(judgeSaid(target, 'one two')).toMatchObject({ score: 1, passed: true, misses: [] });
  });
});

describe('judgeTyped', () => {
  it('typed Greek without accents or breathings passes against the accented target', () => {
    expect(judgeTyped(greek, GREEK_UNACCENTED)).toMatchObject({ score: 1, passed: true, misses: [] });
    // the first eleven words alone (the story's example) are 11 of 16: five misses, a fail
    expect(judgeTyped(greek, GREEK_UNACCENTED.split(' ').slice(0, 11).join(' '))).toMatchObject({ misses: [11, 12, 13, 14, 15], passed: false });
  });

  it('a final σ for ς passes', () => {
    const typed = said(greek).replace('ς', 'σ');
    expect(typed).not.toBe(said(greek));
    expect(judgeTyped(greek, 'οιδαμεν δε οτι τοισ αγαπωσιν τον θεον παντα συνεργει εισ αγαθον τοισ κατα προθεσιν κλητοισ ουσιν')).toMatchObject({ score: 1, passed: true });
    expect(judgeTyped(greek, typed).passed).toBe(true);
  });

  it('typed English with the verse’s own punctuation and capitals passes; a typo marks the word', () => {
    expect(judgeTyped(english, said(english))).toMatchObject({ score: 1, passed: true });
    const j = judgeTyped(english, said(english).replace('together', 'togethr'));
    expect(j.misses).toEqual([7]);
  });
});

describe('the Weave rule', () => {
  const weave = (greekAt: boolean): Token[] =>
    english.flatMap((t, i): Token[] => {
      if (i === 1 && greekAt) return [{ text: 'Οἴδαμεν', lang: 'el', chunk: 1, word: 0 }];
      if (i === 2 && greekAt) return [];
      return [t];
    });

  it('a Greek token answered by its English is a miss, and the asked list says it was asked in el', () => {
    const target = weave(true);
    expect(target[1]).toMatchObject({ text: 'Οἴδαμεν', lang: 'el' });
    const j = judgeSaid(target, said(english));
    expect(j.misses).toEqual([1]);
    expect(j.asked[1]).toEqual({ text: 'Οἴδαμεν', lang: 'el' });
    expect(j.asked[0]).toEqual({ text: 'And', lang: 'en' });
    expect(j.asked).toEqual(asked(target));
    // answered in Greek it is heard
    expect(judgeSaid(target, 'And οιδαμεν that all things work together for the good of those who love Him, who are called according to His purpose')).toMatchObject({ misses: [], passed: true });
  });

  it('the same answer against a target where the chunk is still English passes', () => {
    const j = judgeSaid(weave(false), said(english));
    expect(j).toMatchObject({ score: 1, passed: true, misses: [] });
    expect(j.asked.every((a) => a.lang === 'en')).toBe(true);
  });

  it('asked keeps the text and the language of every token, no more', () => {
    expect(asked([{ text: 'Οἴδαμεν', lang: 'el', chunk: 1, word: 0 }])).toEqual([{ text: 'Οἴδαμεν', lang: 'el' }]);
  });
});

describe('judgeReading', () => {
  const target = words(20, 'en');

  it('well-read passes with no misses', () => {
    expect(judgeReading(target, answer({ verdict: 'well-read' }))).toMatchObject({ score: 1, passed: true, misses: [] });
  });

  it('some-to-fix with one focus word of 20 passes with its token marked', () => {
    const j = judgeReading(target, answer({ verdict: 'some-to-fix', focus_words: [focus(6)] }));
    expect(j).toMatchObject({ misses: [6], passed: true });
    expect(j.score).toBeCloseTo(19 / 20);
  });

  it('some-to-fix with more than a tenth of the tokens in focus fails; exactly a tenth passes', () => {
    expect(judgeReading(target, answer({ verdict: 'some-to-fix', focus_words: [focus(2), focus(7)] })).passed).toBe(true);
    expect(judgeReading(target, answer({ verdict: 'some-to-fix', focus_words: [focus(2), focus(7), focus(9)] })).passed).toBe(false);
  });

  it('a focus word index counts the words of the reading text, so a token of several words moves the rest on', () => {
    const odd: Token[] = [{ text: 'a b', lang: 'en', chunk: 0 }, { text: 'c', lang: 'en', chunk: 1 }, { text: 'd', lang: 'en', chunk: 2 }];
    expect(judgeReading(odd, answer({ verdict: 'some-to-fix', focus_words: [focus(2)] })).misses).toEqual([1]);
  });

  it('a focus word past the end of the target, or named twice, marks nothing more', () => {
    const j = judgeReading(target, answer({ verdict: 'some-to-fix', focus_words: [focus(3), focus(3), focus(99)] }));
    expect(j.misses).toEqual([3]);
  });

  it('partial with reached 9 marks tokens 10 on and fails', () => {
    const j = judgeReading(target, answer({ verdict: 'partial', reached: 9 }));
    expect(j.misses).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(j).toMatchObject({ score: 0.5, passed: false });
  });

  it('partial also marks the focus words before where he stopped', () => {
    const j = judgeReading(target, answer({ verdict: 'partial', reached: 9, focus_words: [focus(2)] }));
    expect(j.misses.slice(0, 2)).toEqual([2, 10]);
  });

  it('incomplete fails with every token missed', () => {
    const j = judgeReading(target, answer({ verdict: 'incomplete' }));
    expect(j).toMatchObject({ score: 0, passed: false, misses: target.map((_, i) => i) });
  });

  it('carries what was asked and hears no words of its own', () => {
    const j = judgeReading(target, answer({ verdict: 'well-read' }));
    expect(j.asked).toEqual(asked(target));
    expect(j.heardWords).toEqual([]);
  });
});

describe('one folder', () => {
  it.each(['src/services/greekWords.ts', 'src/services/reading.ts'])('%s imports its folding from learn-kit/recall and defines no NFD strip of its own', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/from 'learn-kit\/recall'/);
    expect(source).not.toMatch(/normalize\('NFD'\)/);
    expect(source).not.toMatch(/replace\(\/\\p\{M\}/);
  });
});
