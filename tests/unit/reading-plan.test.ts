// tests/unit/reading-plan.test.ts — reading plans (mw-umv8sp.1): the plan registry (src/data/plans/) and the per-phone readingPlan repository
// (src/data/repositories/readingPlan.ts, JSON in the settings store). No screen yet.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { OT_BOOKS } from '../../src/data/otBooks';
import { listPlans, planOf } from '../../src/data/plans';
import * as repositories from '../../src/data/repositories';
import {
  beginSession,
  endSession,
  getReadingPlan,
  markDoneThrough,
  nextChapter,
  openSession,
  progress,
  startPlan,
} from '../../src/data/repositories/readingPlan';
import { AUDIO_BIBLES } from '../../src/resources/audioBible';
import { audioBibleSetting } from '../../src/settings/definitions';
import { readingPlanSetting } from '../../src/settings/definitions/readingPlan';
import { getSetting, setSetting } from '../../src/settings/store';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

describe('the plan registry', () => {
  it('lists one plan today: the whole Bible', () => {
    expect(listPlans()).toEqual([{ id: 'whole-bible', name: 'The whole Bible' }]);
  });

  it('has the whole Bible as 1,189 chapters in canon order, Genesis 1 first and Revelation 22 last', () => {
    const chapters = planOf('whole-bible')!.chapters();
    expect(chapters).toHaveLength(1189);
    expect(chapters[0]).toEqual({ code: 'gen', chapter: 1 });
    expect(chapters[chapters.length - 1]).toEqual({ code: 'rev', chapter: 22 });
    expect(chapters[50]).toEqual({ code: 'exo', chapter: 1 });
    const firstNt = chapters.findIndex((c) => c.code === BOOKS[0]!.code);
    expect(firstNt).toBe(OT_BOOKS.reduce((n, b) => n + b.chapters, 0));
    expect(new Set(chapters.map((c) => `${c.code}.${c.chapter}`)).size).toBe(1189);
  });

  it('knows no plan it was not given', () => {
    expect(planOf('nope')).toBeUndefined();
  });
});

describe('the reading plan setting', () => {
  it('is off to start', async () => {
    expect(await getSetting(readingPlanSetting)).toBe('off');
    expect(readingPlanSetting.section).toBe('resources');
    expect(readingPlanSetting.allowed).toEqual({ kind: 'choice', values: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'On' }] });
  });

  it('is turned on by starting a plan, which also turns the audio Bible on when it was off', async () => {
    expect(await getSetting(audioBibleSetting)).toBe('off');
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    expect(await getSetting(readingPlanSetting)).toBe('on');
    expect(await getSetting(audioBibleSetting)).toBe(AUDIO_BIBLES[0]!.id);
  });

  it('leaves an audio Bible he chose as it was', async () => {
    await setSetting(audioBibleSetting, AUDIO_BIBLES[0]!.id);
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    expect(await getSetting(audioBibleSetting)).toBe(AUDIO_BIBLES[0]!.id);
  });
});

