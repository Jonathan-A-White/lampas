// mw-5r3p30.86: the review feature's 'the Reader shows "Due: N"' timed out on a loaded Laptop although the strip was on
// the screen 0.4 s after the render. The wait was in the lookup: findByRole('button', { name }) works out the accessible name of
// every button of the Reader, which reads the computed style of ~800 elements in jsdom (about 2.5 s here at load 27, and the
// wait repeats it on every change of the page). Counting those style reads is the same fact with no clock and no load.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import { afterAll, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
import { clearBus } from '../../src/events/bus';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../support/chapter-fetch';
import { findButton } from '../support/find-button';

afterAll(async () => {
  cleanup();
  clearBus();
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});


it('finds the Due strip on the Reader without reading the style of the whole page', async () => {
  stubChapterFetch();
  await db.open();
  await seedWordsIfFirstOpen();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
  const now = Date.now();
  await db.reviews.bulkPut(['λέγω', 'εἰμί', 'ἀγαπάω'].map((id, i) => ({ kind: 'word', id, step: 0, rights: 0, due: now - (3 - i) * 60_000, lastWhen: now, lapses: 0 })));
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await screen.findByText('Due: 3');
  expect(document.querySelectorAll('*').length).toBeGreaterThan(500); // the Reader is heavy: that is the point

  const reads = vi.spyOn(window, 'getComputedStyle');
  const strip = await findButton('Due: 3');
  const used = reads.mock.calls.length;
  reads.mockRestore();
  expect(strip).toBeVisible();
  expect(used, 'style reads to find one button').toBeLessThan(50);
});
