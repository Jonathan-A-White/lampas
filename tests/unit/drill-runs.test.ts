// Drill it's runs kept on the device (mw-i7xe0n.2): the drillRuns table, repositories/drillRuns.ts, the upgrade from version 18, and the
// weak facets in the tutor's learner_grammar (`weak`: idea title -> weak facet labels, from each idea's latest run, dropped once a later run proves it).
import Dexie from 'dexie';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { DrillResult } from '../../src/data/grammar/drillIt';
import {
  GRAMMAR_WEAK_IDEAS_MAX,
  GRAMMAR_WEAK_LABELS_MAX,
  LEARNER_GRAMMAR_MAX_BYTES,
  learnerGrammar,
  learnerGrammarOf,
  type GrammarSnapshot,
} from '../../src/data/grammar/learnerGrammar';
import { LADDER } from '../../src/data/grammar/ladder';
import { latestDrillRunFor, saveDrillRun, weakFacets } from '../../src/data/repositories/drillRuns';
import { setLevel } from '../../src/data/repositories/grammarLevels';
import { stubChapterFetch } from '../support/chapter-fetch';

const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;
const facet = (id: string, label = id) => ({ id, label });

const run = (ideaId: string, over: Partial<DrillResult> = {}): DrillResult => ({
  ideaId,
  proved: false,
  edgeStep: 1,
  topStep: 3,
  strong: [facet('meaning', 'what it is')],
  weak: [facet('ending', 'its ending'), facet('spot', 'spotting it in a verse')],
  answers: [],
  ended: 'edge',
  ...over,
});

beforeEach(async () => {
  await db.open();
  await Promise.all([db.drillRuns.clear(), db.settings.clear(), db.grammarLevels.clear(), db.words.clear(), db.meta.clear()]);
  stubChapterFetch();
});
afterAll(() => db.close());

describe('the upgrade from version 18', () => {
  it('adds the drillRuns table and keeps his grammar levels, reviews and words', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(18).stores({
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
    });
    await old.open();
    const level = { id: 'case-genitive', level: 'frontier', since: 5, how: 'sheet' };
    const review = { kind: 'grammar', id: 'case-genitive', step: 2, due: 9, lastWhen: 4, lapses: 0, rights: 3 };
    const word = { lemma: 'λέγω', lemmas: [], gloss: 'say', lesson: 1, state: 'solid', since: 5 };
    await old.table('grammarLevels').put(level);
    await old.table('reviews').put(review);
    await old.table('words').put(word);
    old.close();

    await db.open();
    expect(db.verno).toBe(27);
    expect(await db.grammarLevels.toArray()).toEqual([level]);
    expect(await db.reviews.toArray()).toEqual([review]);
    expect(await db.words.toArray()).toEqual([word]);
    expect(await db.drillRuns.count()).toBe(0);
    await saveDrillRun(run('case-genitive'), 11);
    expect(await db.drillRuns.count()).toBe(1);
  });
});

describe('the runs kept', () => {
  it('keeps both runs of one idea and latestFor returns the newer', async () => {
    await saveDrillRun(run('case-genitive', { edgeStep: 1 }), 100);
    await saveDrillRun(run('case-genitive', { edgeStep: 2, proved: true, weak: [] }), 200);
    expect(await db.drillRuns.count()).toBe(2);
    const latest = await latestDrillRunFor('case-genitive');
    expect(latest).toMatchObject({ ideaId: 'case-genitive', at: 200, proved: true, edgeStep: 2, topStep: 3, ended: 'edge', weak: [] });
    expect(latest?.strong).toEqual([facet('meaning', 'what it is')]);
    expect(await latestDrillRunFor('case-dative')).toBeUndefined();
  });

  it('the later save wins when two runs have the same time', async () => {
    await saveDrillRun(run('case-genitive', { edgeStep: 1 }), 100);
    await saveDrillRun(run('case-genitive', { edgeStep: 2 }), 100);
    expect((await latestDrillRunFor('case-genitive'))?.edgeStep).toBe(2);
  });

  it('weakFacets lists the weak facets of each idea\'s latest run, and nothing for a proved run or one with none', async () => {
    await saveDrillRun(run('case-genitive'), 100);
    await saveDrillRun(run('case-dative', { weak: [facet('ending', 'its ending')] }), 110);
    await saveDrillRun(run('case-dative', { proved: true, weak: [] }), 120);
    await saveDrillRun(run('case-accusative', { weak: [] }), 130);
    await saveDrillRun(run('case-nominative', { proved: true, weak: [facet('spot', 'spotting it')] }), 140);
    const weak = await weakFacets();
    expect([...weak.keys()]).toEqual(['case-genitive']);
    expect(weak.get('case-genitive')).toEqual({ at: 100, labels: ['its ending', 'spotting it in a verse'] });
  });
});

