// tests/unit/reading-plan-today.test.ts — what he read today (mw-5r3p30.630): the plan keeps the local date each chapter was marked done, Today's Reading plan shows the
// chapters read today in ranges ('1 Peter 1-5, 2 Peter 1-3') with a tick on Next that marks it read, and the tutor is told what he read today.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getReadingPlan, markHeard, nextChapter, planProgress, restorePlan, setPlace, startPlan } from '../../src/data/repositories';
import { markChapterRead, readOn, unmarkChaptersRead } from '../../src/data/repositories/readingPlan';
import { readPlan } from '../../src/plan/usePlan';
import { readingPlanSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { readRanges } from '../../src/today/readToday';
import { todayFacts } from '../../src/today/tutorFacts';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const PETER_1 = { code: '1pe', chapter: 1 };
const PETER_2_3 = { code: '2pe', chapter: 3 };
const JOHN_1 = { code: '1jn', chapter: 1 };
const DAY = '2026-10-19';
const NEXT_DAY = '2026-10-20';

const stateOf = async () => (await getReadingPlan())!;
const readNames = async (date: string) => readRanges(readOn(await stateOf(), date));

describe('the day each chapter was marked done', () => {
  it('markHeard through 2 Peter 3 stores the date for each chapter it newly marks', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(PETER_2_3, 'finished', DAY);
    const state = await stateOf();
    expect(Object.keys(state.doneOn ?? {})).toEqual(['1pe.1', '1pe.2', '1pe.3', '1pe.4', '1pe.5', '2pe.1', '2pe.2', '2pe.3']);
    expect(new Set(Object.values(state.doneOn ?? {}))).toEqual(new Set([DAY]));
    expect(await nextChapter()).toEqual(JOHN_1);
  });

  it('stopping in a chapter dates the chapters before it', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(JOHN_1, 'stopped-in', DAY);
    expect(await readNames(DAY)).toEqual(['1 Peter 1-5', '2 Peter 1-3']);
  });

  it('a chapter marked on an earlier day keeps its date', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard({ code: '1pe', chapter: 2 }, 'finished', DAY);
    await markHeard({ code: '1pe', chapter: 4 }, 'finished', NEXT_DAY);
    const { doneOn } = await stateOf();
    expect(doneOn).toEqual({ '1pe.1': DAY, '1pe.2': DAY, '1pe.3': NEXT_DAY, '1pe.4': NEXT_DAY });
  });

  it("startPlan's back-fill stores no date", async () => {
    await startPlan('whole-bible', PETER_1);
    const state = await stateOf();
    expect(state.done.length).toBeGreaterThan(1000);
    expect(state.doneOn).toBeUndefined();
  });

  it('Set here stores no date: the chapters it fills in are not read today', async () => {
    await startPlan('whole-bible', PETER_1);
    await setPlace(JOHN_1);
    expect((await stateOf()).doneOn).toBeUndefined();
    expect(await nextChapter()).toEqual(JOHN_1);
  });

  it('Set here keeps the dates of chapters still done and drops the chapter that becomes next', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(PETER_2_3, 'finished', DAY);
    await setPlace({ code: '1pe', chapter: 3 });
    const { doneOn } = await stateOf();
    expect(Object.keys(doneOn ?? {})).toEqual(['1pe.1', '1pe.2', '1pe.4', '1pe.5', '2pe.1', '2pe.2', '2pe.3']);
  });

  it('a plan stored before this change still loads, its chapters with no date', async () => {
    await startPlan('whole-bible', PETER_1);
    const { doneOn, ...old } = await stateOf();
    expect(doneOn).toBeUndefined();
    await db.settings.put({ key: 'readingPlanState', value: JSON.stringify(old) });
    const before = await planProgress();
    expect(before.done).toBeGreaterThan(1000);
    expect(await nextChapter()).toEqual(PETER_1);
    expect(await readNames(DAY)).toEqual([]);
    // and it takes dates from here on without losing what it held
    await markHeard(PETER_1, 'finished', DAY);
    expect((await planProgress()).done).toBe(before.done + 1);
    expect(await readNames(DAY)).toEqual(['1 Peter 1']);
  });

  it('ignores a malformed date list', async () => {
    await startPlan('whole-bible', PETER_1);
    const state = await stateOf();
    await db.settings.put({ key: 'readingPlanState', value: JSON.stringify({ ...state, doneOn: { '1pe.1': 5, 'gen.1': DAY, 'nope.9': DAY } }) });
    expect((await stateOf()).doneOn).toEqual({ 'gen.1': DAY });
  });
});

