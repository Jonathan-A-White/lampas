// The nightly tutor-weights run (mw-t3xu9a.8, docs/ask-tutor.md 'How the tutor learns what to carry'): on the first launch after 03:00 local, once a day, and only when the kit's WeightsReport says the
// counts changed, the app sends the report to the tutor-weights grind, may answer one ask-back, forwards the misses worth a story, applies the answer's lists with applyWeights and records the run.
// Fake clock, fake grist: `ask` counts the grists, the store is the kit's in-memory one.
import { createMemoryStore, createTutorClient, defineRegistry, type Fact, type TutorRecord } from 'voice-kit/talks';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getTuned } from '../../src/data/repositories/tuned';
import type { MissWorthAStory } from '../../src/services/feedback';
import { isWeightsAnswer, NIGHT_HOUR, tuneTheWeights, type WeightsAnswer, type WeightsRequest } from '../../src/tutor/weightsRun';
import { validate, type Schema } from '../support/schema-validate';
import { readFileSync } from 'node:fs';

const fact = (name: string, core = false): Fact => ({ name, tell: `the ${name}`, core: core || undefined, read: async () => ({ [name]: 'read' }) });
const registry = defineRegistry({ facts: [fact('where-he-is', true), fact('today-drill', true), fact('settings', true), fact('rusty-words'), fact('progress'), fact('works')] });

/** local time, so the test holds in any TZ */
const at = (day: number, hour: number, minute = 0): Date => new Date(2026, 9, day, hour, minute, 0);
const asks = (n: number, screen: string, name: string, from: number): TutorRecord[] => Array.from({ length: n }, (_, i) => ({ at: from + i, screen, kind: 'ask' as const, name, turn: i }));

const inputSchema = JSON.parse(readFileSync('grinds/tutor-weights.input.schema.json', 'utf8')) as Schema;

let clock: Date;
let store = createMemoryStore();
let grists: WeightsRequest[];
let forwards: MissWorthAStory[][];
let answers: WeightsAnswer[];

const client = () => createTutorClient<never>({ store, registry, screen: () => 'nightly', send: () => Promise.reject(new Error('no')), now: () => clock.getTime() });

/** one night's run, with the fake grist answering from `answers` in turn */
const night = (over: { forward?: (m: MissWorthAStory[]) => Promise<void> } = {}) =>
  tuneTheWeights({
    now: () => clock,
    client: client(),
    registry,
    ready: () => true,
    ask: async (request) => {
      grists.push(request);
      const next = answers.shift();
      if (!next) throw new Error('the fake grist has no more answers');
      return next;
    },
    forward: over.forward ?? (async (misses) => void forwards.push(misses)),
  });

// the Reader's counted list is rusty-words (asked back 5 times, the kit's threshold is 2); the tuner adds works to it
const wanted: WeightsAnswer = { lists: { Reader: ['rusty-words', 'works'] }, reasons: ['rusty-words was asked back 5 times on the Reader, and works goes with it'], misses_worth_a_story: [] };
const CORE = ['where-he-is', 'today-drill', 'settings'];

beforeEach(async () => {
  clock = at(25, 4);
  store = createMemoryStore();
  grists = [];
  forwards = [];
  answers = [wanted];
  await db.open();
  await db.settings.clear();
});

