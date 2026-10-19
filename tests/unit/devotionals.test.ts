import { describe, expect, it } from 'vitest';
import { DEFAULT_DEVOTIONAL, DEVOTIONALS, RANDOM, devotionalForDay, tickedDevotionals } from '../../src/data/daily/devotionals';

const MORNING_AND_EVENING = 'LLS:20.10.1';
const MY_UTMOST = 'LLS:20.10.2';

describe('the devotionals catalog', () => {
  it('holds the 37 devotionals of his Logos library, each with a unique id', () => {
    expect(DEVOTIONALS).toHaveLength(37);
    expect(new Set(DEVOTIONALS.map((d) => d.id)).size).toBe(37);
  });

  it('includes Morning and Evening (the default) and My Utmost for His Highest', () => {
    expect(DEFAULT_DEVOTIONAL).toBe(MORNING_AND_EVENING);
    expect(DEVOTIONALS.find((d) => d.id === MORNING_AND_EVENING)?.title).toBe('Morning and Evening');
    expect(DEVOTIONALS.find((d) => d.id === MY_UTMOST)?.title).toBe('My Utmost for His Highest');
  });

  it('gives every entry a title and says whether Logos opens it by day of year', () => {
    for (const d of DEVOTIONALS) {
      expect(d.title, d.id).not.toBe('');
      expect(typeof d.dayOfYear, d.id).toBe('boolean');
    }
  });
});

describe('devotionalForDay', () => {
  const ticked = ['LLS:365SPURGEON1', 'LLS:365SPURGEON2', MY_UTMOST, 'LLS:STRMSDSRT'];

  it('returns the devotional he chose, whatever is ticked', () => {
    expect(devotionalForDay(MY_UTMOST, ticked, new Date(2026, 9, 19)).id).toBe(MY_UTMOST);
    expect(devotionalForDay(MORNING_AND_EVENING, [], new Date(2026, 9, 19)).id).toBe(MORNING_AND_EVENING);
  });

  it('with Random, gives the same devotional at any time of one local day', () => {
    const early = devotionalForDay(RANDOM, ticked, new Date(2026, 9, 19, 0, 0, 1));
    const late = devotionalForDay(RANDOM, ticked, new Date(2026, 9, 19, 23, 59, 59));
    expect(late.id).toBe(early.id);
    expect(ticked).toContain(early.id);
  });

  it('with Random, changes across a week and always draws from the ticked ones', () => {
    const week = Array.from({ length: 7 }, (_, i) => devotionalForDay(RANDOM, ticked, new Date(2026, 9, 19 + i)).id);
    expect(new Set(week).size).toBeGreaterThanOrEqual(2);
    for (const id of week) expect(ticked).toContain(id);
  });

  it('with Random and nothing ticked, falls back to Morning and Evening', () => {
    expect(devotionalForDay(RANDOM, [], new Date(2026, 9, 19)).id).toBe(MORNING_AND_EVENING);
    expect(devotionalForDay(RANDOM, ['not-a-devotional'], new Date(2026, 9, 19)).id).toBe(MORNING_AND_EVENING);
  });

  it('falls back to Morning and Evening for a choice that is not in the catalog', () => {
    expect(devotionalForDay('LLS:GONE', ticked, new Date(2026, 9, 19)).id).toBe(MORNING_AND_EVENING);
  });
});

describe('tickedDevotionals', () => {
  it('reads "all" as every devotional and a list as the known ids in it', () => {
    expect(tickedDevotionals('all')).toHaveLength(37);
    expect(tickedDevotionals(`${MY_UTMOST},LLS:GONE,${MORNING_AND_EVENING}`)).toEqual([MORNING_AND_EVENING, MY_UTMOST]);
    expect(tickedDevotionals('')).toEqual([]);
  });
});
