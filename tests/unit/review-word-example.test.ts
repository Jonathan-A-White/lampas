// A Review word question's Example (mw-indx1x6.12): goalOccurrences looks in his goal's nearest place first (verse, pericope, chapter, book), the Quick test is left as it was, and the
// answered card's Example verse is told to the tutor. The chapter files are read from disk by stubChapterFetch.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type Word } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories';
import { goalOccurrences } from '../../src/data/repositories/reviewExamples';
import { questionsOf } from '../../src/data/quizWords';
import { mulberry32 } from '../../src/data/quiz';
import { setOpenChapter } from '../../src/data/readerChapter';
import type { WordItem } from '../../src/review/kinds';
import { reviewFacts } from '../../src/review/reviewFacts';
import { stubChapterFetch } from '../support/chapter-fetch';

const word = (lemma: string, gloss: string): Word => ({ lemma, lang: 'grc', lemmas: [lemma], gloss, lesson: 1, state: 'learning', since: 0 });
const APO = word('ἀπό', 'from, away from');
const LOGOS = word('λόγος', 'word');
const none = (): ReadonlySet<string> => new Set();

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await db.settings.clear();
});

afterEach(() => vi.unstubAllGlobals());

describe('goalOccurrences looks in the goal first and widens', () => {
  it('a verse goal that has the word gives that verse', async () => {
    await setGoal('Read John 1:44');
    const found = await goalOccurrences([APO], none);
    expect(found.get('ἀπό')).toMatchObject({ reference: 'John 1:44', book: 'jhn', chapter: 1, verse: 44 });
  });

  it('a verse goal without it widens to its pericope, then its chapter', async () => {
    // John 1:6 has no λόγος; the pericope the verse stands in has it at 1:1 (the heading 'The Beginning')
    await setGoal('Read John 1:6');
    expect((await goalOccurrences([LOGOS], none)).get('λόγος')).toMatchObject({ book: 'jhn', chapter: 1 });
    // ἀπό is not in 1:1, nor in its pericope: John 1's chapter has it
    await setGoal('Read John 1:1');
    const found = (await goalOccurrences([APO], none)).get('ἀπό');
    expect(found).toMatchObject({ book: 'jhn', chapter: 1 });
    expect(found?.verse).toBeGreaterThan(1);
  });

  it('a chapter goal that lacks the word widens to its book', async () => {
    await setGoal('Read John 1');
    // ἀγάπη is not in John 1: the first chapter that has it, in the book, gives it
    const found = await goalOccurrences([word('ἀγάπη', 'love')], none);
    expect(found.get('ἀγάπη')?.book).toBe('jhn');
    expect(found.get('ἀγάπη')?.chapter).not.toBe(1);
  });

  it('no goal, a word nowhere in the goal and an empty draw give nothing', async () => {
    expect((await goalOccurrences([APO], none)).size).toBe(0);
    await setGoal('Read Philemon');
    expect((await goalOccurrences([word('κτίσις', 'creation')], none)).size).toBe(0);
    expect((await goalOccurrences([], none)).size).toBe(0);
  });
});

describe('questionsOf', () => {
  it('marks the goal example only when Review asks, and the Quick test keeps the open chapter', async () => {
    await setGoal('Read John 1');
    setOpenChapter('rom', 8);
    const words = [APO, word('ἐκ', 'out of'), word('ἐν', 'in'), word('εἰς', 'into')];
    const [review] = await questionsOf([APO], words, mulberry32(1), {}, true);
    expect(review).toMatchObject({ example: true, book: 'jhn', chapter: 1 });
    const [quick] = await questionsOf([APO], words, mulberry32(1));
    expect(quick.example).toBeUndefined();
    expect(quick.book).toBe('rom');
  });

  it('the options are the same whether or not a goal verse was found', async () => {
    const words = [APO, word('ἐκ', 'out of'), word('ἐν', 'in'), word('εἰς', 'into'), word('διά', 'through')];
    await setGoal('Read John 1');
    const [withGoal] = await questionsOf([APO], words, mulberry32(5), {}, true);
    const [without] = await questionsOf([APO], words, mulberry32(5));
    expect(withGoal.options).toEqual(without.options);
  });
});

describe("Review's Ask the tutor", () => {
  const item = (example: boolean): WordItem => ({
    kind: 'word',
    id: 'ἀπό',
    mode: 'choice',
    question: { lemma: 'ἀπό', prompt: 'ἀπό', form: 'ἀπὸ', reference: 'John 1:44', book: 'jhn', chapter: 1, verse: 44, gloss: 'from, away from', options: ['from, away from', 'in'], ...(example ? { example: true as const } : {}) },
  });
  const facts = (picked: string | null, example: boolean) => reviewFacts({ status: 'running', items: [item(example)], index: 0, picked }, undefined);

  it('tells the Example verse once he has answered, never before', () => {
    expect(facts(null, true).map((f) => f.label)).not.toContain('Example verse');
    expect(facts('in', true)).toContainEqual({ label: 'Example verse', value: 'John 1:44 as ἀπὸ' });
  });

  it('tells nothing of a verse that is not an Example', () => {
    expect(facts('in', false).map((f) => f.label)).not.toContain('Example verse');
  });
});