describe('when the night runs', () => {
  it('sends nothing before 03:00 local, even with the counts changed', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    clock = at(25, NIGHT_HOUR - 1, 59);
    expect(await night()).toBe('too-early');
    expect(grists).toHaveLength(0);
    expect(await getTuned()).toBeUndefined();
  });

  it('runs at 03:00 local and applies the answer\'s lists through applyWeights, recording the date', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    clock = at(25, NIGHT_HOUR);
    const result = await night();
    expect(grists).toHaveLength(1);
    expect(typeof result === 'object' && result.tuned.date).toBe('2026-10-25');
    // the list is the one the kit reads up front now, with a record of who applied it
    expect(await client().upFront('Reader')).toEqual([...CORE, 'rusty-words', 'works']);
    const weights = (await store.record('Reader')).filter((r) => r.kind === 'weights');
    expect(weights).toHaveLength(1);
    expect(weights[0]).toMatchObject({ name: 'grist', names: ['rusty-words', 'works'] });
    expect(await getTuned()).toMatchObject({ date: '2026-10-25', changes: 1, reasons: wanted.reasons, forwarded: 0 });
  });

  it('sends the report (changed, with the counts), the facts and the catalogue, and the request fits the grind\'s input schema', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    await night();
    const [request] = grists;
    expect(validate(request, inputSchema)).toEqual([]);
    expect(request.report.changed).toBe(true);
    expect(request.report.screens.Reader.counts).toEqual({ 'rusty-words': 5 });
    expect(Object.keys(request.facts)).toEqual(['where-he-is', 'today-drill', 'settings']);
    expect(request.catalogue.map((e) => e.name)).toContain('rusty-words');
    expect(request.asked).toBeUndefined();
  });

  it('runs once a day at most: a second launch the same day sends nothing, even with new counts', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    await night();
    clock = at(25, 22);
    await store.note(asks(3, 'Words', 'progress', at(25, 21).getTime()));
    answers = [wanted];
    expect(await night()).toBe('done-today');
    expect(grists).toHaveLength(1);
  });

  it('runs again the next night when something changed, and not when nothing did', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    await night();
    // the next night: nothing newer than the last run (not even the list it applied)
    clock = at(26, 3, 30);
    expect(await night()).toBe('unchanged');
    expect(grists).toHaveLength(1);
    // the night after, he asked back again on a screen
    await store.note(asks(2, 'Words', 'progress', at(26, 15).getTime()));
    clock = at(27, 9);
    answers = [{ lists: { Words: ['progress'] }, reasons: ['progress, twice on Words'], misses_worth_a_story: [] }];
    await night();
    expect(grists).toHaveLength(2);
    expect(grists[1].report.since).toBeGreaterThan(0);
    expect(grists[1].report.screens.Words.counts).toEqual({ progress: 2 });
    expect((await getTuned())?.date).toBe('2026-10-27');
  });

  it('asks the grist nothing when the report says changed=false (a new install, no record at all)', async () => {
    expect(await night()).toBe('unchanged');
    expect(grists).toHaveLength(0);
    expect(forwards).toHaveLength(0);
    expect(await getTuned()).toBeUndefined();
  });

  it('sends nothing, and records nothing, when the phone cannot ask (offline, no key, no licence)', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    const result = await tuneTheWeights({ now: () => clock, client: client(), registry, ready: () => false, ask: async (r) => (grists.push(r), wanted) });
    expect(result).toBe('not-ready');
    expect(grists).toHaveLength(0);
    expect(await getTuned()).toBeUndefined();
  });

  it('leaves everything as it was when the grist fails, so the next launch tries again', async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    answers = [];
    expect(await night()).toBe('failed');
    // still the counted list
    expect(await client().upFront('Reader')).toEqual([...CORE, 'rusty-words']);
    expect((await store.record('Reader')).filter((r) => r.kind === 'weights')).toHaveLength(0);
    expect(await getTuned()).toBeUndefined();
    answers = [wanted];
    expect(typeof (await night())).toBe('object');
  });
});

describe('what the answer changes', () => {
  beforeEach(async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
  });

  it('takes a list off the Reader too: the applied list replaces the counted one', async () => {
    answers = [{ lists: { Reader: ['progress'] }, reasons: ['progress suits the Reader better'], misses_worth_a_story: [] }];
    await night();
    expect(await client().upFront('Reader')).toEqual([...CORE, 'progress']);
  });

  it('counts only the screens whose list changed: a list that repeats the one read now is no change and writes no record', async () => {
    answers = [{ lists: { Reader: ['rusty-words'], Words: [] }, reasons: ['kept'], misses_worth_a_story: [] }];
    await store.note(asks(2, 'Words', 'progress', at(24, 21).getTime()));
    await night();
    // Words's counted list was ['progress'] and is now empty: one change; the Reader's list was the counted one already: none, and no record
    expect(await getTuned()).toMatchObject({ changes: 1 });
    expect((await store.record('Reader')).filter((r) => r.kind === 'weights')).toHaveLength(0);
    expect((await store.record('Words')).filter((r) => r.kind === 'weights')).toHaveLength(1);
    expect(await client().upFront('Words')).toEqual(['where-he-is', 'today-drill', 'settings']);
  });

  it('applies nothing for a screen the report does not have, and leaves a name the registry lacks out', async () => {
    answers = [{ lists: { Reader: ['works', 'no-such-fact', 'today-drill'], Elsewhere: ['works'], nightly: ['works'] }, reasons: ['x'], misses_worth_a_story: [] }];
    await night();
    expect(await client().upFront('Reader')).toEqual([...CORE, 'works']);
    expect(await client().upFront('Elsewhere')).toEqual(CORE);
    expect(await client().upFront('nightly')).toEqual(CORE);
    expect((await store.record('Elsewhere')).length).toBe(0);
  });

  it('with no lists at all (nothing to do) applies nothing and still records the night', async () => {
    answers = [{ lists: {}, reasons: ['nothing needed to change'], misses_worth_a_story: [] }];
    await night();
    expect((await store.record()).filter((r) => r.kind === 'weights')).toHaveLength(0);
    expect(await getTuned()).toMatchObject({ date: '2026-10-25', changes: 0, reasons: ['nothing needed to change'] });
  });
});

