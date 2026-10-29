// The store half of rust (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'): the schedule keeps an item's last answers, the solid ones that went rusty are read from it, the tutor's offer is held to
// what the request listed, a tap moves the items back to Frontier, and Review can draw a round of just them. src/data/rusty.ts has its own pure test (tests/unit/rusty.test.ts).
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { overdueNow, rustyNow } from '../../src/data/learnerRusty';
import { lastUsageDayBefore } from '../../src/data/repositories';
import { moveToFrontier } from '../../src/data/repositories/rusty';
import { recordReview } from '../../src/data/repositories/reviews';
import { RECENT_ANSWERS, type RustyItem } from '../../src/data/rusty';
import { DAY } from '../../src/data/schedule';
import { mulberry32 } from '../../src/data/quiz';
import { drawReviewRound } from '../../src/review/round';
import { hasPractise, setPractise, takePractise } from '../../src/review/practise';
import { buildTalkRequest, fitHistory, isTalkAnswer, type TalkAnswer, type TalkScope } from '../../src/services/talk';
import { rustyOfferOf } from '../../src/talk/rustyOffer';
import { stubChapterFetch } from '../support/chapter-fetch';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);
const ago = (days: number) => NOW - days * DAY;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.words.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.usage.clear(), db.results.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
});

const word = (lemma: string, state: 'solid' | 'learning' = 'solid') => ({ lemma, lang: 'grc' as const, lemmas: [], gloss: 'g', lesson: 1, state, since: 0 });
const row = (kind: string, id: string, over: Record<string, unknown> = {}) => ({ kind, id, step: 3, due: ago(0) + 5 * DAY, lastWhen: ago(1), lapses: 0, rights: 0, ...over });

describe('the schedule keeps an item\'s last answers', () => {
  it('keeps the last RECENT_ANSWERS, oldest first', async () => {
    for (let i = 0; i < 5; i++) await recordReview('word', 'λόγος', i % 2 === 0, NOW + i * 1000);
    const kept = await db.reviews.get(['word', 'λόγος']);
    expect(kept?.recent).toHaveLength(RECENT_ANSWERS);
    expect(kept?.recent?.map((a) => a.right)).toEqual([true, false, true]);
    expect(kept?.recent?.map((a) => a.when)).toEqual([NOW + 2000, NOW + 3000, NOW + 4000]);
  });
});

describe('rustyNow', () => {
  it('reads the solid items that slipped or were away, and leaves the learning ones and the fresh ones out', async () => {
    await db.words.bulkPut([word('λόγος'), word('ἀγάπη'), word('θεός', 'learning'), word('πίστις')]);
    await db.grammarLevels.put({ id: 'case-genitive', level: 'solid', since: 0, how: 'placement' });
    await db.reviews.bulkPut([
      row('word', 'λόγος', { recent: [{ when: ago(1), right: false }] }),
      row('word', 'ἀγάπη', { recent: [{ when: ago(1), right: true }] }),
      row('word', 'θεός', { recent: [{ when: ago(1), right: false }] }),
      row('grammar', 'case-genitive', { due: ago(9), lastWhen: ago(23) }),
    ]);
    // πίστις is solid with no row: never asked, so not rusty
    const rusty = await rustyNow(NOW);
    expect(rusty).toEqual([
      { kind: 'word', id: 'λόγος', title: 'λόγος', why: 'slipped this week' },
      { kind: 'idea', id: 'case-genitive', title: 'The genitive case', why: 'not seen for 3 weeks' },
    ]);
  });

  it('is undefined when nothing is rusty', async () => {
    await db.words.bulkPut([word('ἀγάπη')]);
    await db.reviews.bulkPut([row('word', 'ἀγάπη')]);
    expect(await rustyNow(NOW)).toBeUndefined();
  });

  it('overdueNow lists the solid items past due, the most overdue first', async () => {
    await db.words.bulkPut([word('λόγος'), word('ἀγάπη'), word('ὁδός')]);
    await db.reviews.bulkPut([row('word', 'λόγος', { due: ago(2) }), row('word', 'ἀγάπη'), row('word', 'ὁδός', { due: ago(9) })]);
    expect((await overdueNow(NOW)).map((c) => c.id)).toEqual(['ὁδός', 'λόγος']);
  });
});

describe('moving the rust back to Frontier', () => {
  it('makes a solid word learning and a solid idea frontier, both at step 0 and due now, keeping their lapses', async () => {
    await db.words.bulkPut([word('λόγος')]);
    await db.grammarLevels.put({ id: 'case-genitive', level: 'solid', since: 0, how: 'placement' });
    await db.reviews.bulkPut([row('word', 'λόγος', { lapses: 2 }), row('grammar', 'case-genitive', { due: ago(9), lapses: 1 })]);
    const moved = await moveToFrontier([{ kind: 'word', id: 'λόγος' }, { kind: 'idea', id: 'case-genitive' }], NOW);
    expect(moved).toHaveLength(2);
    expect((await db.words.get('λόγος'))?.state).toBe('learning');
    expect((await db.grammarLevels.get('case-genitive'))).toMatchObject({ level: 'frontier', how: 'tutor', since: NOW });
    expect(await db.reviews.get(['word', 'λόγος'])).toMatchObject({ step: 0, due: NOW, lapses: 2, rights: 0 });
    expect(await db.reviews.get(['grammar', 'case-genitive'])).toMatchObject({ step: 0, due: NOW, lapses: 1 });
  });

  it('leaves an item that is not solid alone', async () => {
    await db.words.bulkPut([word('θεός', 'learning')]);
    await db.reviews.bulkPut([row('word', 'θεός', { step: 1 })]);
    expect(await moveToFrontier([{ kind: 'word', id: 'θεός' }, { kind: 'idea', id: 'case-dative' }], NOW)).toEqual([]);
    expect(await db.reviews.get(['word', 'θεός'])).toMatchObject({ step: 1 });
  });
});

