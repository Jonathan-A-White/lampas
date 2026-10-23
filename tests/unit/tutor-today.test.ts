// The tutor sees today's list (mw-5r3p30.731, docs/ask-tutor.md 'Today'): the request carries the items behind the Reader's chip 'Today · N of M' (title, kind, done), and the
// tutor's `today_offer` is a button (and a spoken yes) that opens Today. The first slice of what the Governor asked for on 2026-10-22; the general tutor client is mw-6ww.127.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { localDate, setTicked } from '../../src/data/daily/dailyStore';
import { dailyDevotionalSetting, dailyPlanSetting, dailyPsalmsSetting, dailyReviewSetting, dailyTicksSetting, devotionalSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { db } from '../../src/data/db';
import { dailyReadings } from '../../src/data/daily/psalmsProverbs';
import { todayNow, type TodayItem } from '../../src/data/learnerToday';
import { DAY } from '../../src/data/schedule';
import { buildTalkRequest, fitHistory, isTalkAnswer, type TalkAnswer, type TalkScope } from '../../src/services/talk';
import { offerOfTurn, pendingOfferOf, settleOffer } from '../../src/talk/offers';
import { registerTalkLeave } from '../../src/talk/rustyOffer';
import { takeTodayOffer, todayOfferOf } from '../../src/talk/todayOffer';
import { TODAY_BUTTON } from '../../src/talk/todayOffer';
import type { TalkTurn } from '../../src/data/repositories';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
const NOW = new Date(2026, 9, 22, 9, 0, 0);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.words.clear(), db.reviews.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.location.hash = '';
});

const readJson = (rel: string): Schema => JSON.parse(readFileSync(rel, 'utf8')) as Schema;
const inputSchema = readJson('grinds/bible-talk.input.schema.json');
const answerSchema = readJson('grinds/bible-talk.answer.schema.json');
const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope: TalkScope = { title: 'Romans 8', chapter, verse: chapter.verses[27] };
const request = (today?: TodayItem[], s: TalkScope = scope) =>
  buildTalkRequest(s, 'What is on my drill today?', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], undefined, today);

describe('todayNow: the items behind the chip', () => {
  it('lists every piece Today holds, in the order it draws them, each with its title and whether he ticked it', async () => {
    await db.words.put({ lemma: 'λόγος', lemmas: [], gloss: 'word', lesson: 1, state: 'learning', since: 0 });
    await db.reviews.put({ kind: 'word', id: 'λόγος', step: 0, due: NOW.getTime() - DAY, lastWhen: 0, lapses: 0, rights: 0 });
    await setTicked(localDate(NOW), 'review', true);
    const readings = dailyReadings(NOW);
    const items = await todayNow(NOW);
    expect(items).toBeDefined();
    // review, plan (no plan started), the day's passages, devotional: as many as todayPieces counts
    expect(items).toHaveLength(2 + readings.length + 1);
    expect(items![0]).toEqual({ kind: 'review', title: 'Review: 1 due', done: true });
    expect(items![1]).toEqual({ kind: 'plan', title: 'Reading plan', done: false });
    const passages = items!.slice(2, 2 + readings.length);
    expect(passages.map((i) => i.kind)).toEqual(readings.map((r) => (r.code === 'psa' ? 'psalm' : 'proverb')));
    expect(passages[0].title).toMatch(/^(Psalm|Proverbs) \d+$/);
    expect(items!.at(-1)).toMatchObject({ kind: 'devotional', done: false });
    expect(items!.at(-1)!.title.length).toBeGreaterThan(0);
  });

  it('marks the ticked ones done and leaves `done` out while Tick boxes is Off', async () => {
    const date = localDate(NOW);
    await setTicked(date, 'devotional', true);
    expect((await todayNow(NOW))!.filter((i) => i.done).map((i) => i.kind)).toEqual(['devotional']);
    await setSetting(dailyTicksSetting, 'off');
    expect((await todayNow(NOW))!.every((i) => !('done' in i))).toBe(true);
  });

  it('leaves out a piece that is Off, and is undefined when Today holds nothing', async () => {
    await setSetting(dailyReviewSetting, 'off');
    await setSetting(dailyPsalmsSetting, 'off');
    expect((await todayNow(NOW))!.map((i) => i.kind)).toEqual(['plan', 'devotional']);
    await setSetting(dailyPlanSetting, 'off');
    await setSetting(dailyDevotionalSetting, 'off');
    expect(await todayNow(NOW)).toBeUndefined();
  });

  it('names the devotional Today shows', async () => {
    await setSetting(dailyReviewSetting, 'off');
    await setSetting(dailyPlanSetting, 'off');
    await setSetting(dailyPsalmsSetting, 'off');
    await setSetting(devotionalSetting, 'LLS:20.10.1');
    const items = await todayNow(NOW);
    expect(items).toHaveLength(1);
    expect(items![0].kind).toBe('devotional');
  });
});

