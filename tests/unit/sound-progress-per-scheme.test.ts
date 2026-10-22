// Sound progress is kept per pronunciation (mw-5r3p30.231): the letters, sounds and marks ideas have a level, a schedule row and evidence in each scheme; the
// grammar ideas are one level for all. The upgrade moves what was proved before to Modern Greek.
import Dexie from 'dexie';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { LADDER, TIERS } from '../../src/data/grammar/ladder';
import { learnerGrammar } from '../../src/data/grammar/learnerGrammar';
import { ideaOfStored, isSoundIdea, storedId } from '../../src/data/grammar/soundScope';
import { getEvidence, noteAnswer } from '../../src/data/repositories/inference';
import { getLevel, listLevels, recordGrammarAnswer, setLevel, teachIdea } from '../../src/data/repositories/grammarLevels';
import { countDue, listDue } from '../../src/data/repositories/reviews';
import { setGreekPronunciation } from '../../src/data/repositories/settings';
import { registerPronunciation, type Pronunciation } from '../../src/speech/pronunciation';
import { MODERN } from '../../src/speech/schemes/modern';

const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);
const ERASMIAN: Pronunciation = { ...MODERN, id: 'erasmian', label: 'Erasmian Greek' };
let unregister: (() => void) | undefined;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.reviews.clear(), db.settings.clear(), db.meta.clear(), db.words.clear()]);
  unregister = registerPronunciation(ERASMIAN);
});
afterEach(() => unregister?.());
afterAll(() => db.close());

describe('which ideas are about sound', () => {
  it('are the ideas of the letters, sounds and marks tiers, and no other', () => {
    const sound = LADDER.filter((idea) => ['letters', 'sounds', 'marks'].includes(idea.tier)).map((idea) => idea.id);
    expect(TIERS.slice(0, 3)).toEqual(['letters', 'sounds', 'marks']);
    expect(LADDER.filter((idea) => isSoundIdea(idea.id)).map((idea) => idea.id)).toEqual(sound);
  });

  it('are stored under the scheme and read back under that scheme only', () => {
    expect(storedId('breathing-rough', 'modern')).toBe('modern:breathing-rough');
    expect(storedId('noun-case', 'modern')).toBe('noun-case');
    expect(ideaOfStored('modern:breathing-rough', 'modern')).toBe('breathing-rough');
    expect(ideaOfStored('modern:breathing-rough', 'erasmian')).toBeUndefined();
    expect(ideaOfStored('case-genitive', 'erasmian')).toBe('case-genitive');
  });
});