describe('the extra turn', () => {
  beforeEach(async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
  });

  it('reads the facts the answer asks for from the registry, sends them as asked, and uses the second answer', async () => {
    answers = [{ lists: {}, reasons: [], misses_worth_a_story: [], asks: ['progress'] }, wanted];
    await night();
    expect(grists).toHaveLength(2);
    expect(grists[0].asked).toBeUndefined();
    expect(grists[1].asked).toEqual({ progress: { progress: 'read' } });
    expect(validate(grists[1], inputSchema)).toEqual([]);
    expect(await client().upFront('Reader')).toContain('rusty-words');
  });

  it('records no ask-back and no miss for what it reads: the night\'s own reads are not counts of his', async () => {
    answers = [{ lists: {}, reasons: [], misses_worth_a_story: [], asks: ['progress', 'works', 'no-such-fact'] }, wanted];
    const counted = async () => (await store.record()).filter((r) => r.kind === 'ask' || r.kind === 'miss');
    const before = await counted();
    await night();
    expect(await counted()).toEqual(before);
  });

  it('leaves the screen \'nightly\' out of the report: building the request notes a turn there, and it is no screen of his', async () => {
    await night();
    answers = [wanted];
    clock = at(26, 4);
    // the turn the first request noted on 'nightly' is no change, so the next night asks nothing
    expect(await night()).toBe('unchanged');
    expect(Object.keys(grists[0].report.screens)).toEqual(['Reader']);
  });

  it('tells it what it cannot have: a name that is no fact is answered as unavailable, not left out', async () => {
    answers = [{ lists: {}, reasons: [], misses_worth_a_story: [], asks: ['no-such-fact'] }, wanted];
    await night();
    expect(Object.keys(grists[1].asked ?? {})).toEqual(['no-such-fact']);
    expect(JSON.stringify(grists[1].asked)).toContain('unavailable');
  });

  it('takes one extra turn at most: a second answer that asks again is applied as it stands', async () => {
    answers = [
      { lists: {}, reasons: [], misses_worth_a_story: [], asks: ['progress'] },
      { lists: { Reader: ['progress'] }, reasons: ['r'], misses_worth_a_story: [], asks: ['works'] },
    ];
    await night();
    expect(grists).toHaveLength(2);
    expect(await client().upFront('Reader')).toContain('progress');
  });
});

describe('the forward: misses worth a story go to the factory', () => {
  beforeEach(async () => {
    await store.note(asks(5, 'Reader', 'rusty-words', at(24, 20).getTime()));
    const miss = (screen: string, name: string, n: number, why: string): TutorRecord[] =>
      Array.from({ length: n }, (_, i) => ({ at: at(24, 21).getTime() + i, screen, kind: 'miss' as const, name, turn: i, why }));
    await store.note([...miss('Reader', 'the verses he marked last week', 3, 'no fact holds them'), ...miss('Words', 'undo a tick', 1, 'no command')]);
  });

  it('forwards each miss with its title, why, screen and the count the report holds for it', async () => {
    answers = [
      {
        lists: {},
        reasons: [],
        misses_worth_a_story: [{ title: 'A fact for the verses he marked', why: 'He asked three times and the catalogue has none.', screen: 'Reader', name: 'the verses he marked last week' }],
      },
    ];
    const result = await night();
    expect(forwards).toEqual([[{ title: 'A fact for the verses he marked', why: 'He asked three times and the catalogue has none.', screen: 'Reader', count: 3 }]]);
    expect(typeof result === 'object' && result.tuned.forwarded).toBe(1);
  });

  it('forwards nothing when the answer names none', async () => {
    await night();
    expect(forwards).toHaveLength(0);
  });

  it('drops a miss the report does not hold (nothing to count), and forwards the rest', async () => {
    answers = [
      {
        lists: {},
        reasons: [],
        misses_worth_a_story: [
          { title: 'Invented', why: 'not in the report', screen: 'Reader', name: 'never missed' },
          { title: 'Undo a tick', why: 'once', screen: 'Words', name: 'undo a tick' },
        ],
      },
    ];
    await night();
    expect(forwards).toEqual([[{ title: 'Undo a tick', why: 'once', screen: 'Words', count: 1 }]]);
  });

  it('applies nothing and records nothing when the forward fails, so the next launch sends the whole run again', async () => {
    answers = [{ ...wanted, misses_worth_a_story: [{ title: 'T', why: 'W', screen: 'Words', name: 'undo a tick' }] }];
    expect(await night({ forward: () => Promise.reject(new Error('not sent')) })).toBe('failed');
    expect(await getTuned()).toBeUndefined();
    expect((await store.record('Reader')).filter((r) => r.kind === 'weights')).toHaveLength(0);
  });
});

describe('the answer\'s shape', () => {
  it.each([
    ['lists and reasons', wanted],
    ['an ask-back', { lists: {}, reasons: [], asks: ['progress'] }],
  ])('accepts %s', (_, answer) => {
    expect(isWeightsAnswer({ misses_worth_a_story: [], ...answer })).toBe(true);
  });

  it.each([
    ['no lists', { reasons: [] }],
    ['a list that is not names', { lists: { Reader: 'rusty-words' }, reasons: [] }],
    ['a field it does not know', { lists: {}, reasons: [], do: [] }],
    ['a miss with no title', { lists: {}, reasons: [], misses_worth_a_story: [{ why: 'w', screen: 's', name: 'n' }] }],
  ])('refuses %s', (_, answer) => {
    expect(isWeightsAnswer(answer)).toBe(false);
  });
});
