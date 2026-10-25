// tests/unit/today-memorize.test.tsx — Today's Memorize piece (mw-fu7dqf.10): 'Memorize: 2 verses due' behind Settings > Daily > Memorize (On to start), a tap starts the longest overdue
// verse's session and is kept as opened; with nothing memorized the line points at the lists; Off, no piece. The Review piece's count leaves the verses out, and the Today chip counts the piece.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getDay, localDate } from '../../src/data/daily/dailyStore';
import { todayNow } from '../../src/data/learnerToday';
import { memorize } from '../../src/data/repositories/memorize';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { dailyMemorizeSetting } from '../../src/settings/definitions';
import { getSetting, setSetting } from '../../src/settings/store';
import { screenContextNow } from '../../src/tutor/screenContext';
import { TodayChip } from '../../src/today/TodayChip';
import { Today } from '../../src/today/Today';
import { todayPieces } from '../../src/today/pieces';

const NOW = Date.now();
const patch = (lang: string, ref: string, changes: object) => db.reviews.where('[kind+id]').equals(['verse', `${lang}:${ref}`]).modify(changes);

beforeEach(async () => {
  clearBus();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.meta.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }]);
  window.history.replaceState(null, '', '/#/today');
});
afterEach(cleanup);

/** Romans 8:28 is 2 days overdue, 2 Thessalonians 3:3 one hour: two verses due; John 3:16 is not due for a week. */
async function twoDue(): Promise<void> {
  for (const ref of ['Rom.8.28', '2Thess.3.3', 'John.3.16']) await memorize(ref, ['en'], NOW - 5 * DAY);
  await patch('en', 'Rom.8.28', { due: NOW - 2 * DAY });
  await patch('en', '2Thess.3.3', { due: NOW - 3600_000 });
  await patch('en', 'John.3.16', { due: NOW + 7 * DAY });
}

describe('the Memorize piece on Today', () => {
  it('says how many verses are due, and a tap opens the longest overdue verse and is kept as opened', async () => {
    await twoDue();
    render(<Today />);
    const piece = await screen.findByRole('region', { name: 'Memorize' });
    const line = await within(piece).findByRole('button', { name: /Memorize: 2 verses due/ });
    await userEvent.click(line);
    expect(window.location.hash).toBe('#/memorize/Rom.8.28/en');
    await waitFor(async () => expect((await getDay(localDate(new Date()))).opened).toContain('memorize'));
  });

  it('says 1 verse due for one', async () => {
    await memorize('Rom.8.28', ['en'], NOW - DAY);
    render(<Today />);
    expect(await screen.findByRole('button', { name: /Memorize: 1 verse due/ })).toBeInTheDocument();
  });

  it('says nothing due when verses are memorized and none is due, and the tap opens the Memorize home', async () => {
    await memorize('Rom.8.28', ['en'], NOW - DAY);
    await patch('en', 'Rom.8.28', { due: NOW + 3 * DAY });
    render(<Today />);
    await userEvent.click(await screen.findByRole('button', { name: /Memorize: nothing due/ }));
    expect(window.location.hash).toBe('#/memorize');
  });

  it('points at the lists while no verse is memorized', async () => {
    render(<Today />);
    const piece = await screen.findByRole('region', { name: 'Memorize' });
    const link = await within(piece).findByRole('button', { name: /Memorize: pick verses in a list/ });
    await userEvent.click(link);
    expect(window.location.hash).toBe('#/lists');
  });

  it('is not on Today with the switch Off', async () => {
    await twoDue();
    await setSetting(dailyMemorizeSetting, 'off');
    render(<Today />);
    await screen.findByRole('region', { name: 'Review' });
    expect(screen.queryByRole('region', { name: 'Memorize' })).toBeNull();
    expect(screen.queryByText(/Memorize:/)).toBeNull();
  });

  it('is On to start', async () => {
    expect(await getSetting(dailyMemorizeSetting)).toBe('on');
  });

  it('does not change the Review piece: its count leaves the verses out', async () => {
    await twoDue();
    render(<Today />);
    const review = await screen.findByRole('region', { name: 'Review' });
    expect(await within(review).findByText('Nothing due')).toBeInTheDocument();
    expect(within(review).queryByText(/verse/)).toBeNull();
  });

  it('comes after Review in the order Today draws the pieces', () => {
    const on = { review: 'on', plan: 'on', psalms: 'off', devotional: 'off', memorize: 'on' };
    expect(todayPieces(on, new Date(2026, 9, 24))).toEqual(['review', 'memorize', 'plan']);
    expect(todayPieces({ ...on, memorize: 'off' }, new Date(2026, 9, 24))).toEqual(['review', 'plan']);
  });
});

describe('what Today tells the tutor', () => {
  it('names Memorize among the pieces that are On, and among those opened after the tap', async () => {
    await twoDue();
    render(<Today />);
    const fact = (label: string) => screenContextNow()?.facts?.find((f) => f.label === label)?.value;
    await waitFor(() => expect(fact('On Today')).toMatch(/Review, Memorize, Reading plan/));
    expect(fact('Opened today')).toBe('nothing yet');
    await userEvent.click(await screen.findByRole('button', { name: /Memorize: 2 verses due/ }));
    await waitFor(() => expect(fact('Opened today')).toBe('Memorize'));
  });

  it('does not name Memorize with the switch Off', async () => {
    await setSetting(dailyMemorizeSetting, 'off');
    render(<Today />);
    await waitFor(() => expect(screenContextNow()?.facts?.find((f) => f.label === 'On Today')?.value).toMatch(/^Review, Reading plan/));
  });
});

describe('the Today chip and the tutor', () => {
  const holds = (memorizeOn: boolean): number => todayPieces({ review: 'on', plan: 'on', psalms: 'on', devotional: 'on', memorize: memorizeOn ? 'on' : 'off' }, new Date()).length;

  it('the chip counts the Memorize piece while On, and not while Off', async () => {
    render(<TodayChip />);
    const chip = await screen.findByTestId('today-chip');
    expect(chip.textContent).toBe(`Today · 0 of ${holds(true)}`);
    await setSetting(dailyMemorizeSetting, 'off');
    await waitFor(() => expect(screen.getByTestId('today-chip').textContent).toBe(`Today · 0 of ${holds(false)}`));
    expect(holds(true)).toBe(holds(false) + 1);
  });

  it("the learner's day lists the piece, after Review, titled as Today says it", async () => {
    await twoDue();
    const items = await todayNow(new Date());
    expect(items![0]).toMatchObject({ kind: 'review', title: 'Review: nothing due' });
    expect(items![1]).toEqual({ kind: 'memorize', title: 'Memorize: 2 verses due', done: false });
  });

  it("the learner's day names the empty cases", async () => {
    expect((await todayNow(new Date()))![1]).toMatchObject({ kind: 'memorize', title: 'Memorize: pick verses in a list' });
    await memorize('Rom.8.28', ['en'], NOW - DAY);
    await patch('en', 'Rom.8.28', { due: NOW + 3 * DAY });
    expect((await todayNow(new Date()))![1]).toMatchObject({ kind: 'memorize', title: 'Memorize: nothing due' });
  });
});
