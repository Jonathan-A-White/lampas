// About you (mw-1vuvq6.1): the student's profile lives in the settings store ('learnerProfile', a JSON object, no table); every tutor grist
// (bible-talk, verse-ask, verse-read, tips) carries what is kept as `learner_profile`, bounded, and carries nothing when nothing is kept.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter, Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import {
  PROFILE_AGE_MAX,
  PROFILE_BACKGROUND_MAX,
  PROFILE_NOTES_SENT,
  PROFILE_NOTE_MAX,
  PROFILE_WHY_MAX,
  clearProfile,
  deleteProfileNote,
  editProfileNote,
  getProfile,
  keepProfileNote,
  saveProfile,
} from '../../src/data/repositories/profile';
import { learnerProfile, learnerProfileOf } from '../../src/data/learnerProfile';
import { buildReadingRequest } from '../../src/services/reading';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory } from '../../src/services/talk';
import { buildRequest } from '../../src/services/tutor';
import { buildTipRequest } from '../../src/tips/tip';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;
const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

describe('the kept profile', () => {
  it('starts empty and keeps what is saved, trimmed, with the ways in a fixed order', async () => {
    expect(await getProfile()).toEqual({ ways: [], notes: [] });
    await saveProfile({ age: ' 34 ', pace: 'steady', ways: ['doing', 'hearing'], background: ' Spanish ', why: ' John ' });
    expect(await getProfile()).toEqual({ age: '34', pace: 'steady', ways: ['hearing', 'doing'], background: 'Spanish', why: 'John', notes: [] });
  });

  it('saves one field and leaves the rest, and unsets a pace with null', async () => {
    await saveProfile({ age: '34', pace: 'quick' });
    await saveProfile({ why: 'To read John' });
    await saveProfile({ pace: null });
    expect(await getProfile()).toEqual({ age: '34', ways: [], why: 'To read John', notes: [] });
  });

  it('cuts nothing silently: a field over its limit is refused', async () => {
    expect(await saveProfile({ age: 'x'.repeat(PROFILE_AGE_MAX + 1) })).toBe('too-long');
    expect(await saveProfile({ background: 'x'.repeat(PROFILE_BACKGROUND_MAX + 1) })).toBe('too-long');
    expect(await saveProfile({ why: 'x'.repeat(PROFILE_WHY_MAX + 1) })).toBe('too-long');
    expect(await getProfile()).toEqual({ ways: [], notes: [] });
  });

  it('ignores a pace or a way it does not know, and a row that is not JSON', async () => {
    await db.settings.put({ key: 'learnerProfile', value: JSON.stringify({ pace: 'warp', ways: ['hearing', 'flying'], age: 5, notes: [{ text: 'ok', when: 1 }, { text: '', when: 2 }, 'bare'] }) });
    expect(await getProfile()).toEqual({ ways: ['hearing'], notes: [{ text: 'ok', when: 1 }] });
    await db.settings.put({ key: 'learnerProfile', value: '{not json' });
    expect(await getProfile()).toEqual({ ways: [], notes: [] });
  });

  it('Clear empties everything, notes too', async () => {
    await saveProfile({ age: '34', pace: 'slow', ways: ['seeing'], background: 'b', why: 'w' });
    await keepProfileNote('Likes stories', NOW);
    await clearProfile();
    expect(await getProfile()).toEqual({ ways: [], notes: [] });
    expect(await learnerProfile()).toBeUndefined();
  });

  it('keeps a note with its time, once, and edits or removes it', async () => {
    expect(await keepProfileNote('  Likes a story first ', NOW)).toBe('kept');
    expect(await keepProfileNote('Likes a story first', NOW + 1)).toBe('already');
    expect(await keepProfileNote('   ', NOW)).toBe('empty');
    expect(await keepProfileNote('x'.repeat(PROFILE_NOTE_MAX + 1), NOW)).toBe('empty');
    expect(await keepProfileNote('Tires after ten minutes', NOW + 5)).toBe('kept');
    expect(await editProfileNote('Likes a story first', 'Likes a picture first')).toBe('saved');
    expect((await getProfile()).notes).toEqual([{ text: 'Likes a picture first', when: NOW }, { text: 'Tires after ten minutes', when: NOW + 5 }]);
    expect(await editProfileNote('Gone', 'x')).toBe('missing');
    expect(await editProfileNote('Likes a picture first', 'Tires after ten minutes')).toBe('already');
    await deleteProfileNote('Likes a picture first');
    expect((await getProfile()).notes).toEqual([{ text: 'Tires after ten minutes', when: NOW + 5 }]);
  });
});

describe('what the tutor is sent', () => {
  it('is nothing when nothing is kept', async () => {
    expect(await learnerProfile()).toBeUndefined();
    expect(learnerProfileOf({ ways: [], notes: [] })).toBeUndefined();
  });

  it('is only the fields that are filled, with the notes as plain text, the newest few', async () => {
    await saveProfile({ age: '34', pace: 'quick' });
    expect(await learnerProfile()).toEqual({ age: '34', pace: 'quick' });
    await saveProfile({ ways: ['hearing', 'doing'], background: 'Spanish', why: 'John' });
    for (let i = 1; i <= PROFILE_NOTES_SENT + 2; i += 1) await keepProfileNote(`Note ${i}`, NOW + i);
    const sent = await learnerProfile();
    expect(sent).toMatchObject({ age: '34', pace: 'quick', ways: ['hearing', 'doing'], background: 'Spanish', why: 'John' });
    expect(sent?.notes).toEqual(Array.from({ length: PROFILE_NOTES_SENT }, (_, i) => `Note ${i + 3}`));
  });
});

