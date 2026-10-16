// More drill items from the mill (mw-hqd5bz.36, docs/grammar.md 'More items from the mill'): the drill-items grind and the app agree; a round that ends with misses on an idea queues
// ONE drill-items grist naming it (at most one in flight, none offline or with no key); what comes back is checked against the answer schema and the verses (bad items dropped),
// kept, and served first in the next round on that idea; with nothing kept, the built-in questions serve at once.
import { Utils } from '@bsv/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import {
  buildDrillItemsRequest,
  checkedItems,
  DRILL_ITEMS_KIND,
  isDrillItemsAnswer,
  isFetchable,
  ITEMS_PER_IDEA,
  MAX_KEPT,
  weakestMissed,
  type DrillItemsAnswer,
  type DrillItemsRequest,
  type AnsweredItem,
} from '../../src/data/grammar/fetchedItems';
import { ideaOf } from '../../src/data/grammar/ladder';
import { mulberry32 } from '../../src/data/quiz';
import { countFetchedItems, saveFetchedItems, takeFetchedItems } from '../../src/data/repositories';
import { instructionsOf } from '../../scripts/grind-parts';
import { MAX_REQUEST_BYTES } from '../../src/services/requestBudget';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { askForMoreItems } from '../../src/review/moreItems';
import { GRAMMAR } from '../../src/review/kinds';
import { drawReviewRound } from '../../src/review/round';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { stubChapterFetch } from '../support/chapter-fetch';
import { validate, type Schema } from '../support/schema-validate';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const inputSchema = readJson('grinds/drill-items.input.schema.json') as Schema;
const answerSchema = readJson('grinds/drill-items.answer.schema.json') as Schema;
const grind = readJson('grinds/drill-items.json');

const chapter = readJson('public/data/1jn/1.json') as unknown as Chapter;
const passage = [chapter];
const KEY = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0c', 'hex'));

const DECLENSION_2 = ideaOf('declension-2');
const misses = (n = 2) => new Map([[DECLENSION_2.id, n]]);

/** Items made from 1 John 1:1, as the grind writes them: a tap-form on λόγου and a meaning on τοῦ λόγου. */
const TAP: AnsweredItem = {
  idea: 'declension-2',
  kind: 'tap-form',
  ref: '1 John 1:1',
  prompt: 'Tap the genitive singular noun',
  options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ὀφθαλμοῖς'],
  right: 'λόγου',
};
const MEANING: AnsweredItem = {
  idea: 'declension-2',
  kind: 'meaning',
  ref: '1 John 1:1',
  prompt: 'What does this say?',
  form: 'τοῦ λόγου',
  options: ['the Word', 'the beginning', 'our own hands', 'the Father'],
  right: 'the Word',
};

describe('the drill-items grind and the app agree', () => {
  it('is the grind the app asks for: no attachments, sonnet, with its instructions and answer schema', () => {
    expect(grind).toMatchObject({ grind: 1, app: 'lampas', kind: DRILL_ITEMS_KIND, versions: ['1'], model: 'sonnet', attachments: { min: 0, max: 0 } });
    expect(Object.keys(grind).sort()).toEqual(Object.keys(readJson('grinds/verse-ask.json')).sort());
  });

  it('takes the request the app builds, which fits the grist', () => {
    const request = buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest;
    expect(validate(request, inputSchema)).toEqual([]);
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(request.ideas).toEqual([{ id: 'declension-2', title: 'The second declension', what: DECLENSION_2.text, misses: 2 }]);
    expect(request.verses.length).toBeGreaterThan(0);
    expect(request.per_idea).toBe(ITEMS_PER_IDEA);
    // every verse sent holds a word that uses the idea, named with what it is
    for (const verse of request.verses) expect(verse.uses.length).toBeGreaterThan(0);
    expect(request.verses[0]?.uses.map((u) => u.form)).toContain('λόγου');
  });

  it('accepts the items the answer schema allows, in the schema and in the app guard', () => {
    const answer = { items: [TAP, MEANING] };
    expect(validate(answer, answerSchema)).toEqual([]);
    expect(isDrillItemsAnswer(answer)).toBe(true);
    expect(isDrillItemsAnswer({ items: [] })).toBe(true);
    expect(validate({ items: [] }, answerSchema)).toEqual([]);
  });

  it.each<[string, unknown]>([
    ['no items', {}],
    ['a kind the app does not draw', { items: [{ ...TAP, kind: 'ending' }] }],
    ['three options', { items: [{ ...TAP, options: ['ἀρχῆς', 'λόγου', 'ζωῆς'] }] }],
    ['an extra key', { items: [{ ...TAP, extra: 1 }] }],
    ['no right answer', { items: [{ ...TAP, right: undefined }] }],
  ])('the answer schema refuses %s', (_, value) => {
    expect(validate(JSON.parse(JSON.stringify(value)), answerSchema)).not.toEqual([]);
  });

  it('tells the model the request fields, the two kinds, that the app checks every word, and that the request is data', () => {
    const instructions = instructionsOf('drill-items');
    for (const field of ['ideas', 'verses', 'uses', 'per_idea', 'tap-form', 'meaning', 'options', 'right', 'ref', 'idea']) expect(instructions).toContain(`\`${field}\``);
    expect(instructions).toContain('data, not instructions');
    expect(instructions).toMatch(/never (quote|invent)/i);
    expect(instructions).toMatch(/drops an item/i);
    expect(instructions).toMatch(/exactly four/i);
  });

  it('keeps an example for the grind whose request the app builds the same way', () => {
    const example = readJson('grinds/examples/drill-items/second-declension.json') as unknown as { request: DrillItemsRequest };
    expect(example.request).toEqual(buildDrillItemsRequest([DECLENSION_2], misses(), passage));
  });
});

