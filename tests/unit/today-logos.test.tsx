// The Logos switch governs Today (mw-rfjjzd.23): the devotional exists to open Logos, so Today draws it only while Logos is On (what he set for it is kept), and with Logos Off the
// tutor is not told of it. The day's Psalms and Proverbs open in Lampas (mw-5r3p30.1007), which holds every chapter of both books, so they are drawn with Logos Off too.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { startPlan } from '../../src/data/repositories';
import { DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
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
  await db.exportRows.clear();
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
  it('draws the Psalms and Proverbs, each opening in the Reader, but not the devotional, and keeps what he set for them', async () => {
    await settings('off');
    render(<Today />);
    const psalms = await screen.findByRole('region', { name: 'Psalms and Proverbs' });
    expect(within(psalms).getAllByRole('button', { name: /opens in the Reader/ }).length).toBeGreaterThan(1);
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

  it('explains the Devotional as one devotional for the day, not as one opened in Logos, since it can be Morning RePhil (mw-r9xo1pj.31)', async () => {
    await db.settings.bulkPut(['dailyReview', 'dailyMemorize', 'dailyPlan', 'dailyPsalms', 'dailyDevotional'].map((key) => ({ key, value: 'off' })).concat([{ key: 'resource.logos', value: 'on' }]));
    render(<Today />);
    const explained = await screen.findByTestId('today-explained');
    expect(explained).toHaveTextContent('Devotional');
    expect(explained).toHaveTextContent('one devotional for the day');
    expect(explained).not.toHaveTextContent('opened in Logos');
  });
});

describe('Today: a Psalms and Proverbs row opens in Lampas', () => {
  it('is just the passage name, a button that opens the chapter in the Reader and counts as opened without ticking, with no Read in Lampas, no Open in Logos or In another book', async () => {
    await settings('on');
    const user = userEvent.setup();
    render(<Today />);
    const psalms = await screen.findByRole('region', { name: 'Psalms and Proverbs' });
    const rows = within(psalms).getAllByRole('listitem');
    expect(psalms).not.toHaveTextContent(/Read in Lampas/);
    for (const row of rows) {
      expect(within(row).getByRole('button', { name: /opens in the Reader/ })).toBeInTheDocument();
      const label = within(row).getByRole('button', { name: /opens in the Reader/ }).getAttribute('aria-label')!;
      expect(row.textContent).toBe(label.replace(', opens in the Reader', ''));
      expect(within(row).queryByText('Open in Logos')).toBeNull();
      expect(within(row).queryByRole('button', { name: /In another book/ })).toBeNull();
    }
    const first = within(rows[0]!).getByRole('button', { name: /opens in the Reader/ });
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

describe('Today: the reading plan card (mw-5r3p30.1214)', () => {
  const planSettings = async (logos: 'on' | 'off', audio: string | undefined) => {
    await startPlan('whole-bible', { code: 'rev', chapter: 15 });
    // his import holds the default Bible, so the old card would offer Read in Logos
    await db.exportRows.put({ resource: DEFAULT_LOGOS_BIBLE, type: 'text.bible', title: 'Bible', series: '', refs: 'bible.66.1.1', matched: true, languages: 'en' });
    await db.settings.bulkPut([
      { key: 'dailyReview', value: 'off' },
      { key: 'dailyMemorize', value: 'off' },
      { key: 'readingPlan', value: 'on' },
      { key: 'dailyPlan', value: 'on' },
      { key: 'dailyPsalms', value: 'off' },
      { key: 'dailyDevotional', value: 'off' },
      { key: 'resource.logos', value: logos },
      ...(audio ? [{ key: 'audioBible', value: audio }] : []),
    ]);
  };

  it('with Logos On has no Read in Logos, keeps Listen in Audible, and its Lampas button says Read and opens the chapter in the Reader', async () => {
    await planSettings('on', 'word-of-promise');
    const user = userEvent.setup();
    render(<Today />);
    const plan = await screen.findByRole('region', { name: 'Reading plan' });
    await screen.findByText('Next: Revelation 15');
    expect(within(plan).queryByRole('link', { name: /Read in Logos/ })).toBeNull();
    expect(plan).not.toHaveTextContent(/Read in Logos|Read in Lampas|Turn on Logos/);
    expect(within(plan).getByRole('link', { name: /Listen in Audible/ })).toBeInTheDocument();
    await user.click(within(plan).getByRole('button', { name: 'Read' }));
    const query = new URLSearchParams(window.location.hash.split('?')[1]);
    expect(query.get('b')).toBe('rev');
    expect(query.get('c')).toBe('15');
  });
});
