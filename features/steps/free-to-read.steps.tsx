// features/steps/free-to-read.steps.tsx — runs features/free-to-read.feature: the app opens with no licence (the Reader, a word sheet, a lesson on
// Goal, the Quick test, a shared verse link) and useLicence reports licensed, not-licensed or checking from the existing check (a stub chain).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { fetchLicenceStatus, type LicenceStatus } from '../../src/services/licenceCheck';
import { rememberHeld } from '../../src/services/licenceCache';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, addRevoke, HOLDER, HOLDER_PUB, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const NOW = Date.parse('2026-10-12T12:00:00.000Z');

/** What the chain says about this phone's key: a status, an error, or nothing yet. */
let check: (publicKeyHex: string) => Promise<LicenceStatus>;

const none = (): Promise<LicenceStatus> => Promise.resolve({ state: 'none', checkedAt: new Date(NOW).toISOString() });

async function fresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  // these scenarios are not about the welcome of a new licensed reader (src/Welcome.tsx): it is already done
  window.localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  check = none;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with the stubbed check. */
async function openApp(hash: string): Promise<void> {
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  await seedHisWords();
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => check(key)}>
      <App />
    </LicenceProvider>,
  );
}

async function readLicence(): Promise<void> {
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => check(key)} retryMs={60_000}>
      <LicenceProbe />
    </LicenceProvider>,
  );
}

const licenceState = () => screen.getByTestId('licence-state').textContent;

let chain: ReturnType<typeof newChain>;

function stubChain(): void {
  chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  check = (publicKeyHex) => fetchLicenceStatus(publicKeyHex, { issuer: ISSUER_PUB, reader: chain });
}

const feature = await loadFeature('features/free-to-read.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With no licence the app opens on the Reader and the word sheet, a lesson and the quiz open', ({ Given, When, Then }) => {
    Given('this phone has no licence and Lampas is opened', async () => {
      await fresh();
      await openApp('');
    });
    Then('the app opens on the Reader', async () => {
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      expect(document.querySelector('[data-gate]')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Unlock' })).toBeNull();
    });
    When('he taps a word in verse {int}', async (_, verse: number) => {
      await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${verse}"]`)!).getByRole('button', { name: 'Therefore' }));
    });
    Then('the word sheet opens', async () => {
      expect(await screen.findByRole('dialog', { name: 'Word' })).toBeInTheDocument();
      await user.click(await screen.findByRole('button', { name: 'Done' }));
    });
    When('he opens a lesson on the Goal screen', async () => {
      await setGoal('1 John 1:1');
      window.location.hash = '#/goal';
      await user.click(await screen.findByRole('button', { name: /^Learn next/ }));
    });
    Then('the idea sheet opens', async () => {
      expect(await screen.findByRole('dialog', { name: 'Idea' })).toBeInTheDocument();
    });
    When('he opens the Quick test', async () => {
      window.location.hash = '#/test';
      await screen.findByRole('heading', { name: 'Quick test' });
    });
    Then('the first question is shown', async () => {
      expect(await screen.findByTestId('prompt')).toBeInTheDocument();
    });
  });

  Scenario('With no licence a shared verse link opens that verse', ({ Given, Then, And }) => {
    Given('this phone has no licence and the link {string} is opened', async (_, hash: string) => {
      await fresh();
      await openApp(hash);
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
    });
    And('the Verse view shows verse {int}', async (_, verse: number) => {
      const view = await screen.findByRole('region', { name: 'Verse view' });
      await waitFor(() => expect(view.querySelector('[data-sheet-verse]')).not.toBeNull());
      expect(document.querySelector(`[data-verse="${verse}"]`)).toHaveAttribute('data-selected', 'true');
    });
  });

  Scenario('useLicence reports licensed when the chain says the key holds a licence', ({ Given, When, Then }) => {
    Given("the issuer minted a licence to this phone's key on a stub chain", async () => {
      await fresh();
      stubChain();
      addMint(chain);
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await waitFor(() => expect(licenceState()).toBe(state));
    });
  });

  Scenario('useLicence reports not-licensed when the key has no licence', ({ Given, When, Then }) => {
    Given("this phone's key has no licence on a stub chain", async () => {
      await fresh();
      stubChain();
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await waitFor(() => expect(licenceState()).toBe(state));
    });
  });

  Scenario('useLicence reports not-licensed when the licence was revoked', ({ Given, And, When, Then }) => {
    Given("the issuer minted a licence to this phone's key on a stub chain", async () => {
      await fresh();
      stubChain();
      addMint(chain);
    });
    And('the issuer then signed a revoke for it', () => {
      expect(HOLDER_PUB).toMatch(/^0[23]/);
      addRevoke(chain);
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await waitFor(() => expect(licenceState()).toBe(state));
    });
  });

  Scenario('useLicence reports checking until the chain answers', ({ Given, When, Then }) => {
    Given('the chain has not answered yet', async () => {
      await fresh();
      check = () => new Promise<LicenceStatus>(() => {});
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await screen.findByTestId('licence-state');
      expect(licenceState()).toBe(state);
    });
  });

  Scenario('useLicence reports not-licensed when the chain cannot be reached and no licence is remembered', ({ Given, When, Then }) => {
    Given('the chain cannot be reached', async () => {
      await fresh();
      check = () => Promise.reject(new Error('offline'));
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await waitFor(() => expect(licenceState()).toBe(state));
    });
  });

  Scenario('useLicence reports licensed from a remembered licence while the chain cannot be reached', ({ Given, When, Then }) => {
    Given('this phone held a licence an hour ago and the chain cannot be reached', async () => {
      await fresh();
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
      rememberHeld(HOLDER_PUB, NOW - 3_600_000);
      check = () => Promise.reject(new Error('offline'));
    });
    When('the licence state is read', readLicence);
    Then('the licence state is {string}', async (_, state: string) => {
      await waitFor(() => expect(licenceState()).toBe(state));
    });
  });
});
