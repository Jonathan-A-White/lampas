// tests/unit/devotional-draw.test.ts — the one draw over sources (mw-r9xo1pj.4): drawPool, and devotionalForDay, anotherDevotional, pickableDevotionals and devotionalToday through it.
import { describe, expect, it } from 'vitest';
import {
  ALL_SOURCES,
  DEFAULT_DEVOTIONAL,
  DEVOTIONALS,
  DEVOTIONAL_SOURCES,
  MORNING_REPHIL_ID,
  RANDOM,
  anotherDevotional,
  devotionalForDay,
  drawPool,
  drawSourcesOf,
  pickableDevotionals,
} from '../../src/data/daily/devotionals';
import { devotionalToday, type Episode } from '../../src/data/daily/morningRephil';

const ticked = DEVOTIONALS.map((d) => d.id);
const everyOwned = new Set(ticked);
const year = Array.from({ length: 400 }, (_, i) => new Date(2026, 0, 1 + i));
const NO_LOGOS = { logos: false, rephil: true };
const NO_REPHIL = { logos: true, rephil: false };
const NOTHING = { logos: false, rephil: false };
const idsOf = (pool: readonly { id: string }[]) => pool.map((d) => d.id);

describe('the sources', () => {
  it('names each source once, with who gives it', () => {
    expect(DEVOTIONAL_SOURCES.map((s) => [s.id, s.provider, s.kind])).toEqual([
      ['logos', 'Logos', 'logos'],
      ['rephil', 'Brookfield First', 'episodes'],
    ]);
  });

  it('is on from Logos itself and each switch: absent reads as On', () => {
    expect(drawSourcesOf(true)).toEqual(ALL_SOURCES);
    expect(drawSourcesOf(true, 'off', 'on')).toEqual(NO_LOGOS);
    expect(drawSourcesOf(true, 'on', 'off')).toEqual(NO_REPHIL);
    expect(drawSourcesOf(false, 'on', 'on')).toEqual(NO_LOGOS);
    expect(drawSourcesOf(false, 'off', 'off')).toEqual(NOTHING);
  });
});

describe('drawPool', () => {
  it('holds the ticked Logos devotionals and Morning RePhil while an episode is unheard', () => {
    expect(idsOf(drawPool(ticked, true))).toEqual([...ticked, MORNING_REPHIL_ID]);
    expect(idsOf(drawPool(ticked, false))).toEqual(ticked);
  });

  it('with Logos devotionals off holds only Morning RePhil, and only while an episode is unheard', () => {
    expect(idsOf(drawPool(ticked, true, NO_LOGOS))).toEqual([MORNING_REPHIL_ID]);
    expect(drawPool(ticked, false, NO_LOGOS)).toEqual([]);
  });

  it('with Brookfield First off never holds Morning RePhil', () => {
    expect(idsOf(drawPool(ticked, true, NO_REPHIL))).toEqual(ticked);
    expect(drawPool(ticked, true, NOTHING)).toEqual([]);
  });

  it('holds only the ticked ones', () => {
    expect(idsOf(drawPool([DEFAULT_DEVOTIONAL], false))).toEqual([DEFAULT_DEVOTIONAL]);
    expect(drawPool([], false)).toEqual([]);
  });
});

