// A talk keeps a running summary on the device (mw-5r3p30.700): the talkSummaries table, repositories/talks.ts getTalkSummary / keepTalkSummary,
// the request's `summary` and `fold` (the turns that fell out of the 10-turn window and are not in the summary yet), fitHistory keeping the summary
// over every other optional part, and the answer's updated `summary`.
import Dexie from 'dexie';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import type { MemoryField } from '../../src/data/learnerMemory';
import { db } from '../../src/data/db';
import { addTurn, deleteTurns, getTalkSummary, keepTalkSummary } from '../../src/data/repositories/talks';
import { FOLD_A_CHARS, FOLD_MAX_TURNS, FOLD_Q_CHARS, MAX_HISTORY_TURNS, MAX_REQUEST_BYTES, TALK_SUMMARY_MAX, buildTalkRequest, fitHistory, isTalkAnswer, type TalkRequest } from '../../src/services/talk';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope = { title: 'Romans 8', chapter, verse: null };
const turn = (i: number, over: Partial<{ q: string; a: string }> = {}) => ({ q: `Question ${i}`, a: `Answer ${i}`, ...over });
const turns = (n: number) => Array.from({ length: n }, (_, i) => turn(i + 1));
/** the request for `question` after `ts`, with the summary the device keeps (text, and how many turns it holds) and his memory */
const build = (ts: { q: string; a: string }[], summary?: { text: string; covered: number }, memory?: MemoryField, question = 'Next?'): TalkRequest =>
  buildTalkRequest(scope, question, ts, [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, memory, undefined, undefined, undefined, [], summary);
const size = (r: TalkRequest) => new TextEncoder().encode(JSON.stringify(r)).length;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.talks.clear(), db.talkSummaries.clear(), db.talkPictures.clear()]);
});
afterAll(() => db.close());

describe('the summary kept per talk', () => {
  it('is saved under the talk and read back, and a later save replaces it', async () => {
    expect(await getTalkSummary('rom.8')).toBeUndefined();
    await keepTalkSummary('rom.8', 'He is 14 and reads Greek on Sundays.', 3, 100);
    expect(await getTalkSummary('rom.8')).toEqual({ ref: 'rom.8', summary: 'He is 14 and reads Greek on Sundays.', covered: 3, when: 100 });
    await keepTalkSummary('rom.8', 'Newer.', 4, 200);
    expect(await getTalkSummary('rom.8')).toEqual({ ref: 'rom.8', summary: 'Newer.', covered: 4, when: 200 });
    expect(await getTalkSummary('rom.8.28')).toBeUndefined();
  });

  it('goes with the talk when New talk forgets it, and no other talk loses its own', async () => {
    await addTurn('rom.8', 'q', 'a', []);
    await keepTalkSummary('rom.8', 'one', 1);
    await keepTalkSummary('rom.8.28', 'two', 1);
    await deleteTurns('rom.8');
    expect(await getTalkSummary('rom.8')).toBeUndefined();
    expect((await getTalkSummary('rom.8.28'))?.summary).toBe('two');
  });
});

describe('the upgrade from version 24', () => {
  it('adds the talkSummaries table and keeps every kept talk turn', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(24).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
      grammarLevels: 'id, level',
      usage: 'key, day, name',
      tips: 'id, status',
      talkPictures: '++id, turnId',
      shares: 'id, createdAt',
      requests: 'txid, sentAt, status',
      readingHistory: '++id, ref, [lang+at]',
      missTally: '[lang+unit], lang',
      ladder: 'lang',
      drillRuns: '++id, ideaId, at',
      passageLessons: 'key, state',
      pictureRefs: 'hash, at',
    });
    await old.open();
    const kept = { ref: 'rom.8', q: 'What is σάρξ?', a: 'Flesh.', words: [], when: 5 };
    await old.table('talks').put({ ...kept });
    old.close();

    await db.open();
    expect(db.verno).toBe(27);
    expect((await db.talks.toArray()).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id')))).toEqual([kept]);
    expect(await getTalkSummary('rom.8')).toBeUndefined();
    await keepTalkSummary('rom.8', 'Asked about σάρξ.', 1);
    expect((await getTalkSummary('rom.8'))?.covered).toBe(1);
  });
});

