// features/steps/tips.steps.tsx — runs features/tips.feature: the tips grist a sitting sends (once a day, online, Tips On), the card under the
// Reader's header, and the Tips setting. fetch is stubbed: /data/ files from disk, https://postern.allmymind.org to the fake mill
// (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { dayOf, setTips } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { tutorTimings } from '../../src/services/tutor';
import { TIPS_DAY_KEY } from '../../src/tips/offer';
import { TipsSitting } from '../../src/tips/TipsSitting';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TIP_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const DAY = 86_400_000;
let fake: FakePostern;

const TRY_REVIEW = TIP_ANSWER;
const NO_SCREEN = { tip: { id: 'hold-a-word', title: 'Hold a word', body: 'Press and hold any Greek word to hear it.' } };

/** Opens Lampas as a sitting does: the app, and the sender that runs at its start. Nothing of the stores is cleared. */
async function sit(): Promise<void> {
  cleanup();
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  render(
    <>
      <TipsSitting />
      <App />
    </>,
  );
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** A fresh phone: the stores cleared, a mill that answers with `answer`, and (unless `offline`) a network. */
async function freshPhone(answer: unknown, tips: 'on' | 'off' = 'on'): Promise<void> {
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.tips.clear(), db.usage.clear()]);
  if (tips === 'off') await setTips('off');
}

const card = () => document.querySelector('[data-testid="tip-card"]') as HTMLElement | null;
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

async function cardShows(title: string): Promise<HTMLElement> {
  await waitFor(() => expect(card()).not.toBeNull());
  const el = card() as HTMLElement;
  expect(within(el).getByText(title)).toBeInTheDocument();
  return el;
}

const feature = await loadFeature('features/tips.feature');

const OFFERS_TRY_REVIEW = 'Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"';