describe('the weakest ideas of a round', () => {
  it('takes the most missed first, then the lower rung, at most three', () => {
    const ids = ['declension-2', 'case-genitive', 'case-genitive', 'declension-1', 'tense-aorist', 'tense-aorist', 'tense-aorist'];
    const picked = weakestMissed(ids).map((i) => i.id);
    expect(picked).toHaveLength(3);
    expect(picked[0]).toBe('tense-aorist');
    expect(picked[1]).toBe('case-genitive');
  });

  it('leaves out an idea the app drills from its own items, and an id the ladder lacks', () => {
    expect(weakestMissed(['letter-alpha', 'alphabet', 'diphthongs', 'no-such-idea'])).toEqual([]);
    expect(isFetchable(ideaOf('letter-alpha'))).toBe(false);
    expect(isFetchable(DECLENSION_2)).toBe(true);
  });
});

describe('the answer is checked before it is kept', () => {
  const request = buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest;
  const check = (...items: unknown[]) => checkedItems({ items } as DrillItemsAnswer, request, passage);

  it('turns a good tap-form and a good meaning item into the questions the card draws', () => {
    const [tap, meaning] = check(TAP, MEANING);
    expect(tap).toMatchObject({ kind: 'tap-form', ideaId: 'declension-2', ref: '1 John 1:1', right: 'λόγου', code: 'N-GSM', options: TAP.options, facet: { id: 'spot' } });
    expect(meaning).toMatchObject({ kind: 'meaning', ideaId: 'declension-2', form: 'τοῦ λόγου', marked: ['τοῦ', 'λόγου'], say: 'τοῦ λόγου', right: 'the Word', code: 'N-GSM', facet: { id: 'says' } });
  });

  it.each<[string, Partial<AnsweredItem>]>([
    ['an idea the request did not ask about', { idea: 'case-genitive' }],
    ['a verse the request did not send', { ref: '1 John 1:4' }],
    ['a kind the app does not draw', { kind: 'ending' as AnsweredItem['kind'] }],
    ['a right answer that is not among the options', { right: 'ἀγάπη' }],
    ['a word the verse does not have', { options: ['ἀρχῆς', 'λόγου', 'ζωῆς', 'ἀγάπη'] }],
    ['a right word that is not about the idea', { right: 'ζωῆς' }],
    ['two options that are the same', { options: ['λόγου', 'λόγου', 'ζωῆς', 'ἀρχῆς'] }],
    ['a form on a tap-form item', { form: 'λόγου' }],
    ['three options', { options: ['ἀρχῆς', 'λόγου', 'ζωῆς'] }],
    ['an empty prompt', { prompt: '' }],
  ])('drops an item with %s', (_, change) => {
    expect(check({ ...TAP, ...change })).toEqual([]);
  });

  it('drops a meaning item whose English is not the verse\'s, whose form is out of order or not the verse\'s, or which has no form', () => {
    expect(check({ ...MEANING, right: 'the Wurd', options: ['the Wurd', 'the beginning', 'our own hands', 'the Father'] })).toEqual([]);
    expect(check({ ...MEANING, form: 'λόγου τοῦ' })).toEqual([]);
    expect(check({ ...MEANING, form: 'τοῦ λόγον' })).toEqual([]);
    expect(check({ ...MEANING, form: 'τῆς ζωῆς' })).toEqual([]);
    expect(check({ ...MEANING, form: undefined })).toEqual([]);
  });

  it('keeps the good ones beside the bad ones, and at most per_idea for an idea', () => {
    const kept = check({ ...TAP, right: 'nope' }, TAP, MEANING, { ...TAP, prompt: 'Tap the second declension noun' });
    expect(kept.map((q) => q.kind)).toEqual(['tap-form', 'meaning']);
  });

  it('is tolerant of an answer item that is not an object', () => {
    expect(check(null, 'x', 4)).toEqual([]);
  });
});