describe('the request carries the summary and what fell out of the window', () => {
  it('a talk inside the window has no fold and, with none kept, no summary', () => {
    const r = buildTalkRequest(scope, 'Next?', turns(MAX_HISTORY_TURNS), []);
    expect('summary' in r).toBe(false);
    expect('fold' in r).toBe(false);
    expect(r.history).toHaveLength(MAX_HISTORY_TURNS);
  });

  it('sends the kept summary every turn, inside the window or not', () => {
    const summary = { text: 'He named his son Luke.', covered: 0 };
    expect(build(turns(2), summary).summary).toBe('He named his son Luke.');
    expect(build(turns(14), summary).summary).toBe('He named his son Luke.');
  });

  it('puts the turns older than the last 10 that the summary does not hold into `fold`, the oldest first, and the last 10 into history', () => {
    const r = build(turns(12), { text: 'S', covered: 0 }, undefined, 'Next?');
    expect(r.history.map((t) => t.q)).toEqual(turns(12).slice(2).map((t) => t.q));
    expect(r.fold).toEqual([turn(1), turn(2)]);
    expect('unfolded' in r).toBe(false);
  });

  it('starts the fold after the turns the summary already holds', () => {
    const r = build(turns(13), { text: 'S', covered: 2 }, undefined, 'Next?');
    expect(r.fold).toEqual([turn(3)]);
    const caught = build(turns(13), { text: 'S', covered: 3 }, undefined, 'Next?');
    expect('fold' in caught).toBe(false);
  });

  it('folds at most FOLD_MAX_TURNS at a time and says how many older ones wait (`unfolded`)', () => {
    const r = build(turns(30), { text: 'S', covered: 0 }, undefined, 'Next?');
    expect(r.fold).toEqual(turns(30).slice(0, FOLD_MAX_TURNS));
    expect(r.unfolded).toBe(30 - MAX_HISTORY_TURNS - FOLD_MAX_TURNS);
  });

  it('clips a long turn in the fold, its question and its answer', () => {
    const long = turn(1, { q: 'q'.repeat(900), a: 'a'.repeat(900) });
    const r = build([long, ...turns(10)], { text: '', covered: 0 }, undefined, 'Next?');
    expect(r.fold?.[0].q.length).toBeLessThanOrEqual(FOLD_Q_CHARS);
    expect(r.fold?.[0].a.length).toBeLessThanOrEqual(FOLD_A_CHARS);
    expect(r.fold?.[0].q.endsWith('…')).toBe(true);
  });
});

