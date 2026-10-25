// The per-date tick and opened store of Today (src/data/daily/dailyStore.ts, mw-1fwagb.5): what he ticked and what he opened on each LOCAL date, a new date starting
// empty, and the one-time 'what Today could hold' explanation (shown once, then done after he changes a Daily row).
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import {
  DAILY_KEYS,
  KEPT_DAYS,
  getDay,
  getExplained,
  localDate,
  markOpened,
  noteExplained,
  noteDailyChange,
  pickAnotherDevotional,
  setDevotionalPick,
  setTicked,
} from '../../src/data/daily/dailyStore';

beforeEach(async () => {
  await db.settings.clear();
});

afterAll(() => db.close());

describe('the local date', () => {
  it('is the date on the phone, not the UTC one', () => {
    expect(localDate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
    expect(localDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('what he ticked', () => {
  it('starts empty on a date with nothing kept', async () => {
    expect(await getDay('2026-10-05')).toEqual({ ticked: [], opened: [] });
  });

  it('keeps a tick and takes it away again', async () => {
    await setTicked('2026-10-05', 'review', true);
    await setTicked('2026-10-05', 'psa.5', true);
    expect((await getDay('2026-10-05')).ticked).toEqual(['review', 'psa.5']);
    await setTicked('2026-10-05', 'review', false);
    expect((await getDay('2026-10-05')).ticked).toEqual(['psa.5']);
  });

  it('ticks a piece once, however many times it is ticked', async () => {
    await setTicked('2026-10-05', 'plan', true);
    await setTicked('2026-10-05', 'plan', true);
    expect((await getDay('2026-10-05')).ticked).toEqual(['plan']);
  });

  it('starts a new local date empty, and keeps the old one', async () => {
    await setTicked('2026-10-05', 'review', true);
    expect(await getDay('2026-10-06')).toEqual({ ticked: [], opened: [] });
    expect((await getDay('2026-10-05')).ticked).toEqual(['review']);
  });
});

describe('what he opened', () => {
  it('is kept per date, apart from the ticks, and once', async () => {
    await markOpened('2026-10-05', 'devotional');
    await markOpened('2026-10-05', 'devotional');
    await markOpened('2026-10-05', 'pro.5');
    expect(await getDay('2026-10-05')).toEqual({ ticked: [], opened: ['devotional', 'pro.5'] });
    expect(await getDay('2026-10-06')).toEqual({ ticked: [], opened: [] });
  });

  it('does not tick the piece: opening is never a tick', async () => {
    await markOpened('2026-10-05', 'review');
    expect((await getDay('2026-10-05')).ticked).toEqual([]);
  });
});

describe('what is kept', () => {
  it('is only the latest days, the oldest let go', async () => {
    for (let day = 1; day <= KEPT_DAYS + 3; day++) {
      const date = localDate(new Date(2026, 0, day));
      await setTicked(date, 'review', true);
    }
    expect((await getDay('2026-01-01')).ticked).toEqual([]);
    expect((await getDay(localDate(new Date(2026, 0, KEPT_DAYS + 3)))).ticked).toEqual(['review']);
  });

  it('reads a damaged record as nothing kept', async () => {
    await db.settings.put({ key: 'dailyDone', value: '{not json' });
    expect(await getDay('2026-10-05')).toEqual({ ticked: [], opened: [] });
    await setTicked('2026-10-05', 'review', true);
    expect((await getDay('2026-10-05')).ticked).toEqual(['review']);
  });
});

describe('the explanation of what Today could hold', () => {
  it('is due until it has been shown, then shown, and done once a Daily row is changed', async () => {
    expect(await getExplained()).toBeUndefined();
    await noteExplained();
    expect(await getExplained()).toBe('shown');
    await noteDailyChange('dailyReview');
    expect(await getExplained()).toBe('done');
  });

  it('is not done by a change of a setting that is not a Daily row, or by a change before it was shown', async () => {
    await noteDailyChange('dailyReview');
    expect(await getExplained()).toBeUndefined();
    await noteExplained();
    await noteDailyChange('theme');
    expect(await getExplained()).toBe('shown');
  });

  it('is shown no more once it is done', async () => {
    await noteExplained();
    await noteDailyChange('dailyTicks');
    await noteExplained();
    expect(await getExplained()).toBe('done');
  });

  it('names the nine Daily rows', () => {
    expect([...DAILY_KEYS].sort()).toEqual(['dailyDevotional', 'dailyMemorize', 'dailyPlan', 'dailyPsalms', 'dailyReview', 'dailyTicks', 'devotional', 'devotionalDraw', 'todaysDevotional']);
  });
});

describe('the devotional drawn again for a day', () => {
  it('starts with none, keeps the pick for its date only, and leaves the ticks alone', async () => {
    expect((await getDay('2026-10-05')).devotional).toBeUndefined();
    await setTicked('2026-10-05', 'devotional', true);
    await setDevotionalPick('2026-10-05', 'LLS:20.10.2');
    expect(await getDay('2026-10-05')).toEqual({ ticked: ['devotional'], opened: [], devotional: 'LLS:20.10.2' });
    expect((await getDay('2026-10-06')).devotional).toBeUndefined();
  });

  it('pickAnotherDevotional writes a different one each time it is shown one, never the one shown', async () => {
    const ticked = ['LLS:20.10.1', 'LLS:20.10.2'];
    const a = await pickAnotherDevotional('2026-10-05', 'LLS:20.10.1', ticked, () => 0);
    expect(a).toBe('LLS:20.10.2');
    expect((await getDay('2026-10-05')).devotional).toBe('LLS:20.10.2');
    const b = await pickAnotherDevotional('2026-10-05', a, ticked, () => 0);
    expect(b).toBe('LLS:20.10.1');
    expect((await getDay('2026-10-05')).devotional).toBe('LLS:20.10.1');
  });
});
