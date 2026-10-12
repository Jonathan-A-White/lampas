// features/steps/immersive-hint.steps.tsx — runs features/immersive-hint.feature: the card that says how the Immersive reader works
// (src/ImmersiveHint.tsx). How it looks at 390 px is tests/e2e/immersive-hint.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

async function openReader(): Promise<void> {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await screen.findByTestId('reader-chips');
}

async function open(immersive: 'on' | 'off'): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.talks.clear(), db.tips.clear()]);
  if (immersive === 'on') await db.settings.put({ key: 'immersiveReader', value: 'on' });
  await openReader();
  await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-immersive', immersive));
}

/** Closes the app and opens it again on the Reader: what a reload does (the settings store stays). */
async function reopen(): Promise<void> {
  cleanup();
  clearBus();
  window.location.hash = '';
  await openReader();
}

const card = () => document.querySelector<HTMLElement>('[data-immersive-hint]');
const cardButton = (name: string) => within(card() as HTMLElement).getByRole('button', { name });

const feature = await loadFeature('features/immersive-hint.feature');

describeFeature(feature, ({ Scenario }) => {
  const sayHow = 'the hint card says how the bars slide away, how to bring them back and how to leave';
  const cardSays = async () => {
    await waitFor(() => expect(card()).not.toBeNull());
    const text = card()?.textContent ?? '';
    expect(text).toContain('Scroll down and the bars slide away.');
    expect(text).toContain('Tap with three fingers to bring them back.');
    expect(text).toContain('To leave immersive reading: Settings > Immersive reader.');
  };
  const gone = async () => {
    // the setting is read after the screen draws: give it the time a late card would need
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(card()).toBeNull();
  };

  Scenario('Opening the Reader with Immersive reader On shows the card', ({ Given, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open('on'));
    Then(sayHow, cardSays);
    And("the hint card has the buttons 'Got it' and \"Don't show this again\"", () => {
      expect(cardButton('Got it')).toBeInTheDocument();
      expect(cardButton("Don't show this again")).toBeInTheDocument();
    });
  });

  Scenario('Got it closes the card and it shows again the next time the Reader opens', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open('on'));
    When("he taps 'Got it' on the hint card", async () => {
      await cardSays();
      await user.click(cardButton('Got it'));
    });
    Then('the hint card is gone', gone);
    When('Lampas is closed and opened again on Romans 8', reopen);
    Then(sayHow, cardSays);
  });

  Scenario("Don't show this again closes the card for good, also after a reload", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open('on'));
    When('he taps "Don\'t show this again" on the hint card', async () => {
      await cardSays();
      await user.click(cardButton("Don't show this again"));
    });
    Then('the hint card is gone', gone);
    And('the setting Immersive reader card is saved as Off', async () => {
      await waitFor(async () => expect((await db.settings.get('immersiveHint'))?.value).toBe('off'));
    });
    When('Lampas is closed and opened again on Romans 8', reopen);
    Then('the hint card is still gone', gone);
  });

  Scenario('With Immersive reader Off the card never shows', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader Off', () => open('off'));
    Then('the hint card is gone', gone);
  });

  Scenario('Switching Immersive reader card back On in Settings shows the card again', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Romans 8 with Immersive reader On', () => open('on'));
    When('he taps "Don\'t show this again" on the hint card', async () => {
      await cardSays();
      await user.click(cardButton("Don't show this again"));
      await waitFor(async () => expect((await db.settings.get('immersiveHint'))?.value).toBe('off'));
    });
    And('he opens Settings and sets Immersive reader card to On', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      const group = await screen.findByRole('group', { name: 'Immersive reader card' });
      expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(within(group).getByRole('button', { name: 'On' }));
      await waitFor(async () => expect((await db.settings.get('immersiveHint'))?.value).toBe('on'));
    });
    And('he goes back to the Reader', async () => {
      await user.click(await screen.findByRole('button', { name: '‹ Reader' }));
    });
    Then(sayHow, cardSays);
  });
});