describeFeature(feature, ({ Scenario }) => {
  Scenario('With Tips On and no tip today a grist is sent and the card shows', ({ Given, Then, And }) => {
    Given(OFFERS_TRY_REVIEW, async () => {
      await freshPhone(TRY_REVIEW);
      await sit();
    });
    Then('the mill received one grist for the lampas app, kind tips', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'tips', v: '1' });
    });
    And('its input carries a usage summary and no shown tips', () => {
      const input = fake.received[0].input as { summary: Record<string, unknown>; shown: string[] };
      expect(input.shown).toEqual([]);
      expect(input.summary).toHaveProperty('days_used');
      expect(input.summary).toHaveProperty('features_never');
    });
    And('the tip card under the Reader\'s header says {string} with Show me and Not now', async (_, title: string) => {
      const el = await cardShows(title);
      expect(within(el).getByRole('button', { name: 'Show me' })).toBeInTheDocument();
      expect(within(el).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    });
  });

  Scenario('Not now keeps the id and no second grist is sent that day', ({ Given, When, Then, And }) => {
    Given(OFFERS_TRY_REVIEW, async () => {
      await freshPhone(TRY_REVIEW);
      await sit();
      await cardShows('Try Review');
    });
    When('he taps Not now on the tip card', async () => {
      await user.click(within(card() as HTMLElement).getByRole('button', { name: 'Not now' }));
    });
    Then('the tip card is gone', () => waitFor(() => expect(card()).toBeNull()));
    And('the tip {string} is kept as shown', async (_, id: string) => {
      const row = await db.tips.get(id);
      expect(row).toBeDefined();
      expect(row?.status).not.toBe('open');
    });
    When('Lampas is opened again the same day', () => sit());
    Then('the mill received no more grists', async () => {
      await settle();
      expect(fake.received).toHaveLength(1);
    });
    And('no tip card shows', () => {
      expect(card()).toBeNull();
    });
  });

  Scenario('The next day the shown ids are sent and a tip already shown is never shown again', ({ Given, When, And, Then }) => {
    Given(OFFERS_TRY_REVIEW, async () => {
      await freshPhone(TRY_REVIEW);
      await sit();
      await cardShows('Try Review');
    });
    When('he taps Not now on the tip card', async () => {
      await user.click(within(card() as HTMLElement).getByRole('button', { name: 'Not now' }));
      await waitFor(() => expect(card()).toBeNull());
    });
    And('Lampas is opened the next day, and the mill offers {string} again', async (_, id: string) => {
      expect(id).toBe('try-review');
      window.localStorage.setItem(TIPS_DAY_KEY, dayOf(Date.now() - DAY));
      await sit();
    });
    Then('the mill received a second grist whose input lists the shown tip {string}', async (_, id: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(2));
      expect((fake.received[1].input as { shown: string[] }).shown).toEqual([id]);
    });
    And('no tip card shows', async () => {
      await settle();
      expect(card()).toBeNull();
    });
  });

  Scenario('A tip he has not answered is still there when he comes back, without a new grist', ({ Given, When, Then, And }) => {
    Given(OFFERS_TRY_REVIEW, async () => {
      await freshPhone(TRY_REVIEW);
      await sit();
      await cardShows('Try Review');
    });
    When('Lampas is opened again the same day', () => sit());
    Then('the mill received no more grists', async () => {
      await settle();
      expect(fake.received).toHaveLength(1);
    });
    And('the tip card under the Reader\'s header says {string} with Show me and Not now', async (_, title: string) => {
      const el = await cardShows(title);
      expect(within(el).getByRole('button', { name: 'Show me' })).toBeInTheDocument();
      expect(within(el).getByRole('button', { name: 'Not now' })).toBeInTheDocument();
    });
  });

  Scenario('Show me opens the screen the tip is about and closes the card', ({ Given, When, Then, And }) => {
    Given(OFFERS_TRY_REVIEW, async () => {
      await freshPhone(TRY_REVIEW);
      await sit();
      await cardShows('Try Review');
    });
    When('he taps Show me on the tip card', async () => {
      await user.click(within(card() as HTMLElement).getByRole('button', { name: 'Show me' }));
    });
    Then('the Review screen is shown', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/review'));
      await screen.findByRole('heading', { name: 'Review' });
    });
    And('the tip {string} is kept as shown', async (_, id: string) => {
      const row = await db.tips.get(id);
      expect(row?.status).toBe('acted');
    });
  });

  Scenario('A tip with no screen has one button, Got it', ({ Given, Then }) => {
    Given('Lampas is opened with Tips On, no tip yet today, and a mill that offers a tip with no screen', async () => {
      await freshPhone(NO_SCREEN);
      await sit();
    });
    Then('the tip card has Got it and no Show me', async () => {
      const el = await cardShows('Hold a word');
      expect(within(el).getByRole('button', { name: 'Got it' })).toBeInTheDocument();
      expect(within(el).queryByRole('button', { name: 'Show me' })).toBeNull();
    });
  });

  Scenario('Tips Off sends nothing', ({ Given, Then, And }) => {
    Given('Lampas is opened with Tips Off and a mill that offers the tip "try-review"', async () => {
      await freshPhone(TRY_REVIEW, 'off');
      await sit();
    });
    Then('the mill received no grist', async () => {
      await settle();
      expect(fake.received).toHaveLength(0);
    });
    And('no tip card shows', () => {
      expect(card()).toBeNull();
    });
  });

  Scenario('Offline nothing is sent', ({ Given, Then, And }) => {
    Given('Lampas is opened with Tips On, no tip yet today, offline', async () => {
      await freshPhone(TRY_REVIEW);
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      await sit();
    });
    Then('the mill received no grist', async () => {
      await settle();
      expect(fake.received).toHaveLength(0);
      vi.restoreAllMocks();
    });
    And('no tip card shows', () => {
      expect(card()).toBeNull();
    });
  });

  Scenario('A mill with no tip to offer leaves no card', ({ Given, Then, And }) => {
    Given('Lampas is opened with Tips On, no tip yet today, and a mill that has no tip', async () => {
      await freshPhone({ tip: null });
      await sit();
    });
    Then('the mill received one grist for the lampas app, kind tips', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'tips' });
    });
    And('no tip card shows', async () => {
      await settle();
      expect(card()).toBeNull();
    });
  });

  Scenario('Tips is a setting, On by default, and Off stops the sends', ({ Given, Then, When, And }) => {
    Given('Lampas is opened on Settings with Tips unset', async () => {
      await freshPhone(TRY_REVIEW);
      cleanup();
      window.location.hash = '#/settings';
      render(<SettingsScreen />);
      await screen.findByRole('group', { name: 'Tips' });
    });
    Then('the Tips setting reads On', async () => {
      const group = screen.getByRole('group', { name: 'Tips' });
      await waitFor(() => expect(within(group).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true'));
    });
    When('he sets Tips to Off', async () => {
      await user.click(within(screen.getByRole('group', { name: 'Tips' })).getByRole('button', { name: 'Off' }));
    });
    Then('the bus has heard Tips is off', async () => {
      await waitFor(() => expect(latest('tips-changed')?.tips).toBe('off'));
    });
    And('the Tips setting reads Off', async () => {
      const group = screen.getByRole('group', { name: 'Tips' });
      await waitFor(() => expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true'));
      cleanup();
    });
  });
});
