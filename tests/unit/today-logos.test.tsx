// The Logos switch governs Today (mw-rfjjzd.23): the day's Psalms and Proverbs and the devotional exist to open Logos, so Today draws them only while Logos is On
// (what he set for them is kept), and with Logos Off the tutor is not told of them.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
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
  it('draws neither the Psalms and Proverbs nor the devotional, and keeps what he set for them', async () => {
    await settings('off');
    render(<Today />);
    await screen.findByTestId('today-explained');
    expect(screen.queryByRole('region', { name: 'Psalms and Proverbs' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Devotional' })).toBeNull();
    expect(screen.queryAllByText('Open in Logos')).toHaveLength(0);
    expect((await db.settings.get('dailyPsalms'))?.value).toBe('on');
    expect((await db.settings.get('dailyDevotional'))?.value).toBe('on');
  });

  it('does not offer the Logos pieces when nothing is switched on', async () => {
    await settings('off');
    render(<Today />);
    const explained = await screen.findByTestId('today-explained');
    expect(explained).not.toHaveTextContent('Psalms and Proverbs');
    expect(explained).not.toHaveTextContent('Devotional');
    expect(explained).toHaveTextContent('Review');
  });
});

describe('Today with Logos On', () => {
  it('draws the Psalms and Proverbs and the devotional, each opening in Logos', async () => {
    await settings('on');
    render(<Today />);
    expect(await screen.findByRole('region', { name: 'Psalms and Proverbs' })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: 'Devotional' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Open in Logos/).length).toBeGreaterThan(1));
  });
});