describe('learner_grammar carries the weak facets', () => {
  it('lists the noun\'s weak facets after a failed run and not after a proved one', async () => {
    expect((await learnerGrammar()).weak).toBeUndefined();
    await saveDrillRun(run('case-genitive'), 100);
    expect((await learnerGrammar()).weak).toEqual({ 'The genitive case': ['its ending', 'spotting it in a verse'] });
    await saveDrillRun(run('case-genitive', { proved: true, weak: [] }), 200);
    expect((await learnerGrammar()).weak).toBeUndefined();
  });

  it('keeps the field inside 900 bytes with 40 ideas\' weak facets, trimming the oldest first', async () => {
    const ideas = LADDER.slice(0, 40);
    for (const [i, idea] of ideas.entries()) {
      await saveDrillRun(run(idea.id, { weak: [facet('a', `weak facet ${i} of the first kind`), facet('b', `weak facet ${i} of the second`), facet('c', 'third')] }), 1000 + i);
    }
    await setLevel('case-genitive', 'frontier', 'sheet');
    const out = await learnerGrammar();
    expect(bytes(out)).toBeLessThanOrEqual(LEARNER_GRAMMAR_MAX_BYTES);
    const titles = Object.keys(out.weak ?? {});
    expect(titles.length).toBeGreaterThan(0);
    expect(titles.length).toBeLessThanOrEqual(GRAMMAR_WEAK_IDEAS_MAX);
    // the newest runs are the ones kept: the last idea drilled is named, the first is not
    expect(titles).toContain(ideas[39].title);
    expect(titles).not.toContain(ideas[0].title);
    for (const labels of Object.values(out.weak ?? {})) expect(labels.length).toBeLessThanOrEqual(GRAMMAR_WEAK_LABELS_MAX);
  });
});

describe('learnerGrammarOf with weak facets', () => {
  const snapshot = (over: Partial<GrammarSnapshot> = {}): GrammarSnapshot => ({
    goal: 'Read 1 John 1:1',
    words: { solid: 3, frontier: 2, notYet: 9 },
    ideas: [],
    placed: true,
    move: 'none',
    pickerLevel: 'frontier',
    approach: { name: 'Lampas ladder', credit: null, nextLesson: 'The nominative' },
    ...over,
  });
  const long = (n: number) => `a long title for a weak facet number ${n}`.padEnd(40, 'x');

  it('holds 900 bytes with 40 long weak ideas on top of 40 ideas at every level', () => {
    const ideas = (['solid', 'frontier', 'notYet'] as const).flatMap((level) => Array.from({ length: 40 }, (_, i) => ({ id: `${level}-${i}`, title: `A long title for ${level} idea ${i}`.padEnd(42, 'x'), level })));
    const weak = Array.from({ length: 40 }, (_, i) => ({ title: `Weak idea ${i}`.padEnd(40, 'y'), at: i, labels: [long(1), long(2), long(3), long(4), long(5)] }));
    const out = learnerGrammarOf(snapshot({ ideas, weak }));
    expect(bytes(out)).toBeLessThanOrEqual(900);
    expect(Object.keys(out.weak ?? {}).length).toBeGreaterThan(0);
  });

  it('has no weak key when there are none', () => {
    expect('weak' in learnerGrammarOf(snapshot())).toBe(false);
    expect('weak' in learnerGrammarOf(snapshot({ weak: [] }))).toBe(false);
  });
});
