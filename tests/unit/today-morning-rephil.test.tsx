// Today's Morning RePhil piece (mw-qtu3zvz.15): one episode with its title and date and a Watch link to its Subsplash share link, playing it keeps it heard, the order
// setting, Another, and the plain words with a Start again once every episode is heard.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { ASYNC_WAIT_MS } from '../support/timeouts';
import { MORNING_REPHIL_ID, RANDOM } from '../../src/data/daily/devotionals';
import { EPISODES, episodeDate } from '../../src/data/daily/morningRephil';
import { getDay, getHeard, localDate } from '../../src/data/daily/dailyStore';
import { Today } from '../../src/today/Today';
import { applyChanges, currentSettings } from '../../src/settings/registry';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  await db.open();
  await db.settings.clear();
  await db.settings.bulkPut([
    { key: 'resource.logos', value: 'on' },
    { key: 'dailyReview', value: 'off' },
    { key: 'dailyMemorize', value: 'off' },
    { key: 'dailyPlan', value: 'off' },
    { key: 'dailyPsalms', value: 'off' },
    { key: 'dailyDevotional', value: 'on' },
    { key: 'devotional', value: MORNING_REPHIL_ID },
  ]);
});

const timeout = ASYNC_WAIT_MS;
const first = EPISODES[0];
const last = EPISODES[EPISODES.length - 1];

async function open() {
  window.location.hash = '#/today';
  render(<Today />);
  return within(await screen.findByRole('region', { name: 'Devotional' }, { timeout }));
}

describe('Today with Morning RePhil chosen', () => {
  it('shows the oldest episode first, with its title, its date and a Watch link to the share link', async () => {
    const piece = await open();
    const link = await piece.findByRole('link', { name: new RegExp(first.title) }, { timeout });
    expect(link).toHaveAttribute('href', first.share);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).not.toHaveAttribute('href', expect.stringMatching(/logosres|ref\.ly/));
    expect(link).toHaveTextContent(`Watch · ${episodeDate(first.date)}`);
    expect(piece.queryByText(/Open in Logos/)).toBeNull();
  });

  it('shows the newest episode while Morning RePhil order is Newest first', async () => {
    await db.settings.put({ key: 'morningRephilOrder', value: 'newest' });
    const piece = await open();
    expect(await piece.findByRole('link', { name: new RegExp(last.title) }, { timeout })).toHaveAttribute('href', last.share);
  });

  it('keeps the episode heard when he plays it, and still shows it for the rest of the day', async () => {
    const piece = await open();
    const link = await piece.findByRole('link', { name: new RegExp(first.title) }, { timeout });
    link.addEventListener('click', (e) => e.preventDefault());
    await act(async () => {
      await userEvent.click(link);
    });
    await vi.waitFor(async () => expect([...(await getHeard())]).toEqual([first.id]), { timeout });
    expect((await getDay(localDate(new Date()))).rephil).toBe(first.id);
    expect(await piece.findByRole('link', { name: new RegExp(first.title) }, { timeout })).toBeInTheDocument();
  });

  it('shows the next unheard one on a day he has played nothing, never a heard one', async () => {
    await db.settings.put({ key: 'morningRephilHeard', value: JSON.stringify([first.id]) });
    const piece = await open();
    expect(await piece.findByRole('link', { name: new RegExp(EPISODES[1].title) }, { timeout })).toHaveAttribute('href', EPISODES[1].share);
  });

  it('Another shows the next not-yet-heard one for today only', async () => {
    const piece = await open();
    await piece.findByRole('link', { name: new RegExp(first.title) }, { timeout });
    await act(async () => {
      await userEvent.click(piece.getByRole('button', { name: 'Another episode' }));
    });
    expect(await piece.findByRole('link', { name: new RegExp(EPISODES[1].title) }, { timeout })).toBeInTheDocument();
    expect([...(await getHeard())]).toEqual([]);
  });

  it('says plainly that every episode is heard, and Start again begins from the top', async () => {
    await db.settings.put({ key: 'morningRephilHeard', value: JSON.stringify(EPISODES.map((e) => e.id)) });
    const piece = await open();
    expect(await piece.findByText("You've heard every Morning RePhil; new ones appear as they're posted.", undefined, { timeout })).toBeInTheDocument();
    expect(piece.queryByRole('link')).toBeNull();
    await act(async () => {
      await userEvent.click(piece.getByRole('button', { name: 'Start again from the top' }));
    });
    expect(await piece.findByRole('link', { name: new RegExp(first.title) }, { timeout })).toBeInTheDocument();
    expect([...(await getHeard())]).toEqual([]);
  });
});

describe('Random and Morning RePhil on Today', () => {
  it('draws only the Logos devotionals once every episode is heard', async () => {
    await db.settings.bulkPut([
      { key: 'devotional', value: RANDOM },
      { key: 'devotionalDraw', value: 'none' },
      { key: 'morningRephilHeard', value: JSON.stringify(EPISODES.map((e) => e.id)) },
    ]);
    const piece = await open();
    expect(await piece.findByRole('link', { name: /Morning and Evening/ }, { timeout })).toBeInTheDocument();
    expect(piece.queryByText(/Morning RePhil/)).toBeNull();
  });
});

describe('the Morning RePhil order setting', () => {
  it('is a talkable setting, Oldest first to start, that the tutor can change', async () => {
    expect((await currentSettings()).morningRephilOrder).toBe('oldest');
    const { applied, refused } = await applyChanges([{ key: 'morningRephilOrder', value: 'newest' }]);
    expect(refused).toEqual([]);
    expect(applied).toHaveLength(1);
    expect((await currentSettings()).morningRephilOrder).toBe('newest');
    expect((await applyChanges([{ key: 'morningRephilOrder', value: 'random' }])).refused).toHaveLength(1);
  });
});