describe('a learner solid on the rough breathing in modern', () => {
  beforeEach(async () => {
    await setLevel('breathing-rough', 'solid', 'sheet', NOW);
    await setLevel('case-genitive', 'solid', 'sheet', NOW);
    await teachIdea('breathing-rough', 'known', NOW);
  });

  it('starts the rough breathing again in a second scheme and keeps the grammar ideas', async () => {
    const review = await db.reviews.get(['grammar', 'modern:breathing-rough']);
    expect(review).toBeDefined();
    await setGreekPronunciation('erasmian');
    expect((await getLevel('breathing-rough'))?.level).toBeUndefined();
    expect((await listLevels()).get('breathing-rough')).toBeUndefined();
    expect((await listLevels()).get('case-genitive')?.level).toBe('solid');
    await setGreekPronunciation('modern');
    expect((await getLevel('breathing-rough'))?.level).toBe('solid');
    expect(await db.reviews.get(['grammar', 'modern:breathing-rough'])).toEqual(review);
  });

  it('proves a sound idea in the selected scheme only', async () => {
    await setGreekPronunciation('erasmian');
    await teachIdea('breathing-smooth', 'known', NOW, 'drill');
    expect(await db.grammarLevels.get('erasmian:breathing-smooth')).toMatchObject({ level: 'solid', how: 'drill' });
    expect(await db.grammarLevels.get('modern:breathing-smooth')).toBeUndefined();
    await setGreekPronunciation('modern');
    expect((await getLevel('breathing-smooth'))?.level).toBeUndefined();
  });

  it('is asked the sounds of the selected scheme only, in Review', async () => {
    const later = NOW + 400 * 24 * 3600 * 1000;
    expect((await listDue('grammar', later)).map((r) => r.id).sort()).toEqual(['breathing-rough']);
    await setGreekPronunciation('erasmian');
    expect(await listDue('grammar', later)).toEqual([]);
    expect(await countDue(later)).toBe(0);
    await recordGrammarAnswer('breathing-rough', true, NOW);
    expect(await db.reviews.get(['grammar', 'erasmian:breathing-rough'])).toBeDefined();
    expect((await db.reviews.get(['grammar', 'modern:breathing-rough']))?.rights).toBe(0);
  });

  it('keeps the evidence of each scheme apart', async () => {
    const question = { kind: 'breathing', ideaId: 'breathing-rough', form: 'βλέπω', right: 'smooth' } as const;
    await noteAnswer(question, true, NOW);
    expect((await getEvidence()).get('letter-beta')?.run).toBe(1);
    await setGreekPronunciation('erasmian');
    expect((await getEvidence()).get('letter-beta')).toBeUndefined();
    await noteAnswer(question, true, NOW);
    await noteAnswer(question, true, NOW);
    expect((await getEvidence()).get('letter-beta')?.run).toBe(2);
    await setGreekPronunciation('modern');
    expect((await getEvidence()).get('letter-beta')?.run).toBe(1);
  });

  it('is told by learner_grammar that the rough breathing is solid in modern and not in the second scheme', async () => {
    expect((await learnerGrammar()).ideas.solid).toContain('The rough breathing');
    await setGreekPronunciation('erasmian');
    const under = await learnerGrammar();
    expect(under.ideas.solid).not.toContain('The rough breathing');
    expect(under.ideas.solid).toContain('The genitive case');
  });
});

describe('the upgrade from version 19', () => {
  it('keeps every grammarLevels and reviews row, the sound-tier ones under the modern scheme', async () => {
    db.close();
    await Dexie.delete('lampas');
    const old = new Dexie('lampas');
    old.version(19).stores({
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
    });
    await old.open();
    const sound = { id: 'breathing-rough', level: 'solid', since: 5, how: 'sheet' };
    const grammar = { id: 'case-genitive', level: 'frontier', since: 6, how: 'review' };
    const soundReview = { kind: 'grammar', id: 'breathing-rough', step: 4, due: 9, lastWhen: 4, lapses: 1, rights: 3 };
    const grammarReview = { kind: 'grammar', id: 'case-genitive', step: 2, due: 9, lastWhen: 4, lapses: 0, rights: 1 };
    const wordReview = { kind: 'word', id: 'λέγω', step: 1, due: 9, lastWhen: 4, lapses: 0, rights: 1 };
    await old.table('grammarLevels').bulkPut([sound, grammar]);
    await old.table('reviews').bulkPut([soundReview, grammarReview, wordReview]);
    await old.table('settings').put({ key: 'grammarEvidence', value: JSON.stringify({ 'letter-beta': [2, 0], 'case-genitive': [1, 0] }) });
    old.close();

    await db.open();
    expect(db.verno).toBe(26);
    expect((await db.grammarLevels.toArray()).sort((a, b) => a.id.localeCompare(b.id))).toEqual([grammar, { ...sound, id: 'modern:breathing-rough' }]);
    expect((await db.reviews.toArray()).map((r) => `${r.kind}/${r.id}`).sort()).toEqual(['grammar/case-genitive', 'grammar/modern:breathing-rough', 'word/λέγω']);
    expect(await db.reviews.get(['grammar', 'modern:breathing-rough'])).toEqual({ ...soundReview, id: 'modern:breathing-rough' });
    expect(await db.reviews.get(['grammar', 'case-genitive'])).toEqual(grammarReview);
    expect(JSON.parse(String((await db.settings.get('grammarEvidence'))?.value))).toEqual({ 'modern:letter-beta': [2, 0], 'case-genitive': [1, 0] });
    // read through the repository, he has lost nothing
    expect((await getLevel('breathing-rough'))?.level).toBe('solid');
    expect((await getEvidence()).get('letter-beta')).toEqual({ run: 2, misses: 0 });
  });
});
