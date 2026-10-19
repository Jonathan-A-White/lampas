// tests/unit/reading-plan-place.test.ts — he can set where he is in the reading plan (mw-5r3p30.623): setPlace(chapter) makes it the plan's next chapter and keeps the done list,
// setPlaceAfter(chapter) is "I'm at 1 John 2" (read through it), restorePlan(previous) is Undo, and every screen that shows the place reads the one store.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { planOf } from '../../src/data/plans';
import { getReadingPlan, markDoneThrough, nextChapter, planProgress, restorePlan, setPlace, setPlaceAfter, startPlan } from '../../src/data/repositories';
import { keyOf } from '../../src/data/repositories/readingPlan';
import { readPlan } from '../../src/plan/usePlan';
import { readingPlanSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { todayFacts } from '../../src/today/tutorFacts';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const PETER_2 = { code: '1pe', chapter: 2 };
const JOHN_2 = { code: '1jn', chapter: 2 };
const PSALM_23 = { code: 'psa', chapter: 23 };
const chapters = () => planOf('whole-bible')!.chapters();
const indexOf = (c: { code: string; chapter: number }) => chapters().findIndex((x) => x.code === c.code && x.chapter === c.chapter);

describe('setting where he is', () => {
  it('has no plan to move', async () => {
    expect(await setPlace(JOHN_2)).toBeUndefined();
    expect(await setPlaceAfter(JOHN_2)).toBeUndefined();
    expect(await getReadingPlan()).toBeUndefined();
  });

  it('refuses a chapter the plan does not hold, changing nothing', async () => {
    await startPlan('whole-bible', PETER_2);
    const before = await getReadingPlan();
    expect(await setPlace({ code: 'xyz', chapter: 1 })).toBeUndefined();
    expect(await getReadingPlan()).toEqual(before);
  });

  it('moves forward: the chapter is next, everything before it is done, what was done stays done', async () => {
    await startPlan('whole-bible', PETER_2);
    const before = await getReadingPlan();
    await setPlace(JOHN_2);
    const state = (await getReadingPlan())!;
    expect(await nextChapter()).toEqual(JOHN_2);
    expect(state.done).toHaveLength(indexOf(JOHN_2));
    for (const key of before!.done) expect(state.done).toContain(key);
    expect(state.planId).toBe('whole-bible');
  });

  it('moves back to a chapter already done: it is next again and the chapters done after it stay done', async () => {
    await startPlan('whole-bible', PETER_2);
    const previous = await setPlace(PSALM_23);
    expect(previous?.done).toHaveLength(indexOf(PETER_2));
    expect(await nextChapter()).toEqual(PSALM_23);
    const state = (await getReadingPlan())!;
    expect(state.done).not.toContain(keyOf(PSALM_23));
    expect(state.done).toContain('psa.22');
    expect(state.done).toContain('gen.1');
    // the chapters done after the new place are not forgotten: the count is what was done, less Psalms 23
    expect(state.done).toHaveLength(indexOf(PETER_2) - 1);
    expect(await planProgress()).toEqual({ done: indexOf(PETER_2) - 1, total: 1189 });
    // listening on from the new place: finishing it goes to the next chapter not done
    await markDoneThrough(PSALM_23);
    expect(await nextChapter()).toEqual(PETER_2);
  });

  it("'I'm at 1 John 2' counts that chapter done: the next is 1 John 3", async () => {
    await startPlan('whole-bible', PETER_2);
    await setPlaceAfter(JOHN_2);
    expect(await nextChapter()).toEqual({ code: '1jn', chapter: 3 });
    expect((await getReadingPlan())!.done).toContain('1jn.2');
  });

  it("'I'm at Revelation 22' finishes the plan", async () => {
    await startPlan('whole-bible', PETER_2);
    await setPlaceAfter({ code: 'rev', chapter: 22 });
    expect(await nextChapter()).toBeUndefined();
    expect(await planProgress()).toEqual({ done: 1189, total: 1189 });
  });

  it('keeps the open listening session and the plan he is on', async () => {
    await startPlan('whole-bible', PETER_2);
    const state = (await getReadingPlan())!;
    await db.settings.put({ key: 'readingPlanState', value: JSON.stringify({ ...state, session: { ...PETER_2, startedAt: 5 } }) });
    await setPlace(JOHN_2);
    expect((await getReadingPlan())!.session).toEqual({ ...PETER_2, startedAt: 5 });
  });
});

describe('Undo', () => {
  it('puts the place and the done list back exactly', async () => {
    await startPlan('whole-bible', PETER_2);
    await markDoneThrough(PETER_2);
    const before = await getReadingPlan();
    const previous = await setPlace(PSALM_23);
    expect(await getReadingPlan()).not.toEqual(before);
    await restorePlan(previous!);
    expect(await getReadingPlan()).toEqual(before);
    expect(await nextChapter()).toEqual({ code: '1pe', chapter: 3 });
  });

  it('undoes a move forward too', async () => {
    await startPlan('whole-bible', PSALM_23);
    const before = await getReadingPlan();
    const previous = await setPlaceAfter(JOHN_2);
    await restorePlan(previous!);
    expect(await getReadingPlan()).toEqual(before);
  });
});

describe('every screen that shows the place reads the one store', () => {
  it('Today, the picker marks, the progress count and what the tutor is told all follow a move', async () => {
    await startPlan('whole-bible', PETER_2);
    await setSetting(readingPlanSetting, 'on');
    await setPlace(PSALM_23);
    // Today's plan row and the Reader's picker marks (usePlan reads readPlan)
    const { started } = await readPlan();
    expect(started?.next).toEqual(PSALM_23);
    expect(started?.done.has('psa.22')).toBe(true);
    expect(started?.done.has('psa.23')).toBe(false);
    expect(started?.count).toBe(indexOf(PETER_2) - 1);
    // the Settings row and the repositories
    expect(await nextChapter()).toEqual(PSALM_23);
    expect((await planProgress()).done).toBe(started?.count);
    // the tutor: Today reports the plan's place as a screen fact
    const facts = todayFacts({ date: '2026-10-19', on: ['Reading plan'], opened: [], plan: 'Psalms 23' });
    expect(facts).toContainEqual({ label: 'Reading plan', value: 'Next: Psalms 23' });
    expect(todayFacts({ date: '2026-10-19', on: [], opened: [] }).map((f) => f.label)).not.toContain('Reading plan');
  });
});
