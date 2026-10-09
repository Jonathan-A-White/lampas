// A Review round (src/review/round.ts): the due grammar ideas come before the due words, whichever has been due the longer.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
import { DAY } from '../../src/data/schedule';
import { mulberry32 } from '../../src/data/quiz';
import { KINDS } from '../../src/review/kinds';
import { drawReviewRound } from '../../src/review/round';
import { stubChapterFetch } from '../support/chapter-fetch';

const NOW = Date.now();

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedWordsIfFirstOpen();
  await db.reviews.clear();
});
afterAll(() => db.close());

const due = (kind: string, id: string, agoMs: number, step = 0) => ({ kind, id, step, rights: 0, due: NOW - agoMs, lastWhen: NOW - 3 * DAY, lapses: 0 });

describe('a Review round', () => {
  it('asks a due grammar idea before a due word, even one that has been due longer', async () => {
    await setGoal('1 John 1');
    await db.reviews.bulkPut([due('word', 'λέγω', 5 * DAY), due('word', 'εἰμί', 4 * DAY), due('grammar', 'case-genitive', 60_000)]);
    const round = await drawReviewRound(mulberry32(7), NOW);
    expect(round.due).toBe(3);
    expect(round.items.slice(0, 3).map((i) => `${i.kind}:${i.id}`)).toEqual(['grammar:case-genitive', 'word:λέγω', 'word:εἰμί']);
    const idea = round.items[0];
    expect(idea.kind === 'grammar' && idea.question.ideaId).toBe('case-genitive');
    // the question is drawn from the goal's chapter, 1 John 1
    expect(idea.kind === 'grammar' && idea.question.ref).toMatch(/^1 John 1:/);
  });

  it('draws from the open chapter when he has no goal', async () => {
    localStorage.setItem('lampas.chapter', JSON.stringify({ book: '1jn', chapter: 2 }));
    await db.reviews.put(due('grammar', 'case-genitive', 60_000));
    const [first] = (await drawReviewRound(mulberry32(7), NOW)).items;
    expect(first.kind === 'grammar' && first.question.ref).toMatch(/^1 John 2:/);
  });

  it('is the same round twice for the same seed', async () => {
    await setGoal('1 John 1');
    await db.reviews.bulkPut([due('grammar', 'case-genitive', 60_000), due('grammar', 'tense-aorist', 120_000), due('word', 'λέγω', 5 * DAY)]);
    const [a, b] = [await drawReviewRound(mulberry32(5), NOW), await drawReviewRound(mulberry32(5), NOW)];
    expect(a.items.filter((i) => i.kind === 'grammar')).toEqual(b.items.filter((i) => i.kind === 'grammar'));
  });

  it('asks a weak idea as multiple choice and a strong one as a flashcard', async () => {
    await setGoal('1 John 1');
    await db.reviews.bulkPut([due('grammar', 'case-genitive', 60_000, 0), due('grammar', 'case-dative', 30_000, 3)]);
    const items = (await drawReviewRound(mulberry32(7), NOW)).items.filter((i) => i.kind === 'grammar');
    expect(items.map((i) => (i.kind === 'grammar' ? [i.id, i.mode] : []))).toEqual([['case-genitive', 'choice'], ['case-dative', 'flashcard']]);
  });

  it('counts grammar ideas as ideas, first in the order the counts are written', () => {
    expect(KINDS.map((k) => k.kind)).toEqual(['grammar', 'word']);
    expect(KINDS[0].count(1)).toBe('1 idea');
    expect(KINDS[0].count(2)).toBe('2 ideas');
    expect(KINDS[1].count(2)).toBe('2 words');
  });

  it('leaves out a due idea the ladder no longer has', async () => {
    await db.reviews.bulkPut([due('grammar', 'no-such-idea', 60_000)]);
    const round = await drawReviewRound(mulberry32(7), NOW);
    expect(round.items.some((i) => i.kind === 'grammar')).toBe(false);
  });
});
