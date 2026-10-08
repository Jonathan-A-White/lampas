// features/steps/events.steps.tsx — runs features/events.feature: the reader publishes the verse he selected and his
// view and weave switches on the event bus (src/events/bus.ts), and the Ask box learns the verse from it.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus, subscribe, type AppEvent } from '../../src/events/bus';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
let heard: AppEvent[] = [];
let off: Array<() => void> = [];

async function openAndListen(): Promise<void> {
  cleanup();
  off.forEach((f) => f());
  clearBus();
  heard = [];
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear()]);
  window.location.hash = '';
  const kinds = ['verse-selected', 'view-changed', 'weave-changed'] as const;
  off = kinds.map((kind) => subscribe(kind, (event) => void heard.push(event)));
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const numberButton = (n: number) => screen.getByRole('button', { name: `Verse ${n}` });
const askBoxes = () => [...document.querySelectorAll('[data-ask]')].map((el) => Number(el.getAttribute('data-ask')));
const lastOf = (kind: AppEvent['kind']): AppEvent | undefined => [...heard].reverse().find((e) => e.kind === kind);

async function selectVerse(n: number): Promise<void> {
  await user.click(numberButton(n));
}

const feature = await loadFeature('features/events.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Selecting verse 28 publishes verse-selected and the Ask box shows under verse 28', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 and the bus is listened to', openAndListen);
    When('he selects verse 28', () => selectVerse(28));
    Then('verse-selected was published for chapter {int} verse {int}', (_, chapter: number, verse: number) => {
      expect(lastOf('verse-selected')).toEqual({ kind: 'verse-selected', chapter, verse });
    });
    And('the Ask box shows under verse {int}', async (_, verse: number) => {
      await screen.findByRole('region', { name: 'Ask the tutor' });
      expect(askBoxes()).toEqual([verse]);
      // under the verse: the reading check (src/ReadCheck.tsx) sits between the verse and its Ask box, so it is stepped over
      let above = document.querySelector(`[data-ask="${verse}"]`)?.previousElementSibling;
      while (above?.hasAttribute('data-readcheck')) above = above.previousElementSibling;
      expect(above?.getAttribute('data-verse')).toBe(String(verse));
    });
  });

  Scenario('Selecting the same verse again publishes that no verse is selected', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the bus is listened to', openAndListen);
    And('he selects verse 28', () => selectVerse(28));
    When('he taps verse 28 again', () => selectVerse(28));
    Then('verse-selected was last published with no verse', () => {
      expect(lastOf('verse-selected')).toEqual({ kind: 'verse-selected', chapter: 8, verse: null });
    });
    And('no Ask box shows', () => expect(askBoxes()).toEqual([]));
  });

  Scenario('Switching to Greek publishes view-changed', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the bus is listened to', openAndListen);
    When('he switches to Greek', () => user.click(screen.getByRole('button', { name: 'Greek' })));
    Then('view-changed was published with greek', async () => {
      await waitFor(() => expect(lastOf('view-changed')).toEqual({ kind: 'view-changed', view: 'greek' }));
    });
  });

  Scenario('Switching the weave on publishes weave-changed', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the bus is listened to', openAndListen);
    When('he switches the weave to Solid words', async () => {
      // the Weave switch is in Settings, opened by the gear
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Solid words' }));
    });
    Then('weave-changed was published with solid', async () => {
      await waitFor(() => expect(lastOf('weave-changed')).toEqual({ kind: 'weave-changed', weave: 'solid' }));
    });
  });
});