describe('the reading plan repository', () => {
  it('has no plan to start', async () => {
    expect(await getReadingPlan()).toBeUndefined();
    expect(await nextChapter()).toBeUndefined();
    expect(await progress()).toEqual({ done: 0, total: 0 });
    expect(await openSession()).toBeUndefined();
  });

  it('starts at the beginning with nothing done', async () => {
    expect(await startPlan('whole-bible', { code: 'gen', chapter: 1 })).toBe(true);
    expect(await nextChapter()).toEqual({ code: 'gen', chapter: 1 });
    expect(await progress()).toEqual({ done: 0, total: 1189 });
  });

  it('marks every chapter before the start point done, and the next chapter is the start point', async () => {
    await startPlan('whole-bible', { code: 'psa', chapter: 23 });
    const before = planOf('whole-bible')!.chapters().findIndex((c) => c.code === 'psa' && c.chapter === 23);
    expect(await progress()).toEqual({ done: before, total: 1189 });
    expect(await nextChapter()).toEqual({ code: 'psa', chapter: 23 });
    expect((await getReadingPlan())?.start).toEqual({ code: 'psa', chapter: 23 });
  });

  it('refuses a plan or a start point it does not hold, and changes nothing', async () => {
    await startPlan('whole-bible', { code: 'mat', chapter: 1 });
    const kept = await progress();
    expect(await startPlan('nope', { code: 'gen', chapter: 1 })).toBe(false);
    expect(await startPlan('whole-bible', { code: 'gen', chapter: 51 })).toBe(false);
    expect(await startPlan('whole-bible', { code: 'xyz', chapter: 1 })).toBe(false);
    expect(await progress()).toEqual(kept);
    expect(await nextChapter()).toEqual({ code: 'mat', chapter: 1 });
  });

  it('marks a chapter and all before it done, and moves the next chapter on', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await markDoneThrough({ code: 'gen', chapter: 3 });
    expect(await progress()).toEqual({ done: 3, total: 1189 });
    expect(await nextChapter()).toEqual({ code: 'gen', chapter: 4 });
    await markDoneThrough({ code: 'exo', chapter: 2 });
    expect(await progress()).toEqual({ done: 52, total: 1189 });
    expect(await nextChapter()).toEqual({ code: 'exo', chapter: 3 });
  });

  it('never un-marks: marking an earlier chapter changes nothing', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await markDoneThrough({ code: 'gen', chapter: 10 });
    await markDoneThrough({ code: 'gen', chapter: 2 });
    expect(await progress()).toEqual({ done: 10, total: 1189 });
  });

  it('ignores a chapter the plan does not hold', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await markDoneThrough({ code: 'gen', chapter: 99 });
    expect(await progress()).toEqual({ done: 0, total: 1189 });
  });

  it('does nothing without a plan', async () => {
    await markDoneThrough({ code: 'gen', chapter: 3 });
    expect(await progress()).toEqual({ done: 0, total: 0 });
  });

  it('has no next chapter once the last is done', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await markDoneThrough({ code: 'rev', chapter: 22 });
    expect(await progress()).toEqual({ done: 1189, total: 1189 });
    expect(await nextChapter()).toBeUndefined();
  });

  it('keeps one open listening session with its start time, and closes it', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await beginSession({ code: 'gen', chapter: 1, startedAt: 1000 });
    expect(await openSession()).toEqual({ code: 'gen', chapter: 1, startedAt: 1000 });
    await beginSession({ code: 'gen', chapter: 2, startedAt: 2000 });
    expect(await openSession()).toEqual({ code: 'gen', chapter: 2, startedAt: 2000 });
    expect(await endSession(5000)).toEqual({ code: 'gen', chapter: 2, startedAt: 2000, endedAt: 5000 });
    expect(await openSession()).toBeUndefined();
    expect(await endSession(6000)).toBeUndefined();
  });

  it('keeps the session when the plan moves on, and starting a plan again drops an open one', async () => {
    await startPlan('whole-bible', { code: 'gen', chapter: 1 });
    await beginSession({ code: 'gen', chapter: 1, startedAt: 1000 });
    await markDoneThrough({ code: 'gen', chapter: 1 });
    expect(await openSession()).toEqual({ code: 'gen', chapter: 1, startedAt: 1000 });
    await startPlan('whole-bible', { code: 'exo', chapter: 1 });
    expect(await openSession()).toBeUndefined();
  });

  it('keeps a session only inside a plan', async () => {
    await beginSession({ code: 'gen', chapter: 1, startedAt: 1000 });
    expect(await openSession()).toBeUndefined();
  });

  it('reads everything back after a reload (the store is the settings table)', async () => {
    await startPlan('whole-bible', { code: 'rut', chapter: 2 });
    await markDoneThrough({ code: 'rut', chapter: 3 });
    await beginSession({ code: 'rut', chapter: 4, startedAt: 7777 });
    const done = (await progress()).done;
    db.close();
    await db.open();
    expect(await progress()).toEqual({ done, total: 1189 });
    expect(await nextChapter()).toEqual({ code: 'rut', chapter: 4 });
    expect(await openSession()).toEqual({ code: 'rut', chapter: 4, startedAt: 7777 });
    expect((await getReadingPlan())?.planId).toBe('whole-bible');
  });

  it('survives a damaged saved value as no plan', async () => {
    await db.settings.put({ key: 'readingPlanState', value: '{nope' });
    expect(await nextChapter()).toBeUndefined();
    expect(await progress()).toEqual({ done: 0, total: 0 });
    await db.settings.put({ key: 'readingPlanState', value: JSON.stringify({ planId: 'gone', start: { code: 'gen', chapter: 1 }, done: ['gen.1'] }) });
    expect(await getReadingPlan()).toBeUndefined();
  });

  it('is exported from the repositories index', () => {
    expect(repositories.startPlan).toBe(startPlan);
    expect(repositories.nextChapter).toBe(nextChapter);
    expect(repositories.markDoneThrough).toBe(markDoneThrough);
    expect(repositories.planProgress).toBe(progress);
    expect(repositories.beginSession).toBe(beginSession);
    expect(repositories.endSession).toBe(endSession);
    expect(repositories.openSession).toBe(openSession);
    expect(repositories.getReadingPlan).toBe(getReadingPlan);
  });
});