describe('fitHistory at the cap keeps the summary over every other optional part', () => {
  const SUMMARY = 'S'.repeat(TALK_SUMMARY_MAX);

  /** a request over the cap with a summary, a long history, a fold, his requests and his memory notes */
  const big = (): TalkRequest => ({
    ...build(turns(10).map((t) => ({ ...t, a: 'x'.repeat(700) })), { text: SUMMARY, covered: 0 }, { index: 'i'.repeat(300), notes: [{ name: 'book:Romans', text: 'n'.repeat(900) }, { name: 'word:σάρξ', text: 'm'.repeat(900) }] } as TalkRequest['memory'], 'What about verse 2?'),
    fold: [turn(0)],
  });

  it('is over the cap before the fit, and under it after', () => {
    expect(size(big())).toBeGreaterThan(MAX_REQUEST_BYTES);
    expect(size(fitHistory(big()))).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('keeps the summary whole while the older turns, the words, his requests and his notes go', () => {
    const fitted = fitHistory(big());
    expect(fitted.summary).toBe(SUMMARY);
    expect(fitted.history.length).toBeGreaterThan(0);
    expect(fitted.history.at(-1)?.q).toBe('Question 10');
  });

  it('drops the summary only after the newest turn would be: a request whose newest turn and summary cannot both fit keeps the turn and loses nothing it could not', () => {
    // his own words fill the cap: the question is as long as it may be and the summary takes the rest
    const huge = build([turn(1, { q: 'q'.repeat(3000), a: 'a'.repeat(3000) })], { text: SUMMARY, covered: 0 }, undefined, 'w'.repeat(4000));
    const fitted = fitHistory({ ...huge, question: 'w'.repeat(4000), greek: 'γ'.repeat(2000), english: 'e'.repeat(2000) });
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    // the newest turn is kept before the summary goes: when something must give, it is the summary after the turn
    if (fitted.summary === undefined) expect(fitted.history).toHaveLength(0);
    else expect(fitted.summary).toBe(SUMMARY);
  });

  it('moves a turn it drops from the history into the fold, clipped, after the turns already there', () => {
    const request = build(turns(10).map((t) => ({ q: `${t.q} ${'w'.repeat(500)}`, a: 'x'.repeat(1400) })), { text: 'S', covered: 0 }, undefined, 'Next?');
    const withFold: TalkRequest = { ...request, fold: [turn(0)] };
    const fitted = fitHistory(withFold);
    const dropped = withFold.history.length - fitted.history.length;
    expect(dropped).toBeGreaterThan(0);
    expect(fitted.fold?.map((t) => t.q.slice(0, 11))).toEqual(['Question 0', ...withFold.history.slice(0, dropped).map((t) => t.q.slice(0, 11))].slice(0, fitted.fold?.length));
    expect(fitted.fold?.[0].q).toBe('Question 0');
    expect(fitted.fold?.length).toBeGreaterThan(1);
    for (const t of fitted.fold ?? []) expect(t.a.length).toBeLessThanOrEqual(FOLD_A_CHARS);
    expect(size(fitted)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('does not fold again a turn the summary holds already (`held`): the first `held` turns of the history drop without a fold', () => {
    const request = build(turns(10).map((t) => ({ q: `${t.q} ${'w'.repeat(500)}`, a: 'x'.repeat(1400) })), { text: 'S', covered: 0 });
    const names = (r: TalkRequest) => (r.fold ?? []).map((t) => t.q.split(' ').slice(0, 2).join(' '));
    const free = fitHistory(request, 0);
    expect(names(free)).toContain('Question 1');
    expect(names(free)).toContain('Question 2');
    const held = fitHistory(request, 2);
    expect(names(held)).not.toContain('Question 1');
    expect(names(held)).not.toContain('Question 2');
    expect(held.history.length).toBeGreaterThan(0);
    expect(size(held)).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('moves nothing into the fold while older turns wait behind it (`unfolded`): the summary would skip them', () => {
    const request = buildTalkRequest(scope, 'Next?', [...turns(5), ...turns(10).map((t) => ({ ...t, a: 'x'.repeat(1400) }))].slice(0, 25), [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], undefined, undefined, false, undefined, undefined, undefined, undefined, [], { text: 'S', covered: 0 });
    const fitted = fitHistory({ ...request, unfolded: 3, fold: [turn(0)] });
    expect(fitted.fold?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe('the answer may carry the updated summary', () => {
  it('is accepted up to TALK_SUMMARY_MAX characters and no more, and never empty', () => {
    expect(isTalkAnswer({ answer: 'Yes.', words: [], summary: 'He is 14.' })).toBe(true);
    expect(isTalkAnswer({ answer: 'Yes.', words: [], summary: 's'.repeat(TALK_SUMMARY_MAX) })).toBe(true);
    expect(isTalkAnswer({ answer: 'Yes.', words: [], summary: 's'.repeat(TALK_SUMMARY_MAX + 1) })).toBe(false);
    expect(isTalkAnswer({ answer: 'Yes.', words: [], summary: '' })).toBe(false);
  });
});
