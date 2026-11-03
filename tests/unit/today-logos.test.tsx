// The Logos switch governs Today (mw-rfjjzd.23): the devotional exists to open Logos, so Today draws it only while Logos is On (what he set for it is kept), and with Logos Off the
// tutor is not told of it. The day's Psalms and Proverbs open in Lampas (mw-5r3p30.1007), which holds every chapter of both books, so they are drawn with Logos Off too.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { getDay, localDate } from '../../src/data/daily/dailyStore';
import { Today } from '../../src/today/Today';

afterAll(() => {
  cleanup();
  db.close();
});

beforeEach(async () => {
  cleanup();
  await db.open();
  await db.settings.clear();
  window.location.hash = '#/today';
});

const settings = (logos: 'on' | 'off') =>
  db.settings.bulkPut([
    { key: 'dailyReview', value: 'off' },
    { key: 'dailyMemorize', value: 'off' },
    { key: 'dailyPlan', value: 'off' },
    { key: 'dailyPsalms', value: 'on' },
    { key: 'dailyDevotional', value: 'on' },
    { key: 'resource.logos', value: logos },
  ]);

describe('Today with Logos Off', () => {
  it('draws the Psalms and Proverbs, each read in Lampas, but not the devotional, and keeps what he set for them', async () => {
    await settings('off');
    render(<Today />);
    const psalms = await screen.findByRole('region', { name: 'Psalms and Proverbs' });
    expect(within(psalms).getAllByRole('button', { name: /Read in Lampas/ }).length).toBeGreaterThan(1);
    expect(screen.queryByRole('region', { name: 'Devotional' })).toBeNull();
    expect(screen.queryAllByText('Open in Logos')).toHaveLength(0);
    expect((await db.settings.get('dailyPsalms'))?.value).toBe('on');
    expect((await db.settings.get('dailyDevotional'))?.value).toBe('on');
  });

  it('with only the Psalms and Proverbs On draws them, not the explanation', async () => {
    await db.settings.bulkPut([
      { key: 'dailyReview', value: 'off' },
      { key: 'dailyMemorize', value: 'off' },
      { key: 'dailyPlan', value: 'off' },
      { key: 'dailyPsalms', value: 'on' },
      { key: 'dailyDevotional', value: 'off' },
      { key: 'resource.logos', value: 'off' },
    ]);
    render(<Today />);
    expect(await screen.findByRole('region', { name: 'Psalms and Proverbs' })).toBeInTheDocument();
    expect(screen.queryByTestId('today-explained')).toBeNull();
  });

  it('offers the Psalms and Proverbs, not the devotional, when nothing is switched on', async () => {
    await db.settings.bulkPut(['dailyReview', 'dailyMemorize', 'dailyPlan', 'dailyPsalms', 'dailyDevotional'].map((key) => ({ key, value: 'off' })).concat([{ key: 'resource.logos', value: 'off' }]));
    render(<Today />);
    const explained = await screen.findByTestId('today-explained');
    expect(explained).toHaveTextContent('Psalms and Proverbs');
    expect(explained).toHaveTextContent("the day's Psalms and Proverbs, read in Lampas");
    expect(explained).not.toHaveTextContent('Devotional');
    expect(explained).toHaveTextContent('Review');
  });
});

describe('Today: a Psalms and Proverbs row opens in Lampas', () => {
  it('has Read in Lampas that opens the chapter in the Reader and counts as opened, and no Open in Logos or In another book', async () => {
    await settings('on');
    const user = userEvent.setup();
    render(<Today />);
    const psalms = await screen.findByRole('region', { name: 'Psalms and Proverbs' });
    const rows = within(psalms).getAllByRole('listitem');
    for (const row of rows) {
      expect(within(row).getByRole('button', { name: /Read in Lampas/ })).toBeInTheDocument();
      expect(within(row).queryByText('Open in Logos')).toBeNull();
      expect(within(row).queryByRole('button', { name: /In another book/ })).toBeNull();
    }
    const first = within(rows[0]!).getByRole('button', { name: /Read in Lampas/ });
    const name = rows[0]!.getAttribute('data-piece')!;
    const [code, chapter] = name.split('.');
    await user.click(first);
    expect(new URLSearchParams(window.location.hash.split('?')[1]).get('b')).toBe(code);
    expect(new URLSearchParams(window.location.hash.split('?')[1]).get('c')).toBe(chapter);
    await waitFor(async () => expect((await getDay(localDate(new Date()))).opened).toContain(name));
  });
});

describe('Today with Logos On', () => {
  it('draws the devotional opening in Logos and the Psalms and Proverbs reading in Lampas', async () => {
    await settings('on');
    render(<Today />);
    expect(await screen.findByRole('region', { name: 'Psalms and Proverbs' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Devotional' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Open in Logos/)).toHaveLength(1));
  });
});
