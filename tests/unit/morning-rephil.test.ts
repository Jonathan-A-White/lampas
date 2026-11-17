// Morning RePhil (Brookfield First's devotional with Pastor Phil) as a devotional beside the Logos ones (mw-qtu3zvz.15): the bundled episode list, the pure choice of the
// day's episode in each order against a heard set, Random drawing it only while an episode is unheard, and the heard set kept on the device.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { DEFAULT_DEVOTIONAL, DEVOTIONALS, MORNING_REPHIL, MORNING_REPHIL_ID, RANDOM, anotherDevotional, devotionalForDay, devotionalOf, pickableDevotionals } from '../../src/data/daily/devotionals';
import { EPISODES, anotherEpisode, episodeForDay, episodeDate, nextEpisode, orderedEpisodes, type Episode } from '../../src/data/daily/morningRephil';
import { clearHeard, getDay, getHeard, markHeard, pinEpisode, setDevotionalPick } from '../../src/data/daily/dailyStore';

afterAll(() => db.close());
beforeEach(async () => {
  await db.settings.clear();
});

const ep = (id: string, date: string, number: number | null = null): Episode => ({ id, number, title: number === null ? 'Morning RePhil' : `Morning RePhil #${number}`, date, share: `https://brookfieldfirst.subspla.sh/${id}` });
const THREE = [ep('a', '2026-01-01', 1), ep('b', '2026-01-04', 2), ep('c', '2026-01-08', 3)];
const day = new Date(2026, 10, 16);

