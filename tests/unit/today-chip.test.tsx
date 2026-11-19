// tests/unit/today-chip.test.tsx — the Reader's Today chip and the tutor's Today list count the Devotional piece only when Today draws one (mw-r9xo1pj.6): with Logos Off and a Logos book
// chosen, Today draws no devotional (src/data/daily/morningRephil.ts devotionalToday), so the chip's 'of n' and the list leave it out. Morning RePhil is drawn with Logos Off, so it counts.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { MORNING_REPHIL_ID } from '../../src/data/daily/devotionals';
import { todayEntries } from '../../src/data/learnerToday';
import { clearBus } from '../../src/events/bus';
import { TodayChip } from '../../src/today/TodayChip';
import { todayPieces } from '../../src/today/pieces';

const LOGOS_BOOK = 'LLS:20.10.1';
const day = new Date();
const on = { review: 'on', plan: 'on', psalms: 'on', devotional: 'on', memorize: 'on' };

beforeEach(async () => {
  clearBus();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
});
afterEach(cleanup);

/** How many pieces Today holds with every switch On, with the devotional counted or not. */
const holds = (devotionalDrawn: boolean): number => todayPieces({ ...on, devotional: devotionalDrawn ? 'on' : 'off' }, day).length;

describe('todayPieces', () => {
  it('leaves the devotional out when Today draws none, and keeps it when it does', () => {
    expect(todayPieces(on, day, false)).not.toContain('devotional');
    expect(todayPieces(on, day, true)).toContain('devotional');
    expect(todayPieces(on, day)).toContain('devotional');
    expect(holds(true)).toBe(holds(false) + 1);
  });
});

describe('the Today chip with the devotional switch On', () => {
  const setup = (logos: 'on' | 'off', devotional: string) =>
    db.settings.bulkPut([
      { key: 'resource.logos', value: logos },
      { key: 'dailyDevotional', value: 'on' },
      { key: 'devotional', value: devotional },
    ]);

  it('with Logos Off and a Logos book chosen, does not count the devotional', async () => {
    await setup('off', LOGOS_BOOK);
    render(<TodayChip />);
    expect((await screen.findByTestId('today-chip')).textContent).toBe(`Today · 0 of ${holds(false)}`);
  });

  it('with Logos On and a Logos book chosen, counts it', async () => {
    await setup('on', LOGOS_BOOK);
    render(<TodayChip />);
    expect((await screen.findByTestId('today-chip')).textContent).toBe(`Today · 0 of ${holds(true)}`);
  });

  it('with Logos Off and Morning RePhil chosen, counts it: Today draws it', async () => {
    await setup('off', MORNING_REPHIL_ID);
    render(<TodayChip />);
    await waitFor(() => expect(screen.getByTestId('today-chip').textContent).toBe(`Today · 0 of ${holds(true)}`));
  });

  it("the tutor's Today list has no devotional with Logos Off and a Logos book chosen", async () => {
    await setup('off', LOGOS_BOOK);
    const entries = (await todayEntries(day)) ?? [];
    expect(entries.map((e) => e.id)).not.toContain('devotional');
    expect(entries).toHaveLength(holds(false));
  });
});