describe('a tick on Next', () => {
  it('marks that chapter read today and Next moves on', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(PETER_2_3, 'finished', DAY);
    const before = (await planProgress()).done;
    await markChapterRead(JOHN_1, DAY);
    expect(await nextChapter()).toEqual({ code: '1jn', chapter: 2 });
    expect((await planProgress()).done).toBe(before + 1);
    expect(await readNames(DAY)).toEqual(['1 Peter 1-5', '2 Peter 1-3', '1 John 1']);
    await markChapterRead({ code: '1jn', chapter: 2 }, DAY);
    expect(await readNames(DAY)).toEqual(['1 Peter 1-5', '2 Peter 1-3', '1 John 1-2']);
  });

  it('marking a chapter already done changes nothing', async () => {
    await startPlan('whole-bible', PETER_1);
    await markChapterRead(PETER_1, DAY);
    const once = await stateOf();
    await markChapterRead(PETER_1, NEXT_DAY);
    expect(await stateOf()).toEqual(once);
  });

  it('unmarking a chapter read makes it next again, and returns the state it replaced for Undo', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(PETER_2_3, 'finished', DAY);
    await markChapterRead(JOHN_1, DAY);
    const before = await stateOf();
    const previous = await unmarkChaptersRead([JOHN_1]);
    expect(await nextChapter()).toEqual(JOHN_1);
    expect(await readNames(DAY)).toEqual(['1 Peter 1-5', '2 Peter 1-3']);
    expect((await stateOf()).doneOn?.['1jn.1']).toBeUndefined();
    await restorePlan(previous!);
    expect(await stateOf()).toEqual(before);
  });

  it('unmarking a chapter in the middle makes it next, the later ones stay done', async () => {
    await startPlan('whole-bible', PETER_1);
    await markHeard(PETER_2_3, 'finished', DAY);
    await unmarkChaptersRead([{ code: '1pe', chapter: 3 }]);
    expect(await nextChapter()).toEqual({ code: '1pe', chapter: 3 });
    expect(await readNames(DAY)).toEqual(['1 Peter 1-2, 4-5', '2 Peter 1-3']);
  });

  it('does nothing without a plan', async () => {
    expect(await markChapterRead(JOHN_1, DAY)).toBeUndefined();
    expect(await unmarkChaptersRead([JOHN_1])).toBeUndefined();
  });
});

describe('what Today shows', () => {
  it('the plan view names the chapters read on a date, in plan order, and none on the next day', async () => {
    await startPlan('whole-bible', PETER_1);
    await setSetting(readingPlanSetting, 'on');
    await markHeard(PETER_2_3, 'finished', DAY);
    const { started } = await readPlan();
    expect(readRanges(started!.readOn(DAY))).toEqual(['1 Peter 1-5', '2 Peter 1-3']);
    expect(started?.next).toEqual(JOHN_1);
    expect(started!.readOn(NEXT_DAY)).toEqual([]);
  });

  it('groups consecutive chapters of a book into ranges and a single chapter by itself', () => {
    const c = (code: string, ...chapters: number[]) => chapters.map((chapter) => ({ code, chapter }));
    expect(readRanges([...c('gen', 50), ...c('exo', 1, 2, 3, 5)])).toEqual(['Genesis 50', 'Exodus 1-3, 5']);
    expect(readRanges([])).toEqual([]);
  });

  it('the tutor is told the chapters read today', () => {
    const facts = todayFacts({ date: DAY, on: ['Reading plan'], opened: [], plan: '1 John 1', readToday: ['1 Peter 1-5', '2 Peter 1-3'] });
    expect(facts).toContainEqual({ label: 'Read today', value: '1 Peter 1-5, 2 Peter 1-3' });
    expect(todayFacts({ date: DAY, on: ['Reading plan'], opened: [], plan: '1 John 1', readToday: [] })).toContainEqual({ label: 'Read today', value: 'nothing yet' });
    expect(todayFacts({ date: DAY, on: [], opened: [] }).map((f) => f.label)).not.toContain('Read today');
  });
});