describe('a Review round of chosen items', () => {
  it('asks exactly those, in the order given, due or not', async () => {
    stubChapterFetch();
    await db.words.bulkPut([word('λόγος'), word('ἀγάπη'), word('ὁδός')]);
    await db.reviews.bulkPut([row('word', 'λόγος'), row('word', 'ἀγάπη', { due: ago(30) }), row('word', 'ὁδός')]);
    const round = await drawReviewRound(mulberry32(3), NOW, undefined, [{ kind: 'word', id: 'ὁδός' }, { kind: 'word', id: 'λόγος' }]);
    expect(round.items.map((i) => i.id)).toEqual(['ὁδός', 'λόγος']);
  });

  it('holds the chosen items once, for the next round', () => {
    expect(hasPractise()).toBe(false);
    setPractise([{ kind: 'word', id: 'λόγος' }]);
    expect(hasPractise()).toBe(true);
    expect(takePractise()).toEqual([{ kind: 'word', id: 'λόγος' }]);
    expect(takePractise()).toBeUndefined();
  });
});

describe('the break', () => {
  it('finds the latest day before today that has any use', async () => {
    await db.usage.bulkPut([
      { key: '2026-10-01|screen:home', day: '2026-10-01', name: 'screen:home', count: 1 },
      { key: '2026-10-04|screen:home', day: '2026-10-04', name: 'screen:home', count: 1 },
      { key: '2026-10-12|screen:home', day: '2026-10-12', name: 'screen:home', count: 1 },
    ]);
    expect(await lastUsageDayBefore('2026-10-12')).toBe('2026-10-04');
    expect(await lastUsageDayBefore('2026-10-01')).toBeUndefined();
  });
});

describe('the request and the answer', () => {
  const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
  const scope: TalkScope = { title: 'Romans 8', chapter, verse: chapter.verses[27] };
  const RUSTY: RustyItem[] = [
    { kind: 'word', id: 'λόγος', title: 'λόγος', why: 'slipped twice this week' },
    { kind: 'idea', id: 'case-genitive', title: 'The genitive case', why: 'not seen for 3 weeks' },
  ];
  const good: TalkAnswer = { answer: 'You are rusty on λόγος.', question: 'What does it say?', words: [] };
  const offer = (items: Array<{ kind: 'word' | 'idea'; id: string }>): TalkAnswer => ({ ...good, rusty_offer: { items } });
  const inputSchema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
  const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;

  it('buildTalkRequest sends rusty when there is any, and not in a quiz or with none', () => {
    const request = buildTalkRequest(scope, 'What now?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, RUSTY);
    expect(request.rusty).toEqual(RUSTY);
    expect(validate(request, inputSchema)).toEqual([]);
    const quiz = buildTalkRequest({ ...scope, quiz: true }, 'Quiz me', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, RUSTY);
    expect('rusty' in quiz).toBe(false);
    expect('rusty' in buildTalkRequest(scope, 'What now?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, [])).toBe(false);
  });

  it('fitHistory never cuts rusty', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ q: `Q${i}`, a: 'x'.repeat(900) }));
    const request = buildTalkRequest(scope, 'What now?', history, [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, RUSTY);
    expect(fitHistory(request).rusty).toEqual(RUSTY);
  });

  it('accepts a rusty_offer in the schema and isTalkAnswer, and refuses a malformed one', () => {
    const value = offer([{ kind: 'word', id: 'λόγος' }]);
    expect(validate(value, answerSchema)).toEqual([]);
    expect(isTalkAnswer(value)).toBe(true);
    for (const bad of [{ items: [] }, { items: [{ kind: 'sound', id: 'x' }] }, { items: [{ kind: 'word' }] }, { items: [{ kind: 'word', id: 'x' }], extra: 1 }, { items: Array.from({ length: 9 }, (_, i) => ({ kind: 'word', id: `w${i}` })) }]) {
      expect(isTalkAnswer({ ...good, rusty_offer: bad })).toBe(false);
      expect(validate({ ...good, rusty_offer: bad }, answerSchema)).not.toEqual([]);
    }
  });

  it('keeps only the items the request listed, in its order and with its titles', () => {
    const kept = rustyOfferOf(offer([{ kind: 'idea', id: 'case-genitive' }, { kind: 'word', id: 'λόγος' }, { kind: 'word', id: 'ἀγάπη' }]), scope, [], RUSTY);
    expect(kept).toEqual({ items: [{ kind: 'word', id: 'λόγος', title: 'λόγος' }, { kind: 'idea', id: 'case-genitive', title: 'The genitive case' }] });
  });

  it('offers nothing without a request list, in a quiz, once a talk has made one, after his no, or for items it never listed', () => {
    const one = offer([{ kind: 'word', id: 'λόγος' }]);
    expect(rustyOfferOf(one, scope, [], undefined)).toBeUndefined();
    expect(rustyOfferOf(one, { ...scope, quiz: true }, [], RUSTY)).toBeUndefined();
    expect(rustyOfferOf(one, scope, [{ rustyOffer: { items: [] } }], RUSTY)).toBeUndefined();
    expect(rustyOfferOf(one, scope, [], RUSTY, true)).toBeUndefined();
    expect(rustyOfferOf(offer([{ kind: 'word', id: 'ἀγάπη' }]), scope, [], RUSTY)).toBeUndefined();
    expect(rustyOfferOf(good, scope, [], RUSTY)).toBeUndefined();
  });
});
