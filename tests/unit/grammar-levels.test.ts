import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus, latest, subscribe, type EventOf } from '../../src/events/bus';
import { db } from '../../src/data/db';
import { DAY, STEP_DAYS } from '../../src/data/schedule';
import { LADDER } from '../../src/data/grammar/ladder';
import { countDue, listDue } from '../../src/data/repositories/reviews';
import {
  SOLID_STEP,
  getLevel,
  levelFromStep,
  listLevels,
  recordGrammarAnswer,
  scheduleIdea,
  seedLevelsIfFirstOpen,
  setLevel,
} from '../../src/data/repositories/grammarLevels';

const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);
const day = (n: number) => NOW + n * DAY;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.grammarKnown.clear(), db.reviews.clear(), db.meta.clear()]);
});
afterEach(clearBus);
afterAll(() => db.close());

const review = async (id: string) => {
  const r = await db.reviews.get(['grammar', id]);
  if (!r) throw new Error(`no review for ${id}`);
  return r;
};

describe('levelFromStep', () => {
  it('is solid from the 14-day step up and frontier below it', () => {
    expect(STEP_DAYS[SOLID_STEP]).toBe(14);
    expect(levelFromStep(SOLID_STEP - 1)).toBe('frontier');
    expect(levelFromStep(SOLID_STEP)).toBe('solid');
    expect(levelFromStep(STEP_DAYS.length)).toBe('solid');
    expect(levelFromStep(0)).toBe('frontier');
  });
});

describe('setLevel', () => {
  it('writes the row and publishes grammar-level-changed', async () => {
    const heard: Array<EventOf<'grammar-level-changed'>> = [];
    subscribe('grammar-level-changed', (e) => heard.push(e));
    await setLevel('case-genitive', 'frontier', 'placement', NOW);
    expect(await db.grammarLevels.get('case-genitive')).toEqual({ id: 'case-genitive', level: 'frontier', since: NOW, how: 'placement' });
    expect(heard).toEqual([{ kind: 'grammar-level-changed', id: 'case-genitive', level: 'frontier' }]);
    expect(latest('grammar-level-changed')?.level).toBe('frontier');
  });

  it('getLevel and listLevels read the rows back; an idea with none is not there', async () => {
    expect(await getLevel('x')).toBeUndefined();
    await setLevel('a', 'solid', 'sheet', NOW);
    await setLevel('b', 'notYet', 'tutor', NOW);
    expect((await getLevel('a'))?.level).toBe('solid');
    const all = await listLevels();
    expect([...all.keys()].sort()).toEqual(['a', 'b']);
    expect(all.get('b')?.how).toBe('tutor');
  });
});

describe('recordGrammarAnswer', () => {
  it('makes a new idea frontier at step 0, due tomorrow', async () => {
    await recordGrammarAnswer('x', true, NOW);
    expect(await review('x')).toMatchObject({ kind: 'grammar', id: 'x', step: 0, due: NOW + DAY });
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'frontier', since: NOW, how: 'review' });
  });

  it('turns a frontier idea solid when two rights in a row at step 2 reach step 3', async () => {
    for (let i = 0; i < 4; i += 1) await recordGrammarAnswer('x', true, day(i)); // step 2 after four rights
    expect((await review('x')).step).toBe(2);
    expect((await getLevel('x'))?.level).toBe('frontier');
    const heard: Array<EventOf<'grammar-level-changed'>> = [];
    subscribe('grammar-level-changed', (e) => heard.push(e));
    await recordGrammarAnswer('x', true, day(10));
    expect((await getLevel('x'))?.level).toBe('frontier');
    expect(heard).toEqual([]);
    await recordGrammarAnswer('x', true, day(11));
    expect((await review('x')).step).toBe(SOLID_STEP);
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'solid', since: day(11), how: 'review' });
    expect(heard).toEqual([{ kind: 'grammar-level-changed', id: 'x', level: 'solid' }]);
  });

  it('drops a solid idea back to frontier on a wrong at step 3, with a lapse', async () => {
    for (let i = 0; i < 6; i += 1) await recordGrammarAnswer('x', true, day(i));
    expect((await review('x')).step).toBe(SOLID_STEP);
    expect((await getLevel('x'))?.level).toBe('solid');
    await recordGrammarAnswer('x', false, day(20));
    expect(await review('x')).toMatchObject({ step: 1, lapses: 1, due: day(21) });
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'frontier', since: day(20), how: 'review' });
  });

  it('makes a not-yet idea frontier when it is answered', async () => {
    await setLevel('x', 'notYet', 'placement', NOW);
    await recordGrammarAnswer('x', false, day(1));
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'frontier', since: day(1), how: 'review' });
  });

  it('keeps a solid idea he marked solid on a right, and leaves the level row alone when the level does not change', async () => {
    await setLevel('x', 'solid', 'sheet', NOW);
    await recordGrammarAnswer('x', true, day(1));
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'solid', since: NOW, how: 'sheet' });
  });

  it('announces how many are due', async () => {
    await recordGrammarAnswer('x', true, NOW);
    expect(latest('review-due-changed')).toEqual({ kind: 'review-due-changed', due: 0 });
  });
});

