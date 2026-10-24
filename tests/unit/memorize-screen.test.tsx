// tests/unit/memorize-screen.test.tsx — the Memorize home (#/memorize, mw-fu7dqf.11): 'Due today' with Start, 'Your verses' by verse list and 'Picked alone', each row's progress mark and its
// Stop memorizing, and what the screen says when nothing is memorized.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, setGreekInterest } from '../../src/data/repositories';
import { listMemorized, memorize, recordRecall } from '../../src/data/repositories/memorize';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import * as commands from '../../src/memorize/commands';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import { memorizeSessionOf } from '../../src/nav/route';
import { screenContextNow } from '../../src/tutor/screenContext';
import { stubChapterFetch } from '../support/chapter-fetch';

vi.mock('../../src/memorize/commands', async (original) => {
  const real = await original<typeof import('../../src/memorize/commands')>();
  return { ...real, unmemorizeVerse: vi.fn(real.unmemorizeVerse) };
});

const NOW = Date.now();
const patch = (lang: string, ref: string, changes: object) => db.reviews.where('[kind+id]').equals(['verse', `${lang}:${ref}`]).modify(changes);

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.verseLists.clear(), db.reviews.clear(), db.recalls.clear(), db.settings.clear()]);
  vi.mocked(commands.unmemorizeVerse).mockClear();
  await setGreekInterest(3);
  window.history.replaceState(null, '', '/#/memorize');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Refuge holds Romans 8:28 (step 2, due now, last 9 of 10) and 2 Thessalonians 3:3 (step 0, due now); Peace holds John 14:27 (step 3 due in 14 days); John 3:16 is picked alone (step 1 due in 2 days). */
async function seed(): Promise<void> {
  await createVerseList('Refuge', ['Rom.8.28', '2Thess.3.3'], 1);
  await createVerseList('Peace', ['John.14.27'], 2);
  for (const ref of ['Rom.8.28', '2Thess.3.3', 'John.14.27', 'John.3.16']) await memorize(ref, ['en'], NOW - 5 * DAY);
  await patch('en', 'Rom.8.28', { step: 2, due: NOW - 2000 });
  await patch('en', '2Thess.3.3', { step: 0, due: NOW - 1000 });
  await patch('en', 'John.14.27', { step: 3, due: NOW + 14 * DAY });
  await patch('en', 'John.3.16', { step: 1, due: NOW + 2 * DAY });
  await recordRecall({ ref: 'Rom.8.28', lang: 'en', rung: 1, score: 0.9, missed: ['all'], asked: Array.from({ length: 10 }, (_, i) => ({ token: `w${i}`, lang: 'en' })), how: 'said' }, NOW - 3 * DAY);
  await patch('en', 'Rom.8.28', { step: 2, due: NOW - 2000 });
}

describe('Due today', () => {
  it('lists the two due verses, each with Start, and Start opens its session', async () => {
    await seed();
    render(<MemorizeScreen />);
    const due = await screen.findByRole('region', { name: 'Due today' });
    const rows = await within(due).findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    // the longest overdue first
    expect(within(rows[0]).getByText(/Romans 8:28/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/2 Thessalonians 3:3/)).toBeInTheDocument();
    await userEvent.click(within(rows[1]).getByRole('button', { name: /^Start/ }));
    expect(memorizeSessionOf(window.location.hash)).toEqual({ ref: '2Thess.3.3', lang: 'en' });
  });

  it('Start all opens the longest overdue first', async () => {
    await seed();
    render(<MemorizeScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start all' }));
    expect(memorizeSessionOf(window.location.hash)).toEqual({ ref: 'Rom.8.28', lang: 'en' });
  });

  it('says nothing is due when every verse is later', async () => {
    await memorize('John.3.16', ['en'], NOW);
    await patch('en', 'John.3.16', { step: 1, due: NOW + 2 * DAY });
    render(<MemorizeScreen />);
    expect(await screen.findByText('Nothing due today')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start all' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Your verses' })).toBeInTheDocument();
  });
});

describe('Your verses', () => {
  it('groups by the list that holds them, Picked alone last, each row with its mark', async () => {
    await seed();
    render(<MemorizeScreen />);
    const verses = await screen.findByRole('region', { name: 'Your verses' });
    await within(verses).findByRole('region', { name: 'Refuge' });
    const names = within(verses).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // the lists in the order the Verse lists screen has them (the newest first), then the verses no list holds
    expect(names).toEqual(['Peace', 'Refuge', 'Picked alone']);
    const refuge = within(verses).getByRole('region', { name: 'Refuge' });
    expect(within(refuge).getAllByRole('listitem')).toHaveLength(2);
    expect(within(refuge).getAllByRole('img').map((m) => m.getAttribute('aria-label'))).toEqual([
      'English · Step 3 of 7 · last 9 of 10 · due today',
      'English · Step 1 of 7 · due today',
    ]);
    const peace = within(verses).getByRole('region', { name: 'Peace' });
    expect(within(peace).getByRole('img').getAttribute('aria-label')).toMatch(/^English · Step 4 of 7 · due [A-Z][a-z]{2} \d+$/);
    const alone = within(verses).getByRole('region', { name: 'Picked alone' });
    expect(within(alone).getByText('John 3:16')).toBeInTheDocument();
    expect(within(alone).getByRole('img').getAttribute('aria-label')).toMatch(/^English · Step 2 of 7 · due /);
  });

  it('Stop memorizing removes the row\'s schedule rows, through the command, and the row leaves', async () => {
    await seed();
    render(<MemorizeScreen />);
    const alone = await screen.findByRole('region', { name: 'Picked alone' });
    await userEvent.click(within(alone).getByRole('button', { name: 'Stop memorizing John 3:16' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Picked alone' })).toBeNull());
    expect(commands.unmemorizeVerse).toHaveBeenCalledWith({ ref: 'John.3.16' });
    expect((await listMemorized()).map((r) => r.ref).sort()).toEqual(['2Thess.3.3', 'John.14.27', 'Rom.8.28']);
    expect(screen.queryByText('John 3:16')).toBeNull();
  });

  it('a verse memorized in two languages shows a mark for each', async () => {
    await memorize('Rom.8.28', ['en', 'el'], NOW);
    render(<MemorizeScreen />);
    const verses = await screen.findByRole('region', { name: 'Your verses' });
    await waitFor(() => expect(within(verses).getAllByRole('img')).toHaveLength(2));
    expect(within(verses).getAllByRole('img').map((m) => m.getAttribute('aria-label')?.split(' · ')[0])).toEqual(['English', 'Greek']);
  });
});

describe('with nothing memorized', () => {
  it('says how to pick verses, with a link to the verse lists', async () => {
    render(<MemorizeScreen />);
    expect(await screen.findByText('No verses memorized yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verse lists' })).toHaveAttribute('href', '#/lists');
    expect(screen.queryByRole('region', { name: 'Due today' })).toBeNull();
  });
});

describe('the tutor', () => {
  it('is told the due count and the verse count', async () => {
    await seed();
    render(<MemorizeScreen />);
    await screen.findByRole('region', { name: 'Due today' });
    await waitFor(() => expect(screenContextNow()?.facts).toEqual([{ label: 'Due today', value: '2' }, { label: 'Verses memorized', value: '4' }]));
    expect(screenContextNow()?.name).toBe('Memorize');
  });
});
