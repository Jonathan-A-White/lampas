// What the tutor learns about the student in a talk (mw-1vuvq6.3): the answer's profile_update is kept beside what he set himself, never over it.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { learnerProfile } from '../../src/data/learnerProfile';
import {
  changeLearned,
  clearProfile,
  deleteProfileNote,
  getProfile,
  isSuggestion,
  learnFromTalk,
  removeLearned,
  saveProfile,
} from '../../src/data/repositories/profile';
import { isTalkAnswer } from '../../src/services/talk';
import { instructionsOf } from '../../scripts/grind-parts';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const DAY = 86_400_000;

describe('a profile_update from a talk', () => {
  it('is kept as learned, with when, from which talk, and whether it is a guess', async () => {
    expect(await learnFromTalk('rom.8.11', [{ field: 'ways', value: 'hands-on' }, { field: 'age', value: 'adult', guessed: true }], undefined, NOW)).toEqual(['applied', 'applied']);
    const profile = await getProfile();
    expect(profile.learned).toEqual([
      { field: 'ways', value: 'hands-on', when: NOW, guessed: false, talk: 'rom.8.11' },
      { field: 'age', value: 'adult', when: NOW, guessed: true, talk: 'rom.8.11' },
    ]);
    expect(profile.ways).toEqual([]);
    expect(profile.age).toBeUndefined();
  });

  it('for a field he set himself is a suggestion: it never overwrites it and does not ride the grist', async () => {
    await saveProfile({ age: '34', pace: 'quick', ways: ['hearing'] });
    expect(await learnFromTalk('rom.8', [{ field: 'age', value: 'adult', guessed: true }, { field: 'pace', value: 'slow' }, { field: 'ways', value: 'hands-on' }], undefined, NOW)).toEqual([
      'suggested',
      'suggested',
      'suggested',
    ]);
    const profile = await getProfile();
    expect(profile).toMatchObject({ age: '34', pace: 'quick', ways: ['hearing'] });
    expect(profile.learned?.map((l) => isSuggestion(profile, l))).toEqual([true, true, true]);
    expect(await learnerProfile()).toEqual({ age: '34', pace: 'quick', ways: ['hearing'] });
  });

  it('turns into a suggestion when he fills the field in afterwards, and rides again once he clears it', async () => {
    await learnFromTalk('rom.8', [{ field: 'background', value: 'Knows Spanish', guessed: true }], undefined, NOW);
    expect(await learnerProfile()).toEqual({ learned: [{ field: 'background', value: 'Knows Spanish', guessed: true }] });
    await saveProfile({ background: 'Two years of Hebrew' });
    expect(await learnerProfile()).toEqual({ background: 'Two years of Hebrew' });
    await saveProfile({ background: '' });
    expect(await learnerProfile()).toEqual({ learned: [{ field: 'background', value: 'Knows Spanish', guessed: true }] });
  });

  it('removed by him is not added again from the same talk, but another talk may teach it again', async () => {
    await learnFromTalk('rom.8.11', [{ field: 'ways', value: 'hands-on' }, { field: 'note', value: 'Likes a story first' }], undefined, NOW);
    await removeLearned('ways');
    await deleteProfileNote('Likes a story first');
    expect((await getProfile()).learned).toBeUndefined();
    expect(await learnFromTalk('rom.8.11', [{ field: 'ways', value: 'hands-on' }, { field: 'note', value: 'Likes a story first' }], undefined, NOW + 1)).toEqual(['ignored', 'ignored']);
    expect(await getProfile()).toMatchObject({ ways: [], notes: [] });
    expect(await learnFromTalk('rom.8.12', [{ field: 'ways', value: 'hands-on' }], undefined, NOW + 2)).toEqual(['applied']);
  });

  it('keeps a note with the talk it came from', async () => {
    expect(await learnFromTalk('rom.8', [{ field: 'note', value: 'Tires after ten minutes' }], undefined, NOW)).toEqual(['noted']);
    expect((await getProfile()).notes).toEqual([{ text: 'Tires after ten minutes', when: NOW, talk: 'rom.8' }]);
  });

  it('refuses a guess for what cannot be guessed, a pace that is not one, and a guess over something the tutor was told', async () => {
    expect(
      await learnFromTalk('rom.8', [{ field: 'pace', value: 'slow', guessed: true }, { field: 'pace', value: 'warp' }, { field: 'why', value: '' }, { field: 'note', value: 'x', guessed: true }], undefined, NOW),
    ).toEqual(['ignored', 'ignored', 'ignored', 'ignored']);
    await learnFromTalk('rom.8', [{ field: 'age', value: '34' }], undefined, NOW);
    expect(await learnFromTalk('rom.9', [{ field: 'age', value: 'adult', guessed: true }], undefined, NOW + 1)).toEqual(['ignored']);
    expect((await getProfile()).learned).toEqual([{ field: 'age', value: '34', when: NOW, guessed: false, talk: 'rom.8' }]);
    // what he says later replaces a guess
    await learnFromTalk('rom.9', [{ field: 'background', value: 'Spanish', guessed: true }], undefined, NOW + 2);
    await learnFromTalk('rom.9', [{ field: 'background', value: 'Two years of Spanish' }], undefined, NOW + 3);
    expect((await getProfile()).learned?.find((l) => l.field === 'background')).toMatchObject({ value: 'Two years of Spanish', guessed: false });
  });

  it('can be changed by him: it is then his words, no longer a guess', async () => {
    await learnFromTalk('rom.8', [{ field: 'age', value: 'adult', guessed: true }, { field: 'pace', value: 'quick' }], undefined, NOW);
    expect(await changeLearned('age', ' 40s ')).toBe('saved');
    expect(await changeLearned('pace', 'warp')).toBe('invalid');
    expect(await changeLearned('why', 'x')).toBe('missing');
    expect((await getProfile()).learned?.find((l) => l.field === 'age')).toMatchObject({ value: '40s', guessed: false, mine: true });
    expect(await learnerProfile()).toEqual({ learned: [{ field: 'age', value: '40s' }, { field: 'pace', value: 'quick' }] });
  });

  it('Clear empties the learned items too', async () => {
    await learnFromTalk('rom.8', [{ field: 'age', value: 'adult', guessed: true }], 'why', NOW);
    await clearProfile();
    expect(await getProfile()).toEqual({ ways: [], notes: [] });
  });
});

