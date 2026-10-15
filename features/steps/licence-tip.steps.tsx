// features/steps/licence-tip.steps.tsx — runs features/licence-tip.feature: a phone with no licence is told once, on its third visit, what a licence adds
// (src/gate/LicenceTip.tsx), closing it or Learn more ends it, a licence or a first open shows none, and the Licence page is reached from the tip and from
// a Settings row with Back returning to where he was.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { noteVisit } from '../../src/gate/licenceTip';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { ROWS } from '../../src/settings/rows';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, HOLDER, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-12T12:00:00.000Z');

let chain: ReturnType<typeof newChain>;
let licensed = false;
/** The clock of the visit being drawn: a later day moves it on. */
let at = NOW;

async function fresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  // these scenarios are not about the welcome of a new licensed reader (src/Welcome.tsx): it is already done
  window.localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  at = NOW;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with a stub chain that holds a licence for this phone's key or does not; waits for the answer. */
async function draw(hash: string): Promise<void> {
  cleanup();
  clearBus();
  chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (licensed) addMint(chain);
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  await seedHisWords();
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => at} check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, reader: chain })}>
      <App />
      <LicenceProbe />
    </LicenceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe(licensed ? 'licensed' : 'not-licensed'));
}

/** The app's Nth visit: the visit counter (src/gate/licenceTip.ts noteVisit, called by main.tsx) has seen N-1 earlier days, then today is counted. */
async function openOnVisit(visit: number, hash = '#/'): Promise<void> {
  await fresh();
  if (visit > 1) window.localStorage.setItem('lampas.visits', JSON.stringify({ count: visit - 1, last: '2026-09-01' }));
  noteVisit(at);
  await draw(hash);
  await screen.findByRole('heading', { name: /^(Romans 8|Romans)/, level: 1 });
}

const tip = () => screen.queryByRole('note', { name: 'About a licence' });

const feature = await loadFeature('features/licence-tip.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The first visit shows no tip', ({ Given, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit);
    });
    Then('no licence tip is shown', () => expect(tip()).toBeNull());
  });

  Scenario('The second visit shows no tip', ({ Given, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit);
    });
    Then('no licence tip is shown', () => expect(tip()).toBeNull());
  });

  Scenario('The third visit shows the tip once, with its words and a close', ({ Given, Then, And }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit);
    });
    Then('the licence tip says {string}', async (_, words: string) => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      expect(note.textContent).toContain(words);
    });
    And('the licence tip has Learn more and a close', async () => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      expect(within(note).getByRole('button', { name: 'Learn more' })).toBeInTheDocument();
      expect(within(note).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  Scenario('Closing the tip ends it', ({ Given, When, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit);
    });
    When('he closes the licence tip', async () => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      await user.click(within(note).getByRole('button', { name: 'Close' }));
    });
    Then('no licence tip is shown', () => expect(tip()).toBeNull());
    When('Lampas is opened again on a later day', async () => {
      at += DAY;
      noteVisit(at);
      await draw('#/');
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    Then('the licence tip stays gone', () => expect(tip()).toBeNull());
  });

  Scenario('Learn more opens the Licence page and ends the tip', ({ Given, When, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit);
    });
    When('he taps Learn more on the licence tip', async () => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      await user.click(within(note).getByRole('button', { name: 'Learn more' }));
    });
    Then('the Licence page is open', async () => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
    });
    When('Lampas is opened again on a later day', async () => {
      at += DAY;
      noteVisit(at);
      await draw('#/');
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    Then('the licence tip stays gone', () => expect(tip()).toBeNull());
  });

  Scenario("Learn more opens the Licence page and Back returns to the Reader where he was", ({ Given, When, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int} in Greek', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit, '#/?c=8&view=greek');
    });
    When('he taps Learn more on the licence tip', async () => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      await user.click(within(note).getByRole('button', { name: 'Learn more' }));
    });
    Then('the Licence page is open', async () => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
    });
    When("he presses the phone's Back", async () => {
      await act(async () => {
        window.history.back();
      });
    });
    Then('the Reader is open in Greek', async () => {
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      expect(window.location.hash).toContain('view=greek');
    });
  });

  Scenario('The Licence page has its own way back to the Reader', ({ Given, When, And, Then }) => {
    Given('this phone has no licence and Lampas is opened on its visit number {int} in Greek', async (_, visit: number) => {
      licensed = false;
      await openOnVisit(visit, '#/?c=8&view=greek');
    });
    When('he taps Learn more on the licence tip', async () => {
      const note = await screen.findByRole('note', { name: 'About a licence' });
      await user.click(within(note).getByRole('button', { name: 'Learn more' }));
    });
    And("he taps the Licence page's back button {string}", async (_, label: string) => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
      await user.click(screen.getByRole('button', { name: label }));
    });
    Then('the Reader is open in Greek', async () => {
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      expect(window.location.hash).toContain('view=greek');
    });
  });

  Scenario('A phone with a licence never sees the tip', ({ Given, Then }) => {
    Given('this phone has a licence and Lampas is opened on its visit number {int}', async (_, visit: number) => {
      licensed = true;
      await openOnVisit(visit);
    });
    Then('no licence tip is shown', () => expect(tip()).toBeNull());
  });

  Scenario('The first open of a shared verse link shows no tip', ({ Given, Then }) => {
    Given('this phone has no licence and the shared link {string} is opened on its visit number {int}', async (_, hash: string, visit: number) => {
      licensed = false;
      await fresh();
      noteVisit(at);
      expect(visit).toBe(1);
      await draw(hash);
      await screen.findByRole('region', { name: 'Verse view' });
    });
    Then('no licence tip is shown', () => expect(tip()).toBeNull());
  });

  Scenario("A Settings row's Needs a licence opens the Licence page and Back returns to Settings", ({ Given, When, Then }) => {
    Given('this phone has no licence and Settings is open', async () => {
      licensed = false;
      await fresh();
      await draw('#/settings');
      await screen.findByRole('group', { name: 'Theme' });
    });
    When('he taps {string} under {string}', async (_, words: string, label: string) => {
      const row = ROWS.find((r) => r.label === label);
      const el = document.querySelector<HTMLElement>(`[data-setting="${row?.key}"]`)!;
      await user.click(within(el).getByRole('button', { name: words }));
    });
    Then('the Licence page is open', async () => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
    });
    When("he presses the phone's Back", async () => {
      await act(async () => {
        window.history.back();
      });
    });
    Then('Settings is open with {string} showing {string}', async (_, label: string, words: string) => {
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      const row = ROWS.find((r) => r.label === label);
      const el = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-setting="${row?.key}"]`);
        expect(found).not.toBeNull();
        return found!;
      });
      expect(within(el).getByRole('button', { name: words })).toBeInTheDocument();
    });
  });

  Scenario('The Licence page says how to get a licence, with Copy beside the key', ({ Given, Then, And }) => {
    Given('this phone has no licence and the Licence page is open', async () => {
      licensed = false;
      await fresh();
      await draw('#/unlock');
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
    });
    Then('the Licence page says in one line how to get a licence', () => {
      const line = screen.getByTestId('how-to-licence');
      expect(line.tagName).toBe('P');
      expect(line.textContent).toMatch(/Postern’s Key screen/);
      expect(line.textContent!.length).toBeLessThan(140);
    });
    And('the Licence page has Copy beside the key', () => {
      const section = screen.getByRole('region', { name: 'This phone’s key' });
      expect(within(section).getByTestId('how-to-licence')).toBeInTheDocument();
      expect(within(section).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
  });
});