describe('every tutor grist carries learner_profile and validates against its input schema', () => {
  const verse = { n: 28, g: [{ t: 'οἴδαμεν' }, { t: 'δὲ' }], e: [{ t: 'We know' }, { t: 'that' }] } as unknown as Verse;
  const chapter = { book: 'rom', chapter: 8, verses: [verse] } as unknown as Chapter;
  const summary = { days_used: 1, days_used_last_7: 1, first_used_days_ago: 0, screens_visited: [], screens_never: [], features_used: [], features_never: [], settings_changed: [], settings_never: [], turned_off: [], counts: { wordsLearning: 0, wordsSolid: 0, talks: 0, asks: 0, quizAnswers: 0, drillAnswers: 0, readings: 0, grammarKnown: 0 } };
  const profile = { age: '34', pace: 'quick' as const, ways: ['hearing' as const, 'doing' as const], background: 'Spanish, no Greek', why: 'To read John with my son', notes: ['Likes a story first'] };

  const grists: Record<string, (p?: typeof profile) => { request: Record<string, unknown>; schema: string }> = {
    'bible-talk': (p) => ({
      request: buildTalkRequest({ title: 'Romans 8', chapter, verse: undefined } as never, 'Explain', [], [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], p) as unknown as Record<string, unknown>,
      schema: 'grinds/bible-talk.input.schema.json',
    }),
    'verse-ask': (p) => ({ request: buildRequest('Romans 8:28', verse, 'Why?', [], undefined, undefined, undefined, [], p) as unknown as Record<string, unknown>, schema: 'grinds/verse-ask.input.schema.json' }),
    'verse-read': (p) => ({ request: buildReadingRequest('Romans 8:28', verse, 'english', 'en', p) as unknown as Record<string, unknown>, schema: 'grinds/verse-read.input.schema.json' }),
    tips: (p) => ({ request: buildTipRequest(summary, ['a'], p) as unknown as Record<string, unknown>, schema: 'grinds/tips.input.schema.json' }),
  };

  it.each(Object.keys(grists))('%s: carries what was saved', (kind) => {
    const { request, schema } = grists[kind](profile);
    expect(request.learner_profile).toEqual(profile);
    expect(validate(request, readJson(schema) as Schema)).toEqual([]);
  });

  it.each(Object.keys(grists))('%s: with nothing saved the field is missing and the request still validates', (kind) => {
    const { request, schema } = grists[kind](undefined);
    expect('learner_profile' in request).toBe(false);
    expect(validate(request, readJson(schema) as Schema)).toEqual([]);
  });

  it.each(Object.keys(grists))('%s: the schema refuses another key, another pace, a way it does not know, too many notes or a long field', (kind) => {
    const { request, schema } = grists[kind](profile);
    const input = readJson(schema) as Schema;
    const long = (n: number) => 'x'.repeat(n);
    const bad = [
      { ...profile, extra: 1 },
      { ...profile, pace: 'warp' },
      { ...profile, ways: ['flying'] },
      { ...profile, notes: Array.from({ length: PROFILE_NOTES_SENT + 1 }, () => 'n') },
      { ...profile, notes: [long(PROFILE_NOTE_MAX + 1)] },
      { ...profile, age: long(PROFILE_AGE_MAX + 1) },
      { ...profile, background: long(PROFILE_BACKGROUND_MAX + 1) },
      { ...profile, why: long(PROFILE_WHY_MAX + 1) },
    ];
    for (const b of bad) expect(validate({ ...request, learner_profile: b }, input), JSON.stringify(b).slice(0, 60)).not.toEqual([]);
    expect(validate({ ...request, learner_profile: {} }, input)).toEqual([]);
  });

  it('the fullest profile of Greek letters still leaves a talk inside the grist record', () => {
    const greek = (n: number) => 'α'.repeat(n);
    const full = {
      age: greek(PROFILE_AGE_MAX),
      pace: 'steady' as const,
      ways: ['hearing' as const, 'seeing' as const, 'reading' as const, 'doing' as const],
      background: greek(PROFILE_BACKGROUND_MAX),
      why: greek(PROFILE_WHY_MAX),
      notes: Array.from({ length: PROFILE_NOTES_SENT }, () => greek(PROFILE_NOTE_MAX)),
    };
    const history = Array.from({ length: 10 }, (_, i) => ({ q: `Question ${i}`, a: 'a'.repeat(2000) }));
    const request = buildTalkRequest({ title: 'Romans 8', chapter, verse: undefined } as never, 'Explain', history, [], {}, undefined, undefined, undefined, [], [], 0, { kept: '' }, undefined, [], full);
    const fitted = fitHistory(request);
    expect(new TextEncoder().encode(JSON.stringify(fitted)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
    expect(fitted.learner_profile).toEqual(full);
  });
});
