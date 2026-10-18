// A Review round (src/review/round.ts): the due grammar ideas come before the due words, whichever has been due the longer.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { seedHisWords } from '../support/his-words';
import { DAY } from '../../src/data/schedule';
import { mulberry32 } from '../../src/data/quiz';
import { planFrom } from '../../src/data/grammar/drillPlan';
import { ITEM_GROUPS, itemsOf } from '../../src/data/grammar/ladder';
import { closeDrillPlan, saveDrillPlan } from '../../src/data/repositories/drillPlans';
import { listDue } from '../../src/data/repositories/reviews';
import { KINDS } from '../../src/review/kinds';
import { drawReviewRound } from '../../src/review/round';
import { stubChapterFetch } from '../support/chapter-fetch';

const NOW = Date.now();

beforeEach(async () => {
  stubChapterFetch();
  localStorage.clear();
  await db.open();
  await Promise.all([db.reviews.clear(), db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
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

  it('asks the exact gaps of the letters and sounds first, due or not (mw-hqd5bz.18)', async () => {
    await setGoal('1 John 1');
    const items = [...ITEM_GROUPS.flatMap((g) => itemsOf(g).map((i) => i.id))];
    const missed = ['letter-xi', 'letter-psi', 'diphthong-ou'];
    await db.grammarLevels.bulkPut(items.map((id) => ({ id, level: missed.includes(id) ? ('notYet' as const) : ('solid' as const), since: NOW, how: 'placement' as const })));
    // the missed ones come back tomorrow (not due); a due idea and a due word are waiting too
    await db.reviews.bulkPut([...missed.map((id) => ({ ...due('grammar', id, 0), due: NOW + DAY })), due('grammar', 'case-genitive', 60_000), due('word', 'λέγω', 5 * DAY)]);
    const round = await drawReviewRound(mulberry32(7), NOW);
    expect(round.items.slice(0, 4).map((i) => `${i.kind}:${i.id}`)).toEqual(['grammar:letter-xi', 'grammar:letter-psi', 'grammar:diphthong-ou', 'grammar:case-genitive']);
    const first = round.items[0];
    expect(first.kind === 'grammar' && first.question.ideaId).toBe('letter-xi');
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

  it('counts the steps of a drill plan as drills, then grammar ideas as ideas, in the order the counts are written', () => {
    expect(KINDS.map((k) => k.kind)).toEqual(['drill-plan', 'grammar', 'paradigm', 'sound', 'word', 'lesson']);
    expect(KINDS[0].count(1)).toBe('1 drill');
    expect(KINDS[0].count(2)).toBe('2 drills');
    expect(KINDS[1].count(1)).toBe('1 idea');
    expect(KINDS[1].count(2)).toBe('2 ideas');
    expect(KINDS[2].count(1)).toBe('1 table');
    expect(KINDS[2].count(2)).toBe('2 tables');
    expect(KINDS[3].count(1)).toBe('1 sound');
    expect(KINDS[3].count(2)).toBe('2 sounds');
    expect(KINDS[4].count(2)).toBe('2 words');
    expect(KINDS[5].count(1)).toBe('1 lesson');
  });

  it('asks a due step of a drill plan after the exact gaps and before a due grammar idea or word (mw-i7xe0n.4)', async () => {
    await setGoal('1 John 1');
    const facet = (id: string, label: string) => ({ id, label });
    const run = { ideaId: 'noun', proved: false, edgeStep: 1, topStep: 3, strong: [], weak: [facet('meaning', 'What it is')], answers: [{ step: 1, facet: facet('meaning', 'What it is'), key: 'k', right: false, hinted: false }], ended: 'edge' as const };
    await saveDrillPlan(planFrom(run, NOW)!, NOW - 1000);
    await db.reviews.bulkPut([due('word', 'λέγω', 5 * DAY), due('grammar', 'case-genitive', 60_000)]);
    const round = await drawReviewRound(mulberry32(7), NOW);
    expect(round.items.slice(0, 3).map((i) => `${i.kind}:${i.id}`)).toEqual(['drill-plan:noun|facet:meaning', 'grammar:case-genitive', 'word:λέγω']);
    const step = round.items[0];
    expect(step.kind === 'drill-plan' && step.questions.length).toBeGreaterThan(0);
    expect(step.kind === 'drill-plan' && step.questions.every((q) => q.facet.id === 'meaning')).toBe(true);
  });

  it('leaves out a step of a plan that was closed since, and Prove it while a short drill is not done', async () => {
    await setGoal('1 John 1');
    const meaning = { id: 'meaning', label: 'What it is' };
    const run = { ideaId: 'noun', proved: false, edgeStep: 1, topStep: 3, strong: [], weak: [meaning], answers: [{ step: 1, facet: meaning, key: 'k', right: false, hinted: false }], ended: 'edge' as const };
    await saveDrillPlan(planFrom(run, NOW)!, NOW - 1000);
    await db.reviews.put(due('drill-plan', 'noun|prove', 1000));
    expect((await drawReviewRound(mulberry32(7), NOW)).items.map((i) => i.id)).not.toContain('noun|prove');
    await closeDrillPlan('noun', NOW);
    await db.reviews.put(due('drill-plan', 'noun|facet:meaning', 1000));
    expect((await drawReviewRound(mulberry32(7), NOW)).items.filter((i) => i.kind === 'drill-plan')).toEqual([]);
  });

  it('leaves out a due idea the ladder no longer has', async () => {
    await db.reviews.bulkPut([due('grammar', 'no-such-idea', 60_000)]);
    const round = await drawReviewRound(mulberry32(7), NOW);
    expect(round.items.some((i) => i.kind === 'grammar')).toBe(false);
  });

  // mw-svw421.6: a table he drills is asked cell by cell
  it('draws the same cells of a due table twice from the same seed (mw-svw421.6)', async () => {
    const now = Date.now();
    await db.grammarLevels.bulkPut(
      ['article', 'case-nominative', 'case-genitive', 'number-singular', 'gender-masculine', 'gender-feminine'].map((id) => ({ id, level: 'frontier' as const, since: now, how: 'marked' as const })),
    );
    await db.reviews.put(due('paradigm', 'article', 60_000));
    const asked = async () => (await drawReviewRound(mulberry32(5), NOW)).items.filter((i) => i.kind === 'paradigm').map((i) => (i.kind === 'paradigm' ? i.question : null));
    const first = await asked();
    expect(first.length).toBe(3);
    expect(await asked()).toEqual(first);
  });

  it('asks nothing of a due table with no available cell, and it stays due (mw-svw421.6)', async () => {
    await db.reviews.put(due('paradigm', 'article', 60_000));
    const round = await drawReviewRound(mulberry32(5), NOW);
    expect(round.items.filter((i) => i.kind === 'paradigm')).toEqual([]);
    expect((await listDue('paradigm', NOW)).map((r) => r.id)).toEqual(['article']);
  });
});