describe('Random, drawn from the sources that are on', () => {
  it('never draws Morning RePhil with Brookfield First off, though an episode is unheard', () => {
    const drawn = year.map((d) => devotionalForDay(RANDOM, ticked, d, undefined, true, NO_REPHIL).id);
    expect(drawn).not.toContain(MORNING_REPHIL_ID);
    expect(new Set(drawn).size).toBeGreaterThan(5);
  });

  it('never draws a Logos devotional with Logos devotionals off, and does draw Morning RePhil', () => {
    const drawn = year.map((d) => devotionalForDay(RANDOM, ticked, d, undefined, true, NO_LOGOS).id);
    expect(new Set(drawn)).toEqual(new Set([MORNING_REPHIL_ID]));
  });

  it("ignores the day's pick when its source is off, and keeps it while it is on", () => {
    const day = new Date(2026, 10, 19);
    const other = DEVOTIONALS[3].id;
    expect(devotionalForDay(RANDOM, ticked, day, other, true).id).toBe(other);
    expect(devotionalForDay(RANDOM, ticked, day, other, true, NO_LOGOS).id).toBe(MORNING_REPHIL_ID);
    expect(devotionalForDay(RANDOM, ticked, day, MORNING_REPHIL_ID, true).id).toBe(MORNING_REPHIL_ID);
    expect(devotionalForDay(RANDOM, ticked, day, MORNING_REPHIL_ID, true, NO_REPHIL).id).not.toBe(MORNING_REPHIL_ID);
  });

  it('gives Morning and Evening when every source is off', () => {
    expect(devotionalForDay(RANDOM, ticked, new Date(2026, 10, 19), undefined, true, NOTHING).id).toBe(DEFAULT_DEVOTIONAL);
  });

  it('draws the same as before with every source on', () => {
    for (const d of year.slice(0, 50)) expect(devotionalForDay(RANDOM, ticked, d, undefined, true, ALL_SOURCES).id).toBe(devotionalForDay(RANDOM, ticked, d, undefined, true).id);
  });

  it('keeps a devotional he chose by name, whatever is on', () => {
    expect(devotionalForDay(DEFAULT_DEVOTIONAL, ticked, new Date(2026, 10, 19), undefined, true, NOTHING).id).toBe(DEFAULT_DEVOTIONAL);
  });
});

describe('Another, drawn from the same sources', () => {
  const some = (sources: typeof ALL_SOURCES, current: string) => new Set(Array.from({ length: 80 }, (_, i) => anotherDevotional(current, ticked, () => i / 80, true, sources)));

  it('never offers Morning RePhil with Brookfield First off', () => {
    expect(some(NO_REPHIL, DEFAULT_DEVOTIONAL)).not.toContain(MORNING_REPHIL_ID);
  });

  it('never offers a Logos devotional with Logos devotionals off', () => {
    expect(some(NO_LOGOS, DEFAULT_DEVOTIONAL)).toEqual(new Set([MORNING_REPHIL_ID]));
  });

  it('stays on the one shown when no source has another', () => {
    expect(anotherDevotional(MORNING_REPHIL_ID, ticked, () => 0, true, NO_LOGOS)).toBe(MORNING_REPHIL_ID);
    expect(anotherDevotional(DEFAULT_DEVOTIONAL, ticked, () => 0, true, NOTHING)).toBe(DEFAULT_DEVOTIONAL);
  });
});

describe('the picker, over the same sources', () => {
  it('lists Morning RePhil only while Brookfield First is on, or when it is the one chosen', () => {
    expect(idsOf(pickableDevotionals(ticked, DEFAULT_DEVOTIONAL, everyOwned, NO_REPHIL))).not.toContain(MORNING_REPHIL_ID);
    expect(idsOf(pickableDevotionals(ticked, MORNING_REPHIL_ID, everyOwned, NO_REPHIL))).toContain(MORNING_REPHIL_ID);
    expect(idsOf(pickableDevotionals(ticked, DEFAULT_DEVOTIONAL, everyOwned))).toContain(MORNING_REPHIL_ID);
  });

  it('lists no Logos devotional but the chosen one with Logos devotionals off', () => {
    expect(idsOf(pickableDevotionals(ticked, DEFAULT_DEVOTIONAL, everyOwned, NO_LOGOS))).toEqual([DEFAULT_DEVOTIONAL, MORNING_REPHIL_ID]);
  });
});

describe("Today's devotional, over the same sources", () => {
  const list: Episode[] = [{ id: 'a', number: 1, title: 'one', date: '2026-01-01', share: 'https://example.org/a' }];
  const base = { choice: RANDOM, ticked, date: new Date(2026, 10, 19), heard: new Set<string>(), order: 'oldest' as const, backup: DEFAULT_DEVOTIONAL, logosOn: true, list };

  it('with Brookfield First off never draws Morning RePhil', () => {
    for (const date of year) expect(devotionalToday({ ...base, date, rephilOn: false })?.devotional.id).not.toBe(MORNING_REPHIL_ID);
  });

  it('with the Logos source off draws Morning RePhil, and with nothing else on shows nothing for a Logos choice', () => {
    for (const date of year.slice(0, 40)) expect(devotionalToday({ ...base, date, logosOn: false })?.devotional.id).toBe(MORNING_REPHIL_ID);
    expect(devotionalToday({ ...base, choice: DEFAULT_DEVOTIONAL, logosOn: false })).toBeUndefined();
  });
});