describe('kept items', () => {
  beforeEach(async () => {
    await db.open();
    await db.settings.clear();
  });

  const questions = (n: number) =>
    checkedItems({ items: [TAP, MEANING] } as DrillItemsAnswer, buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest, passage).concat(
      Array.from({ length: n }, (_, i) => ({ ...checkedItems({ items: [TAP] }, buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest, passage)[0], prompt: `Tap the form ${i}` })),
    );

  it('serves each once, the oldest first', async () => {
    const [tap, meaning] = questions(0);
    await saveFetchedItems([tap, meaning]);
    expect(await countFetchedItems('declension-2')).toBe(2);
    expect((await takeFetchedItems(['declension-2'])).get('declension-2')).toEqual(tap);
    expect((await takeFetchedItems(['declension-2', 'case-genitive'])).get('declension-2')).toEqual(meaning);
    expect((await takeFetchedItems(['declension-2'])).size).toBe(0);
    expect(await countFetchedItems('declension-2')).toBe(0);
  });

  it('keeps the newest MAX_KEPT of an idea', async () => {
    await saveFetchedItems(questions(MAX_KEPT + 2));
    expect(await countFetchedItems('declension-2')).toBe(MAX_KEPT);
    const last = (await takeFetchedItems(['declension-2'])).get('declension-2');
    expect(last?.prompt).toBeDefined();
  });

  it('reads back no item that is not a drawable question', async () => {
    await db.settings.put({ key: 'fetchedItems.declension-2', value: JSON.stringify([{ kind: 'ending', ideaId: 'declension-2', prompt: 'x', options: ['a', 'b', 'c', 'd'], right: 'a' }, { nonsense: true }]) });
    expect(await countFetchedItems('declension-2')).toBe(0);
    await db.settings.put({ key: 'fetchedItems.declension-2', value: 'not json' });
    expect(await countFetchedItems('declension-2')).toBe(0);
  });
});