describe('the bundled list', () => {
  it('holds the episodes oldest first, each with a Subsplash share link and no YouTube address', () => {
    expect(EPISODES.length).toBeGreaterThan(200);
    expect(new Set(EPISODES.map((e) => e.id)).size).toBe(EPISODES.length);
    for (const e of EPISODES) {
      expect(e.share, e.id).toMatch(/^https:\/\/brookfieldfirst\.subspla\.sh\/\w+$/);
      expect(e.date, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(JSON.stringify(e)).not.toMatch(/youtube/i);
    }
    expect(EPISODES.map((e) => e.date)).toEqual([...EPISODES.map((e) => e.date)].sort());
  });

  it('prints a number only where the church\'s own title does', () => {
    for (const e of EPISODES) expect(e.number === null ? !/#\d/.test(e.title) : e.title.includes(`#${e.number}`), e.id).toBe(true);
  });
});

describe('the next episode, in each order', () => {
  it('Oldest first is the first one not heard, from the first', () => {
    expect(nextEpisode('oldest', new Set(), THREE)?.id).toBe('a');
    expect(nextEpisode('oldest', new Set(['a']), THREE)?.id).toBe('b');
    expect(nextEpisode('oldest', new Set(['a', 'c']), THREE)?.id).toBe('b');
  });

  it('Newest first is the latest one not heard', () => {
    expect(nextEpisode('newest', new Set(), THREE)?.id).toBe('c');
    expect(nextEpisode('newest', new Set(['c']), THREE)?.id).toBe('b');
  });

  it('is nothing once every one is heard, and a new episode in the list is the next', () => {
    const all = new Set(['a', 'b', 'c']);
    expect(nextEpisode('oldest', all, THREE)).toBeUndefined();
    expect(nextEpisode('newest', all, THREE)).toBeUndefined();
    expect(nextEpisode('oldest', all, [...THREE, ep('d', '2026-01-11', 4)])?.id).toBe('d');
  });

  it('puts the same list in the order asked for', () => {
    expect(orderedEpisodes('newest', THREE).map((e) => e.id)).toEqual(['c', 'b', 'a']);
    expect(orderedEpisodes('oldest', THREE).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('the day\'s episode', () => {
  it('is the one kept for the day while it is in the list, even once heard, else the next unheard', () => {
    expect(episodeForDay('oldest', new Set(['a']), 'a', THREE)?.id).toBe('a');
    expect(episodeForDay('oldest', new Set(['a']), undefined, THREE)?.id).toBe('b');
    expect(episodeForDay('oldest', new Set(['a']), 'gone', THREE)?.id).toBe('b');
    expect(episodeForDay('oldest', new Set(['a', 'b', 'c']), undefined, THREE)).toBeUndefined();
  });

  it('Another is the next unheard one after the day\'s, going round, never the same one', () => {
    expect(anotherEpisode('oldest', new Set(), 'a', THREE)?.id).toBe('b');
    expect(anotherEpisode('oldest', new Set(), 'b', THREE)?.id).toBe('c');
    expect(anotherEpisode('oldest', new Set(), 'c', THREE)?.id).toBe('a');
    expect(anotherEpisode('newest', new Set(), 'c', THREE)?.id).toBe('b');
    expect(anotherEpisode('oldest', new Set(['b']), 'a', THREE)?.id).toBe('c');
    expect(anotherEpisode('oldest', new Set(['b', 'c']), 'a', THREE)).toBeUndefined();
  });

  it('writes the date as the day it is, whatever the phone\'s zone', () => {
    expect(episodeDate('2026-11-13')).toBe('November 13, 2026');
    expect(episodeDate('2023-06-18')).toBe('June 18, 2023');
  });
});

describe('the devotional beside the Logos ones', () => {
  it('is a devotional of its own kind and leaves the 37 Logos ones as they were', () => {
    expect(DEVOTIONALS).toHaveLength(37);
    expect(DEVOTIONALS.map((d) => d.id)).not.toContain(MORNING_REPHIL_ID);
    expect(MORNING_REPHIL).toMatchObject({ id: MORNING_REPHIL_ID, kind: 'rephil', title: 'Morning RePhil (Brookfield First)' });
    expect(DEVOTIONALS.every((d) => d.kind === undefined)).toBe(true);
    expect(devotionalOf(MORNING_REPHIL_ID)).toBe(MORNING_REPHIL);
  });

  it('is shown when he chose it, and in the picker whatever is on his shelf', () => {
    expect(devotionalForDay(MORNING_REPHIL_ID, [], day).id).toBe(MORNING_REPHIL_ID);
    expect(pickableDevotionals([], DEFAULT_DEVOTIONAL, new Set<string>()).map((d) => d.id)).toContain(MORNING_REPHIL_ID);
  });
});

describe('Random and Morning RePhil', () => {
  const ticked = DEVOTIONALS.map((d) => d.id);

  it('draws it on some day of a year while an episode is unheard', () => {
    const drawn = Array.from({ length: 400 }, (_, i) => devotionalForDay(RANDOM, ticked, new Date(2026, 0, 1 + i), undefined, true).id);
    expect(drawn).toContain(MORNING_REPHIL_ID);
  });

  it('never draws it once every episode is heard, and draws the others as before', () => {
    const drawn = Array.from({ length: 400 }, (_, i) => devotionalForDay(RANDOM, ticked, new Date(2026, 0, 1 + i), undefined, false).id);
    expect(drawn).not.toContain(MORNING_REPHIL_ID);
    expect(devotionalForDay(RANDOM, ticked, day).id).toBe(devotionalForDay(RANDOM, ticked, day, undefined, false).id);
  });

  it('draws only it for a phone with no Logos devotional ticked while one is unheard, and Morning and Evening when none is', () => {
    expect(devotionalForDay(RANDOM, [], day, undefined, true).id).toBe(MORNING_REPHIL_ID);
    expect(devotionalForDay(RANDOM, [], day, undefined, false).id).toBe(DEFAULT_DEVOTIONAL);
  });

  it('keeps the day\'s pick of it even after the last episode is heard', () => {
    expect(devotionalForDay(RANDOM, ticked, day, MORNING_REPHIL_ID, false).id).toBe(MORNING_REPHIL_ID);
  });

  it('Another may draw it only while an episode is unheard, and never the one shown', () => {
    const only = [DEFAULT_DEVOTIONAL];
    const withIt = new Set(Array.from({ length: 60 }, (_, i) => anotherDevotional(DEFAULT_DEVOTIONAL, only, () => i / 60, true)));
    expect(withIt).toContain(MORNING_REPHIL_ID);
    for (let i = 0; i < 20; i++) expect(anotherDevotional(DEFAULT_DEVOTIONAL, only, () => i / 20, false)).not.toBe(MORNING_REPHIL_ID);
    for (let i = 0; i < 20; i++) expect(anotherDevotional(MORNING_REPHIL_ID, only, () => i / 20, true)).not.toBe(MORNING_REPHIL_ID);
  });
});

describe('what he has heard, kept on the device', () => {
  it('starts with none, keeps each once, and starting again lets them all go', async () => {
    expect([...(await getHeard())]).toEqual([]);
    await markHeard('2026-11-16', 'a');
    await markHeard('2026-11-16', 'b');
    await markHeard('2026-11-17', 'a');
    expect([...(await getHeard())].sort()).toEqual(['a', 'b']);
    await clearHeard('2026-11-17');
    expect([...(await getHeard())]).toEqual([]);
  });

  it('also keeps the episode for the day when it is heard, so Today still shows it', async () => {
    await markHeard('2026-11-16', 'a');
    expect((await getDay('2026-11-16')).rephil).toBe('a');
    expect((await getDay('2026-11-17')).rephil).toBeUndefined();
  });

  it('keeps an episode Another chose for the day, and starting again lets the day\'s go too', async () => {
    await pinEpisode('2026-11-16', 'c');
    expect((await getDay('2026-11-16')).rephil).toBe('c');
    await clearHeard('2026-11-16');
    expect((await getDay('2026-11-16')).rephil).toBeUndefined();
  });

  it('is not a Logos pick: the day\'s devotional is only changed by its own function', async () => {
    await setDevotionalPick('2026-11-16', MORNING_REPHIL_ID);
    await markHeard('2026-11-16', 'a');
    expect((await getDay('2026-11-16')).devotional).toBe(MORNING_REPHIL_ID);
  });
});
