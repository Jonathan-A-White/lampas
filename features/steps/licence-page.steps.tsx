// features/steps/licence-page.steps.tsx — runs features/licence-page.feature: Settings lists each AI option off and greyed with 'Needs a licence' on a
// phone with no licence, the words open the Licence page (#/unlock: the key as a QR code and as text, Check again), a licence found there turns the
// options on with no reload, and with a licence they work as before.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { ROWS } from '../../src/settings/rows';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, HOLDER, HOLDER_PUB, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const NOW = Date.parse('2026-10-12T12:00:00.000Z');

let chain: ReturnType<typeof newChain>;

async function fresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with a stub chain that holds a licence for this phone's key or does not (yet); waits for the answer. */
async function openApp(hash: string, licensed: boolean): Promise<void> {
  chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (licensed) addMint(chain);
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, reader: chain })}>
      <App />
      <LicenceProbe />
    </LicenceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe(licensed ? 'licensed' : 'not-licensed'));
}

async function openSettings(licensed: boolean): Promise<void> {
  await fresh();
  await openApp('#/settings', licensed);
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await screen.findByRole('group', { name: 'Theme' });
}

const aiRows = () => ROWS.filter((r) => r.ai);
const rowEl = (label: string): HTMLElement => {
  const row = ROWS.find((r) => r.label === label);
  return document.querySelector<HTMLElement>(`[data-setting="${row?.key}"]`)!;
};
const needsLicence = () => screen.queryAllByRole('button', { name: 'Needs a licence' });

const feature = await loadFeature('features/licence-page.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With no licence each AI option is off and greyed with Needs a licence', ({ Given, Then, And }) => {
    Given('this phone has no licence and Settings is open', () => openSettings(false));
    Then('each AI option is off and greyed', () => {
      expect(aiRows().length).toBeGreaterThan(0);
      for (const row of aiRows()) {
        const group = within(rowEl(row.label)).getByRole('group', { name: row.label });
        const off = within(group).getByRole('button', { name: 'Off' });
        expect(off, row.key).toBeDisabled();
        expect(off, row.key).toHaveAttribute('aria-pressed', 'true');
        expect(within(group).queryByRole('button', { name: 'On' }), row.key).toBeNull();
      }
    });
    And('each AI option says {string}', (_, words: string) => {
      for (const row of aiRows()) expect(within(rowEl(row.label)).getByRole('button', { name: words }), row.key).toBeInTheDocument();
      expect(needsLicence()).toHaveLength(aiRows().length);
    });
  });

  Scenario('Tapping a greyed AI option does not turn it on', ({ Given, When, Then, And }) => {
    Given('this phone has no licence and Settings is open', () => openSettings(false));
    When('he taps the greyed switch of {string}', async (_, label: string) => {
      await user.click(within(rowEl(label)).getByRole('button', { name: 'Off' }));
    });
    Then('{string} is still off and nothing is saved for it', async (_, label: string) => {
      expect(within(rowEl(label)).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
      expect(await db.settings.get('tips')).toBeUndefined();
    });
    And('Settings is still open', () => expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument());
  });

  Scenario('Needs a licence opens the Licence page with the key and Check again', ({ Given, When, Then, And }) => {
    Given('this phone has no licence and Settings is open', () => openSettings(false));
    When('he taps {string} under {string}', async (_, words: string, label: string) => {
      await user.click(within(rowEl(label)).getByRole('button', { name: words }));
    });
    Then('the Licence page says {string}', async (_, words: string) => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
      await waitFor(() => expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument());
    });
    And("the Licence page shows this phone's key as a QR code and as text", async () => {
      expect(await screen.findByRole('img', { name: 'This phone’s key as a QR code' })).toBeInTheDocument();
      expect(screen.getByTestId('device-key').textContent).toBe(HOLDER_PUB);
    });
    And('the Licence page has Check again', () => expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument());
  });

  Scenario('A licence found on Check again turns the AI options on', ({ Given, When, Then, And }) => {
    Given('this phone has no licence and Settings is open', () => openSettings(false));
    When('he taps {string} under {string}', async (_, words: string, label: string) => {
      await user.click(within(rowEl(label)).getByRole('button', { name: words }));
    });
    And("the issuer then issues a licence to this phone's key", async () => {
      await screen.findByRole('button', { name: 'Check again' });
      addMint(chain);
    });
    And('he taps Check again', async () => {
      await user.click(screen.getByRole('button', { name: 'Check again' }));
    });
    Then('the Licence page says {string}', async (_, words: string) => {
      await waitFor(() => expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument());
    });
    When('he goes back to Settings', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      await screen.findByRole('group', { name: 'Theme' });
    });
    Then('no AI option says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.queryAllByRole('button', { name: words })).toHaveLength(0));
    });
    And('{string} can be switched on and off', async (_, label: string) => {
      const group = await within(rowEl(label)).findByRole('group', { name: label });
      for (const name of ['On', 'Off']) expect(within(group).getByRole('button', { name })).toBeEnabled();
    });
  });

  Scenario('With a licence the Licence page says Licensed and the AI options work', ({ Given, When, Then, And }) => {
    Given('this phone has a licence and Settings is open', () => openSettings(true));
    Then('no AI option says {string}', async (_, words: string) => {
      await waitFor(() => expect(screen.queryAllByRole('button', { name: words })).toHaveLength(0));
    });
    And('{string} can be switched on and off', async (_, label: string) => {
      const group = await within(rowEl(label)).findByRole('group', { name: label });
      for (const name of ['On', 'Off']) expect(within(group).getByRole('button', { name })).toBeEnabled();
    });
    When('he opens the Licence page', () => {
      window.location.hash = '#/unlock';
    });
    Then('the Licence page says {string}', async (_, words: string) => {
      await screen.findByRole('heading', { name: 'Licence', level: 1 });
      await waitFor(() => expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument());
    });
  });
});
