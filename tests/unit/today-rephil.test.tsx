// Today's Morning RePhil piece with every episode heard and no backup to open (Logos Off): what it says about new episodes depends on whether the sermon index service has answered
// (mw-r9xo1pj.26). Online they show here as they come out; with the bundled list alone an app update is what brings more.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { MORNING_REPHIL_ID } from '../../src/data/daily/devotionals';
import { currentEpisodes, setServiceEpisodes, type Episode } from '../../src/data/daily/morningRephil';
import { Today } from '../../src/today/Today';
import { ASYNC_WAIT_MS } from '../support/timeouts';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  setServiceEpisodes([]);
  await db.open();
  await db.settings.clear();
  await db.settings.bulkPut([
    { key: 'resource.logos', value: 'off' },
    { key: 'dailyReview', value: 'off' },
    { key: 'dailyMemorize', value: 'off' },
    { key: 'dailyPlan', value: 'off' },
    { key: 'dailyPsalms', value: 'off' },
    { key: 'dailyDevotional', value: 'on' },
    { key: 'devotional', value: MORNING_REPHIL_ID },
  ]);
});

afterEach(() => setServiceEpisodes([]));

const timeout = ASYNC_WAIT_MS;

async function openWithEveryEpisodeHeard() {
  await db.settings.put({ key: 'morningRephilHeard', value: JSON.stringify(currentEpisodes().map((e) => e.id)) });
  window.location.hash = '#/today';
  render(<Today />);
  return within(await screen.findByRole('region', { name: 'Devotional' }, { timeout }));
}

describe('Today\'s Morning RePhil with every episode heard', () => {
  it('says new episodes show here as they come out when the service has answered', async () => {
    const newest: Episode = { id: 'new481x', number: 481, title: 'Morning RePhil #481', date: '2026-11-23', share: 'https://brookfieldfirst.subspla.sh/new481x' };
    setServiceEpisodes([newest]);
    const piece = await openWithEveryEpisodeHeard();
    expect(await piece.findByText("You've heard every Morning RePhil so far; new episodes show here as they come out.", undefined, { timeout })).toBeInTheDocument();
    expect(piece.queryByText(/with an update/)).toBeNull();
  });

  it('says an update brings more when only the bundled list is there (the service unreachable)', async () => {
    const piece = await openWithEveryEpisodeHeard();
    expect(await piece.findByText("You've heard every Morning RePhil in this version of Lampas; new ones come with an update.", undefined, { timeout })).toBeInTheDocument();
    expect(piece.queryByText(/as they come out/)).toBeNull();
  });
});
