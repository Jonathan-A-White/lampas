import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearBus, latest, subscribe, type EventOf } from '../../src/events/bus';
import type { DrillResult } from '../../src/data/grammar/drillIt';
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
  recordDrill,
  teachIdea,
} from '../../src/data/repositories/grammarLevels';

const NOW = Date.UTC(2026, 9, 8, 9, 0, 0);
const day = (n: number) => NOW + n * DAY;

beforeEach(async () => {
  await db.open();
  await Promise.all([db.grammarLevels.clear(), db.grammarKnown.clear(), db.reviews.clear(), db.meta.clear(), db.drillRuns.clear()]);
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
    // proving the frontier also moves it on to the next idea (mw-i7xe0n.6): that is another event, about another idea
    expect(heard.filter((e) => e.id === 'x')).toEqual([{ kind: 'grammar-level-changed', id: 'x', level: 'solid' }]);
  });

  it('drops a solid idea back to frontier on a wrong at step 3, with a lapse', async () => {
    for (let i = 0; i < 6; i += 1) await recordGrammarAnswer('x', true, day(i));
    expect((await review('x')).step).toBe(SOLID_STEP);
    expect((await getLevel('x'))?.level).toBe('solid');
    await db.grammarLevels.where('level').equals('frontier').delete(); // the idea proving x moved the frontier on to is not what this is about
    await recordGrammarAnswer('x', false, day(20));
    expect(await review('x')).toMatchObject({ step: 1, lapses: 1, due: day(21) });
    expect(await getLevel('x')).toEqual({ id: 'x', level: 'frontier', since: day(20), how: 'review' });
  });

  it('makes a not-yet idea frontier when it is answered', async () => {
    await setLevel('x', 'notYet', 'sheet', NOW);
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

describe('teachIdea', () => {
  it('Got it: frontier by the sheet, step 0 due tomorrow, and says so on the bus', async () => {
    const seen: EventOf<'idea-taught'>[] = [];
    subscribe('idea-taught', (e) => seen.push(e));
    await teachIdea('case-genitive', 'got-it', NOW);
    expect(await getLevel('case-genitive')).toEqual({ id: 'case-genitive', level: 'frontier', since: NOW, how: 'sheet' });
    expect(await review('case-genitive')).toMatchObject({ step: 0, due: day(1), lastWhen: NOW, lapses: 0, rights: 0 });
    expect(latest('grammar-level-changed')).toEqual({ kind: 'grammar-level-changed', id: 'case-genitive', level: 'frontier' });
    expect(seen).toEqual([{ kind: 'idea-taught', id: 'case-genitive', outcome: 'got-it' }]);
    expect(await countDue(day(1))).toBe(1);
    expect(await countDue(NOW)).toBe(0);
  });

  it('I know this: solid by the sheet, the 30-day step due in 30 days', async () => {
    await teachIdea('case-genitive', 'known', NOW);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'solid', how: 'sheet' });
    expect(await review('case-genitive')).toMatchObject({ step: STEP_DAYS.indexOf(30), due: day(30) });
  });

  it('puts an idea already on the schedule where he says, keeping its lapses and rights', async () => {
    await db.reviews.put({ kind: 'grammar', id: 'case-genitive', step: 2, due: day(-1), lastWhen: day(-5), lapses: 2, rights: 1 });
    await teachIdea('case-genitive', 'known', NOW);
    expect(await review('case-genitive')).toEqual({ kind: 'grammar', id: 'case-genitive', step: STEP_DAYS.indexOf(30), due: day(30), lastWhen: NOW, lapses: 2, rights: 1 });
    await teachIdea('case-genitive', 'got-it', NOW);
    expect(await review('case-genitive')).toMatchObject({ step: 0, due: day(1), lapses: 2 });
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'frontier' });
  });
});

describe('teachIdea, the rest of the slider (mw-i7xe0n.3)', () => {
  it('Not yet: not yet by the sheet, taken off the schedule, and says so on the bus', async () => {
    await teachIdea('case-genitive', 'known', NOW);
    const seen: EventOf<'idea-taught'>[] = [];
    subscribe('idea-taught', (e) => seen.push(e));
    await teachIdea('case-genitive', 'not-yet', NOW);
    expect(await getLevel('case-genitive')).toEqual({ id: 'case-genitive', level: 'notYet', since: NOW, how: 'sheet' });
    expect(await db.reviews.get(['grammar', 'case-genitive'])).toBeUndefined();
    expect(seen).toEqual([{ kind: 'idea-taught', id: 'case-genitive', outcome: 'not-yet' }]);
  });

  it('takes the `how` it is given: a drill sets solid, how drill', async () => {
    await teachIdea('case-genitive', 'known', NOW, 'drill');
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'solid', how: 'drill' });
  });
});

describe('recordDrill', () => {
  const result = (over: Partial<DrillResult> = {}): DrillResult => ({
    ideaId: 'case-genitive', proved: false, edgeStep: 1, topStep: 3, strong: [], weak: [{ id: 'f', label: 'F' }], answers: [], ended: 'edge', ...over,
  });

  it('keeps every run; a proof makes the idea solid at the 30-day step, how drill', async () => {
    expect(await recordDrill(result({ proved: true, ended: 'proved', edgeStep: 3 }), 'prove', NOW)).toBe('solid');
    expect(await db.drillRuns.count()).toBe(1);
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'solid', how: 'drill' });
    expect(await review('case-genitive')).toMatchObject({ step: STEP_DAYS.indexOf(30), due: day(30) });
  });

  it('a run to prove it that fails puts the idea on the frontier, how drill, due tomorrow', async () => {
    expect(await recordDrill(result(), 'prove', NOW)).toBe('frontier');
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'frontier', how: 'drill' });
    expect(await review('case-genitive')).toMatchObject({ step: 0, due: day(1) });
    expect(await db.drillRuns.count()).toBe(1);
  });

  it('a failed run on an idea already at the frontier leaves its schedule as it was', async () => {
    await teachIdea('case-genitive', 'got-it', NOW - 2 * DAY);
    const before = await review('case-genitive');
    expect(await recordDrill(result(), 'prove', NOW)).toBe('frontier');
    expect(await review('case-genitive')).toEqual(before);
    expect(await getLevel('case-genitive')).toMatchObject({ how: 'sheet' });
  });

  it('a practice run that is not a proof keeps the run and changes no level', async () => {
    await teachIdea('case-genitive', 'known', NOW - DAY);
    expect(await recordDrill(result(), 'practice', NOW)).toBe('solid');
    expect(await getLevel('case-genitive')).toMatchObject({ level: 'solid', how: 'sheet', since: NOW - DAY });
    expect(await db.drillRuns.count()).toBe(1);
    expect(await recordDrill(result(), 'practice', NOW)).toBe('solid');
    await db.grammarLevels.clear();
    expect(await recordDrill(result(), 'practice', NOW)).toBe('notYet');
    expect(await getLevel('case-genitive')).toBeUndefined();
  });
});