describe('the request', () => {
  const TODAY: TodayItem[] = [
    { kind: 'review', title: 'Review: 17 due', done: false },
    { kind: 'plan', title: 'Reading plan: 3 John 1', done: true },
    { kind: 'psalm', title: 'Psalm 22', done: false },
  ];

  it('carries all of the day\'s items, done ones marked, and validates against the input schema', () => {
    const r = request(TODAY);
    expect(r.today).toEqual(TODAY);
    expect(validate(r, inputSchema)).toEqual([]);
  });

  it('has no `today` when Today holds nothing or in a quiz or the welcome', () => {
    expect('today' in request(undefined)).toBe(false);
    expect('today' in request([])).toBe(false);
    expect('today' in request(TODAY, { ...scope, quiz: true })).toBe(false);
    expect('today' in request(TODAY, { ...scope, welcome: true })).toBe(false);
  });

  it('fitHistory never cuts it', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ q: `Q${i}`, a: 'x'.repeat(900) }));
    const r = buildTalkRequest(scope, 'Now?', history, [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], undefined, TODAY);
    expect(fitHistory(r).today).toEqual(TODAY);
  });
});

describe('the answer\'s today_offer', () => {
  const good: TalkAnswer = { answer: 'Today you have Review: 17 due and Psalm 22.', question: 'What is on my drill?', words: [] };

  it('is `true` in the schema and in isTalkAnswer, and nothing else', () => {
    expect(validate({ ...good, today_offer: true }, answerSchema)).toEqual([]);
    expect(isTalkAnswer({ ...good, today_offer: true })).toBe(true);
    for (const bad of [false, 'yes', {}, 1]) {
      expect(isTalkAnswer({ ...good, today_offer: bad })).toBe(false);
      expect(validate({ ...good, today_offer: bad }, answerSchema)).not.toEqual([]);
    }
  });

  it('is kept only when the request carried today, once a talk, not in a quiz, not after his no', () => {
    const offer: TalkAnswer = { ...good, today_offer: true };
    const today: TodayItem[] = [{ kind: 'review', title: 'Review: 17 due', done: false }];
    expect(todayOfferOf(offer, scope, [], today)).toBe(true);
    expect(todayOfferOf(offer, scope, [], undefined)).toBe(false);
    expect(todayOfferOf(good, scope, [], today)).toBe(false);
    expect(todayOfferOf(offer, { ...scope, quiz: true }, [], today)).toBe(false);
    expect(todayOfferOf(offer, scope, [{ todayOffer: true }], today)).toBe(false);
    expect(todayOfferOf(offer, scope, [], today, true)).toBe(false);
  });
});

describe('taking the offer', () => {
  const turn = (over: Partial<TalkTurn> = {}): TalkTurn => ({ id: 1, ref: 'Romans 8', q: 'What is on my drill?', a: 'Review and Psalm 22.', when: 1, words: [], todayOffer: true, ...over }) as TalkTurn;

  it('waits as an offer of kind today with the button\'s text, until his tap or no settles it', () => {
    expect(offerOfTurn(turn())).toEqual({ kind: 'today', text: TODAY_BUTTON });
    expect(offerOfTurn(turn({ todayChoice: 'declined' }))).toBeUndefined();
    expect(pendingOfferOf([turn({ todayChoice: 'taken' })])?.offer.kind).toBe('today');
  });

  it('a tap opens Today and closes the open Talk sheet', async () => {
    let closed = 0;
    const unregister = registerTalkLeave(() => closed++);
    await db.talks.put({ ref: 'Romans 8', q: 'q', a: 'a', when: 1, words: [], todayOffer: true } as never);
    const kept = (await db.talks.toArray())[0] as TalkTurn;
    await takeTodayOffer(kept);
    expect(window.location.hash).toBe('#/today');
    expect(closed).toBe(1);
    expect((await db.talks.get(kept.id!))?.todayChoice).toBe('taken');
    unregister();
  });

  it('a spoken yes does what the tap does, and a spoken no withdraws it and opens nothing', async () => {
    await db.talks.put({ ref: 'Romans 8', q: 'q', a: 'a', when: 1, words: [], todayOffer: true } as never);
    const kept = (await db.talks.toArray())[0] as TalkTurn;
    const waiting = { turn: kept, offer: { kind: 'today' as const, text: TODAY_BUTTON } };
    await settleOffer('decline', waiting, scope);
    expect(window.location.hash).toBe('');
    expect((await db.talks.get(kept.id!))?.todayChoice).toBe('declined');
    await db.talks.update(kept.id!, { todayChoice: undefined });
    await settleOffer('confirm', waiting, scope);
    expect(window.location.hash).toBe('#/today');
    expect((await db.talks.get(kept.id!))?.todayChoice).toBe('taken');
  });
});

describe('the grind files', () => {
  it('lists today in the input schema, today_offer in the answer schema and `today` among the pending offers', () => {
    expect(Object.keys(inputSchema.properties ?? {})).toContain('today');
    expect(Object.keys(answerSchema.properties ?? {})).toContain('today_offer');
    const pending = JSON.stringify(inputSchema.properties?.pending_offer);
    expect(pending).toContain('"today"');
  });
});