describe('scheduleIdea', () => {
  it('puts a frontier idea at step 0, due now', async () => {
    expect(await scheduleIdea('x', 'frontier', NOW)).toBe(1);
    expect(await review('x')).toMatchObject({ step: 0, due: NOW });
  });

  it('puts a solid idea at the 30-day step, due in 30 days: the I know this jump', async () => {
    expect(await scheduleIdea('x', 'solid', NOW)).toBe(1);
    expect(await review('x')).toMatchObject({ step: STEP_DAYS.indexOf(30), due: day(30) });
  });

  it('does not schedule a not-yet idea, and leaves one already scheduled alone', async () => {
    expect(await scheduleIdea('x', 'notYet', NOW)).toBe(0);
    expect(await db.reviews.count()).toBe(0);
    await scheduleIdea('y', 'frontier', NOW);
    expect(await scheduleIdea('y', 'solid', day(1))).toBe(0);
    expect((await review('y')).step).toBe(0);
  });
});

describe('seedLevelsIfFirstOpen', () => {
  it('makes the idea of a term he marked known solid, how marked, at the 30-day step, once', async () => {
    await db.grammarKnown.put({ term: 'genitive', since: 1 });
    const genitive = LADDER.find((i) => i.terms.includes('genitive'));
    expect(genitive).toBeDefined();
    const id = genitive!.id;
    expect(await seedLevelsIfFirstOpen(NOW)).toBe(true);
    expect(await getLevel(id)).toEqual({ id, level: 'solid', since: NOW, how: 'marked' });
    expect(await review(id)).toMatchObject({ step: STEP_DAYS.indexOf(30), due: day(30) });
    expect((await listLevels()).size).toBe(1);

    await db.grammarKnown.put({ term: 'dative', since: 2 });
    expect(await seedLevelsIfFirstOpen(day(1))).toBe(false);
    expect((await listLevels()).size).toBe(1);
  });

  it('seeds nothing, once, when no term is marked', async () => {
    expect(await seedLevelsIfFirstOpen(NOW)).toBe(true);
    expect((await listLevels()).size).toBe(0);
    expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined();
  });

  it('leaves an idea whose level is already set alone', async () => {
    await db.grammarKnown.put({ term: 'genitive', since: 1 });
    const id = LADDER.find((i) => i.terms.includes('genitive'))!.id;
    await setLevel(id, 'frontier', 'placement', NOW);
    await seedLevelsIfFirstOpen(day(1));
    expect(await getLevel(id)).toMatchObject({ level: 'frontier', how: 'placement' });
  });

  it('publishes grammar-level-changed for each idea it makes solid', async () => {
    await db.grammarKnown.put({ term: 'genitive', since: 1 });
    const heard: string[] = [];
    subscribe('grammar-level-changed', (e) => heard.push(`${e.id}:${e.level}`));
    await seedLevelsIfFirstOpen(NOW);
    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatch(/:solid$/);
  });
});

describe('the schedule and grammar ideas', () => {
  it('counts a due grammar idea, and lists it under its kind', async () => {
    await scheduleIdea('x', 'frontier', NOW);
    expect(await countDue(NOW)).toBe(1);
    expect(await countDue(NOW, 'grammar')).toBe(1);
    expect((await listDue('grammar', NOW)).map((r) => r.id)).toEqual(['x']);
    expect(await countDue(NOW - 1)).toBe(0);
  });
});