describe('asking him a profile question', () => {
  it('notes the field asked, and tells the tutor not to ask it again for a day, or ever after he declines', async () => {
    await learnFromTalk('rom.8', [], 'why', NOW);
    expect(await learnerProfile(NOW + DAY / 2)).toEqual({ do_not_ask: ['why'] });
    expect(await learnerProfile(NOW + DAY + 1)).toBeUndefined();
    await learnFromTalk('rom.9', [{ field: 'why', declined: true }], undefined, NOW + 2 * DAY);
    expect(await learnerProfile(NOW + 30 * DAY)).toEqual({ do_not_ask: ['why'] });
  });

  it('is shown no more once he fills the field in or the tutor learned it', async () => {
    await learnFromTalk('rom.8', [{ field: 'age', value: 'adult', guessed: true }], 'age', NOW);
    expect((await learnerProfile(NOW + 1))?.do_not_ask).toEqual(['age']);
  });
});

describe('the answer check', () => {
  const base = { answer: 'Yes.', words: [] };
  it('takes a profile_update and a profile_question that fit the schema, and nothing else', () => {
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'ways', value: 'hands-on' }, { field: 'age', value: 'adult', guessed: true }, { field: 'why', declined: true }], profile_question: 'background' })).toBe(true);
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'shoe', value: '9' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'age' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'age', value: 'x'.repeat(101) }] })).toBe(false);
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'age', value: '1' }, { field: 'why', value: '2' }, { field: 'note', value: '3' }, { field: 'pace', value: 'slow' }] })).toBe(false);
    expect(isTalkAnswer({ ...base, profile_update: [{ field: 'age', value: '1', extra: true }] })).toBe(false);
    expect(isTalkAnswer({ ...base, profile_question: 'shoe' })).toBe(false);
  });
});

describe('the bible-talk instructions', () => {
  const text = instructionsOf('bible-talk');
  it('say how the tutor learns about him: detect first, one light question, never twice, a guess marked', () => {
    const section = text.slice(text.indexOf('## Learning about him'));
    for (const phrase of ['profile_update', 'profile_question', 'do_not_ask', '`guessed` true', '`declined`', 'ONE question', 'observed_pace', 'observed_ways', 'Settings > About you']) expect(section, phrase).toContain(phrase);
  });

  it('say a decline ends the profile question for good, in his question or the history, with no profile_question beside it (mw-5r3p30.416)', () => {
    const section = text.slice(text.indexOf('## Learning about him'));
    for (const phrase of [
      'A decline ends it for good',
      'in his question or anywhere in `history`',
      'never put a `profile_question` in an answer that records a decline',
      'not telling',
      'skip that',
    ]) expect(section, phrase).toContain(phrase);
    const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as { properties: { profile_question: { description: string } } };
    expect(schema.properties.profile_question.description).toContain('Never in an answer that records a decline');
  });
});

describe('the decline scenarios (mw-5r3p30.416): every wording of no leaves the answer with a decline and no profile_question', () => {
  const NAMES = ['learn-declined', 'learn-declined-not-telling', 'learn-declined-skip-that'];
  it.each(NAMES)('%s expects the decline recorded and no profile_question', (name) => {
    const ex = JSON.parse(readFileSync(`grinds/examples/bible-talk/${name}.json`, 'utf8')) as { request: { question: string; history: { q: string; a: string }[] }; expect: Record<string, unknown> };
    expect(ex.expect['profile_update.0.declined']).toEqual({ equals: true });
    expect(ex.expect['profile_question']).toEqual({ present: false });
    expect(ex.request.history.length).toBeGreaterThan(0);
  });
  it('words the no another way than I would rather not say', () => {
    const q = (n: string): string => (JSON.parse(readFileSync(`grinds/examples/bible-talk/${n}.json`, 'utf8')) as { request: { question: string } }).request.question.toLowerCase();
    expect(q('learn-declined-not-telling')).toContain('not telling');
    expect(q('learn-declined-skip-that')).toContain('skip that');
  });
});
