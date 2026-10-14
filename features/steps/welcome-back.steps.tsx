// features/steps/welcome-back.steps.tsx — runs features/welcome-back.feature: after a break of a week or more, opening Lampas offers a short refresher of the most overdue
// solid words and ideas (mw-1vuvq6.6). The break is read from the usage log (src/tips/usageLog.ts), the days that have rows.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { dayOf } from '../../src/data/repositories/usage';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const CARD = 'Welcome back';

async function freshStore(daysAway: number): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  await usageWritesSettled();
  forgetTrail();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/#/?b=rom&c=8');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.usage.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  const now = Date.now();
  const day = dayOf(now - daysAway * DAY);
  await db.usage.put({ key: `${day}|screen:home`, day, name: 'screen:home', count: 3 });
  await db.words.bulkPut([
    { lemma: 'λόγος', lemmas: [], gloss: 'word', lesson: 1, state: 'solid', since: now - 90 * DAY },
    { lemma: 'ὁδός', lemmas: [], gloss: 'road', lesson: 1, state: 'solid', since: now - 90 * DAY },
    { lemma: 'ἀγάπη', lemmas: [], gloss: 'love', lesson: 1, state: 'solid', since: now - 90 * DAY },
  ]);
  await db.grammarLevels.put({ id: 'case-genitive', level: 'solid', since: now - 90 * DAY, how: 'placement' });
  const row = (kind: string, id: string, overdue: number) => ({ kind, id, step: 3, due: now - overdue * DAY, lastWhen: now - (overdue + 14) * DAY, lapses: 0, rights: 0 });
  // ἀγάπη is not due for another week: it stays out of the refresher
  await db.reviews.bulkPut([row('word', 'ὁδός', 20), row('grammar', 'case-genitive', 12), row('word', 'λόγος', 9), row('word', 'ἀγάπη', -7)]);
}

const open = async () => {
  cleanup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
};
const card = () => screen.queryByRole('region', { name: CARD });
const settled = async () => {
  await usageWritesSettled();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
};

const feature = await loadFeature('features/welcome-back.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'his last use of Lampas was {int} days ago and three solid items are overdue';
  const WHEN_OPENED = 'Lampas is opened';
  const NAMES = 'a Welcome back card names the most overdue first: {string}, {string}, {string}';
  const names = async (_: unknown, a: string, b: string, c: string) => {
    const found = await screen.findByRole('region', { name: CARD });
    const listed = Array.from(found.querySelectorAll('li')).map((li) => li.textContent);
    expect(listed).toEqual([a, b, c]);
    expect(within(found).getByText(/8 days/)).toBeInTheDocument();
  };

  Scenario('Welcome back', ({ Given, When, Then }) => {
    Given(GIVEN, (_, days: number) => freshStore(days));
    When(WHEN_OPENED, open);
    Then(NAMES, names);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(await screen.findByRole('region', { name: CARD })).findByRole('button', { name }));
    });
    Then('Review is open with a round that asks {string}, {string} and {string}', async () => {
      await screen.findByRole('heading', { name: 'Review', level: 1 });
      expect(await screen.findByText('1 of 3')).toBeInTheDocument();
      expect(card()).toBeNull();
    });
  });

  Scenario('Not now puts it away for the day', ({ Given, When, Then }) => {
    Given(GIVEN, (_, days: number) => freshStore(days));
    When(WHEN_OPENED, open);
    Then(NAMES, names);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(await screen.findByRole('region', { name: CARD })).findByRole('button', { name }));
    });
    Then('there is no Welcome back card', async () => {
      await settled();
      expect(card()).toBeNull();
    });
    When('Lampas is opened again', open);
    Then('there is still no Welcome back card', async () => {
      await settled();
      expect(card()).toBeNull();
    });
  });

  Scenario('No break, no card', ({ Given, When, Then }) => {
    Given(GIVEN, (_, days: number) => freshStore(days));
    When(WHEN_OPENED, open);
    Then('there is no Welcome back card', async () => {
      await settled();
      expect(card()).toBeNull();
    });
  });
});