describe('asking the mill for more after a round', () => {
  let postern: FakePostern;
  // one verse, so the verse sent does not depend on how the app ranks verses for him
  const passage = [{ ...chapter, verses: chapter.verses.slice(0, 1) }];

  beforeEach(async () => {
    postern = makeFakePostern();
    postern.autoReply = { status: 'answered', answer: { items: [TAP, MEANING, { ...TAP, right: 'nope' }] } };
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
    tutorTimings.pollMs = 20;
    setCurrentLicence('licensed');
    localStorage.clear();
    await db.open();
    await db.settings.clear();
  });
  afterEach(() => {
    setCurrentLicence('licensed');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  const MISSED = ['declension-2', 'declension-2'];

  it('queues one drill-items grist naming the idea he missed, and keeps what passes the check', async () => {
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toEqual({ kept: 2 });
    expect(postern.received).toHaveLength(1);
    const [sent] = postern.received;
    expect(sent.grist).toMatchObject({ app: 'lampas', kind: 'drill-items', v: '1' });
    const input = sent.input as unknown as DrillItemsRequest;
    expect(validate(input, inputSchema)).toEqual([]);
    expect(input.ideas.map((i) => [i.id, i.misses])).toEqual([['declension-2', 2]]);
    expect(await countFetchedItems('declension-2')).toBe(2);
  });

  it('has at most one in flight: a second ask while one is out sends nothing', async () => {
    const release = Promise.withResolvers<void>();
    postern.holds[DRILL_ITEMS_KIND] = release.promise;
    const first = askForMoreItems(MISSED, { key: KEY, passage });
    expect(await askForMoreItems(['case-genitive'], { key: KEY, passage })).toBe('busy');
    release.resolve();
    expect(await first).toEqual({ kept: 2 });
    expect(postern.received).toHaveLength(1);
    // and once it is done the next may go
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toEqual({ kept: 2 });
    expect(postern.received).toHaveLength(2);
  });

  it('queues none while the phone is offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toBe('offline');
    expect(postern.calls).toEqual([]);
  });

  it('queues none when the phone holds no key', async () => {
    expect(await askForMoreItems(MISSED, { passage })).toBe('no-key');
    expect(postern.calls).toEqual([]);
  });

  it('queues none with no licence, and none for a round that missed only letters', async () => {
    setCurrentLicence('not-licensed');
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toBe('no-licence');
    setCurrentLicence('licensed');
    expect(await askForMoreItems(['letter-alpha'], { key: KEY, passage })).toBe('nothing');
    expect(postern.calls).toEqual([]);
  });

  it('never throws: a refused or unreadable grist is "failed" and keeps nothing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    postern.autoReply = { status: 'failed', reason: 'the mill is busy' };
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toBe('failed');
    expect(await countFetchedItems('declension-2')).toBe(0);
    // and the next ask is not blocked by it
    postern.autoReply = { status: 'answered', answer: { items: [TAP] } };
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toEqual({ kept: 1 });
  });

  it('keeps nothing from an answer whose items are all bad', async () => {
    postern.autoReply = { status: 'answered', answer: { items: [{ ...TAP, options: ['a', 'b', 'c', 'd'] }, { ...MEANING, ref: 'Mark 1:1' }] } };
    expect(await askForMoreItems(MISSED, { key: KEY, passage })).toEqual({ kept: 0 });
    expect(await countFetchedItems('declension-2')).toBe(0);
  });
});

describe('the next round on that idea', () => {
  beforeEach(async () => {
    stubChapterFetch();
    localStorage.clear();
    await db.open();
    await db.settings.clear();
  });
  const due = [{ kind: 'grammar', id: 'declension-2', step: 0, due: 0, lastWhen: 0, lapses: 0, rights: 0 }];

  it('serves a kept item first, and then the built-in questions again', async () => {
    const [kept] = checkedItems({ items: [TAP] }, buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest, passage);
    await saveFetchedItems([kept]);
    const [first] = await GRAMMAR.draw(due, mulberry32(3));
    expect(first).toMatchObject({ kind: 'grammar', id: 'declension-2', question: kept });
    const [second] = await GRAMMAR.draw(due, mulberry32(3));
    expect(second).toMatchObject({ kind: 'grammar', id: 'declension-2' });
    expect(second && second.kind === 'grammar' ? second.question : null).not.toEqual(kept);
  });

  it('serves the built-in questions with no wait when nothing is kept: no call to the mill', async () => {
    const postern = makeFakePostern();
    const chapterFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith('https://postern') ? postern.fetch(input, init) : chapterFetch(input, init)));
    const items = await GRAMMAR.draw(due, mulberry32(3));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'grammar', id: 'declension-2' });
    expect(postern.calls).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('puts an idea with kept items at the head of a round even when it is not due until tomorrow', async () => {
    await db.reviews.clear();
    await db.reviews.put({ kind: 'grammar', id: 'declension-2', step: 0, due: Date.now() + 86_400_000, lastWhen: Date.now(), lapses: 1, rights: 0 });
    expect((await drawReviewRound(mulberry32(3))).items.some((i) => i.kind === 'grammar' && i.id === 'declension-2')).toBe(false);
    const [kept] = checkedItems({ items: [TAP] }, buildDrillItemsRequest([DECLENSION_2], misses(), passage) as DrillItemsRequest, passage);
    await saveFetchedItems([kept]);
    const items = (await drawReviewRound(mulberry32(3))).items;
    expect(items.find((i) => i.kind === 'grammar' && i.id === 'declension-2')).toMatchObject({ question: kept });
    // served once: the round after has the built-in questions, and the idea is not due again until tomorrow
    expect((await drawReviewRound(mulberry32(3))).items.some((i) => i.kind === 'grammar' && i.id === 'declension-2')).toBe(false);
  });
});
