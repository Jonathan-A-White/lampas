// What the phone sees of how he learns (mw-1vuvq6.3): the pace from the review results, the ways from what he uses; both ride the grists.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { learnerProfile } from '../../src/data/learnerProfile';
import { observedPace, observedWays, OBSERVED_MIN_ANSWERS, OBSERVED_MIN_USES } from '../../src/data/observedProfile';
import { buildReadingRequest } from '../../src/services/reading';
import { validate, type Schema } from '../support/schema-validate';
import '../support/grinds-in-graph';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.results.clear(), db.drills.clear(), db.usage.clear(), db.talkPictures.clear(), db.readings.clear()]);
});

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const MIN = 60_000;
/** `n` answers in one sitting, one every `gapMs`, ending an hour before NOW, `right` of every `of` right. */
const sitting = (n: number, gapMs: number, right = 9, of = 10, endsAt = NOW - 60 * MIN) =>
  Array.from({ length: n }, (_, i) => ({ when: endsAt - (n - 1 - i) * gapMs, right: i % of < right }));

describe('the pace seen in the review results', () => {
  it('is quick for fast, mostly right answers', () => {
    expect(observedPace(sitting(40, 8_000), NOW)).toBe('quick');
  });
  it('is slow for answers that take their time', () => {
    expect(observedPace(sitting(25, 40_000), NOW)).toBe('slow');
  });
  it('is slow for answers that are mostly wrong, however fast', () => {
    expect(observedPace(sitting(40, 8_000, 3), NOW)).toBe('slow');
  });
  it('is steady in between', () => {
    expect(observedPace(sitting(30, 15_000), NOW)).toBe('steady');
  });
  it('counts the time in a sitting, not the days between sittings', () => {
    const answers = [...sitting(15, 8_000, 9, 10, NOW - 3 * 86_400_000), ...sitting(15, 8_000)];
    expect(observedPace(answers, NOW)).toBe('quick');
  });
  it('is nothing from too few answers, or from answers too old', () => {
    expect(observedPace(sitting(OBSERVED_MIN_ANSWERS - 1, 8_000), NOW)).toBeUndefined();
    expect(observedPace(sitting(40, 8_000, 9, 10, NOW - 90 * 86_400_000), NOW)).toBeUndefined();
    expect(observedPace([], NOW)).toBeUndefined();
  });
});

describe('the ways seen in what he uses', () => {
  const none = { listened: 0, read: 0, practised: 0, pictured: 0 };
  it('a listener is mostly hearing', () => {
    expect(observedWays({ ...none, listened: 70, read: 20, practised: 10 })).toEqual({ hearing: 70, reading: 20, doing: 10 });
  });
  it('a reader is mostly reading', () => {
    expect(observedWays({ ...none, listened: 5, read: 80, practised: 5 })).toMatchObject({ reading: 89 });
  });
  it('a driller is mostly doing, and pictures count as seeing', () => {
    expect(observedWays({ ...none, read: 10, practised: 80, pictured: 10 })).toEqual({ reading: 10, doing: 80, seeing: 10 });
  });
  it('is nothing from too little use', () => {
    expect(observedWays({ ...none, listened: OBSERVED_MIN_USES - 1 })).toBeUndefined();
  });
});

describe('the observed profile rides the grists', () => {
  const verse = { n: 28, g: [{ t: 'οἴδαμεν' }], e: [{ t: 'We know' }] } as unknown as Verse;
  const usage = (name: string, count: number) => db.usage.put({ key: `2026-11-12|${name}`, day: '2026-11-12', name, count });

  it('learner_profile carries observed_pace from the saved results, beside the pace he chose', async () => {
    await db.results.bulkAdd(sitting(40, 8_000).map((a) => ({ lemma: 'λόγος', ...a })));
    expect(await learnerProfile(NOW)).toEqual({ observed_pace: 'quick' });
    await db.settings.put({ key: 'learnerProfile', value: JSON.stringify({ pace: 'slow' }) });
    expect(await learnerProfile(NOW)).toEqual({ pace: 'slow', observed_pace: 'quick' });
  });

  it('drill answers count too', async () => {
    await db.drills.bulkAdd(sitting(25, 40_000).map((a) => ({ lemma: 'λόγος', step: 'case', ...a })));
    expect((await learnerProfile(NOW))?.observed_pace).toBe('slow');
  });

  it('learner_profile carries observed_ways from the counts of use: a listener, a reader, a driller', async () => {
    await usage('verse-reading', 40);
    await usage('word-spoken', 30);
    await usage('chapter-opened', 20);
    await usage('verse-selected', 10);
    expect((await learnerProfile(NOW))?.observed_ways).toEqual({ hearing: 70, reading: 30 });
    await db.usage.clear();
    await usage('chapter-opened', 40);
    await usage('word-tapped', 10);
    expect((await learnerProfile(NOW))?.observed_ways).toEqual({ reading: 100 });
    await db.usage.clear();
    await db.results.bulkAdd(sitting(60, 8_000).map((a) => ({ lemma: 'λόγος', ...a })));
    await usage('chapter-opened', 10);
    expect((await learnerProfile(NOW))?.observed_ways).toEqual({ reading: 14, doing: 86 });
  });

  it('every grist validates against its schema with the observed fields', async () => {
    await db.results.bulkAdd(sitting(40, 8_000).map((a) => ({ lemma: 'λόγος', ...a })));
    await usage('verse-reading', 40);
    await db.settings.put({ key: 'learnerProfile', value: JSON.stringify({ learned: [{ field: 'age', value: 'adult', when: NOW, guessed: true, talk: 'rom.8' }, { field: 'ways', value: 'hands-on', when: NOW, guessed: false, talk: 'rom.8' }], asked: [{ field: 'why', when: NOW, declined: false }] }) });
    const profile = await learnerProfile(NOW);
    expect(profile).toEqual({
      learned: [{ field: 'age', value: 'adult', guessed: true }, { field: 'ways', value: 'hands-on' }],
      observed_pace: 'quick',
      observed_ways: { hearing: 50, doing: 50 },
      do_not_ask: ['why'],
    });
    const request = buildReadingRequest('Romans 8:28', verse, 'english', 'en', profile);
    expect(request.learner_profile).toEqual(profile);
    for (const kind of ['bible-talk', 'verse-read', 'tips']) {
      const input = JSON.parse(readFileSync(`grinds/${kind}.input.schema.json`, 'utf8')) as { properties: { learner_profile: Schema } };
      expect(validate(profile, input.properties.learner_profile), kind).toEqual([]);
      expect(validate({ ...profile, observed_pace: 'warp' }, input.properties.learner_profile), kind).not.toEqual([]);
      expect(validate({ ...profile, observed_ways: { hearing: 101 } }, input.properties.learner_profile), kind).not.toEqual([]);
      expect(validate({ ...profile, observed_ways: { smelling: 5 } }, input.properties.learner_profile), kind).not.toEqual([]);
      expect(validate({ ...profile, do_not_ask: ['shoe'] }, input.properties.learner_profile), kind).not.toEqual([]);
      expect(validate({ ...profile, learned: [{ field: 'age', value: '' }] }, input.properties.learner_profile), kind).not.toEqual([]);
    }
  });
});
