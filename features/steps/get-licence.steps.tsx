// features/steps/get-licence.steps.tsx — runs features/get-licence.feature: the Licence page explains what a licence unlocks and has Get a licence (email,
// phone, two codes); the backend is a stub fetch at the network layer, the chain a fake that holds the site issuer's mint once the backend has confirmed.
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
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, HOLDER, HOLDER_PUB, ISSUER_PUB, newChain, SITE_ISSUER, SITE_ISSUER_PUB } from '../../tests/support/licence-chain';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const NOW = Date.parse('2026-10-18T12:00:00.000Z');

let chain: ReturnType<typeof newChain>;

interface Refusal {
  status: number;
  body: object;
}

/** What the stub backend does with the next start and confirm: a refusal, or (none) success. */
let startRefusal: Refusal | null;
let confirmRefusal: Refusal | null;
let started: { email: string; phone: string; deviceKey: string } | null;

function stubBackend(): void {
  const chapters = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/api/register/start')) {
        if (startRefusal) return json(startRefusal.status, startRefusal.body);
        started = JSON.parse(String(init?.body));
        return json(200, { registrationId: 'reg-1' });
      }
      if (url.endsWith('/api/register/confirm')) {
        if (confirmRefusal) return json(confirmRefusal.status, confirmRefusal.body);
        addMint(chain, SITE_ISSUER);
        return json(200, { personId: 'p1', devices: [{ key: HOLDER_PUB, name: 'This phone', addedAt: '2026-10-18T12:00:00Z' }], issued: true });
      }
      return chapters(input, init);
    }),
  );
}

async function openLicencePage(licensed: boolean): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  window.localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  stubBackend();
  startRefusal = null;
  confirmRefusal = null;
  started = null;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (licensed) addMint(chain, SITE_ISSUER);
  window.history.replaceState(null, '', '/#/unlock');
  restoreLastRoute();
  render(
    <LicenceProvider
      issuer={ISSUER_PUB}
      now={() => NOW}
      check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, siteIssuer: SITE_ISSUER_PUB, reader: chain })}
    >
      <App />
      <LicenceProbe />
    </LicenceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe(licensed ? 'licensed' : 'not-licensed'));
  await screen.findByRole('heading', { name: 'Licence', level: 1 });
}

const tap = (name: string) => user.click(screen.getByRole('button', { name }));
const shown = (words: string) => waitFor(() => expect(screen.getByRole('alert').textContent).toBe(words));

const feature = await loadFeature('features/get-licence.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The Licence page says what a licence unlocks and has Get a licence', ({ Given, Then, And }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    Then('the Licence page says what a licence unlocks in three sentences', () => {
      const text = screen.getByTestId('what-a-licence-unlocks').textContent ?? '';
      expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
      expect(text).toMatch(/tutor/);
      expect(text).toMatch(/free/);
      expect(text).toMatch(/Twilio/);
      expect(text).toMatch(/scrambled fingerprints/);
    });
    And('the Licence page has a Get a licence button', () => expect(screen.getByRole('button', { name: 'Get a licence' })).toBeInTheDocument());
    And('the Licence page has no coming soon', () => expect(document.body.textContent).not.toMatch(/coming soon/i));
  });

  Scenario('A licensed phone is not offered Get a licence', ({ Given, Then }) => {
    Given('this phone has a licence and the Licence page is open', () => openLicencePage(true));
    Then('the Licence page has no Get a licence button', () => {
      expect(screen.queryByRole('button', { name: 'Get a licence' })).toBeNull();
      expect(screen.queryByTestId('what-a-licence-unlocks')).toBeNull();
    });
  });

  Scenario('Registering with an email, a phone and two codes licenses this phone', ({ Given, When, And, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    When('he taps Get a licence', () => tap('Get a licence'));
    And('he types the email {string} and the phone {string}', async (_, email: string, phone: string) => {
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Phone'), phone);
    });
    And('he taps Send codes', () => tap('Send codes'));
    Then("the backend was asked to start with this phone's key", async () => {
      await screen.findByLabelText('Email code');
      expect(started).toEqual({ email: 'reader@example.com', phone: '+1 415 555 0101', deviceKey: HOLDER_PUB });
    });
    When('he types the email code {string} and the phone code {string}', async (_, emailCode: string, phoneCode: string) => {
      await user.type(screen.getByLabelText('Email code'), emailCode);
      await user.type(screen.getByLabelText('Phone code'), phoneCode);
    });
    And('he taps Confirm', () => tap('Confirm'));
    Then('the page says {string}', async (_, words: string) => {
      await screen.findByText(words);
    });
    When('he taps Check again', () => tap('Check again'));
    Then('the Licence page says {string}', async (_, words: string) => {
      await waitFor(() => expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument());
      expect(screen.getByTestId('licence-state').textContent).toBe('licensed');
    });
  });

  Scenario("The backend's refusal is shown in its own words", ({ Given, When, And, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    When('he taps Get a licence', () => tap('Get a licence'));
    And('he types the email {string} and the phone {string}', async (_, email: string, phone: string) => {
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Phone'), phone);
    });
    And('the backend refuses to start with {int} {string}', (_, status: number, error: string) => {
      startRefusal = { status, body: { error } };
    });
    And('he taps Send codes', () => tap('Send codes'));
    Then('the page shows {string}', (_, words: string) => shown(words));
    And('the email and phone are still there to change', () => {
      expect(screen.getByLabelText('Email')).toHaveValue('reader@example.com');
      expect(screen.getByLabelText('Phone')).toHaveValue('+1 415 555 0101');
    });
  });

  Scenario('A wrong code says how many tries are left and lets him try again', ({ Given, When, And, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    When('he taps Get a licence', () => tap('Get a licence'));
    And('he types the email {string} and the phone {string}', async (_, email: string, phone: string) => {
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Phone'), phone);
    });
    And('he taps Send codes', () => tap('Send codes'));
    And('he types the email code {string} and the phone code {string}', async (_, emailCode: string, phoneCode: string) => {
      await user.type(await screen.findByLabelText('Email code'), emailCode);
      await user.type(screen.getByLabelText('Phone code'), phoneCode);
    });
    And('the backend refuses to confirm with {int} {string} and {int} tries left', (_, status: number, error: string, triesLeft: number) => {
      confirmRefusal = { status, body: { error, triesLeft } };
    });
    And('he taps Confirm', () => tap('Confirm'));
    Then('the page shows {string}', (_, words: string) => shown(words));
    And('the two code fields are still there', () => {
      expect(screen.getByLabelText('Email code')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone code')).toBeInTheDocument();
    });
  });

  Scenario('A phone that already has three devices is told so', ({ Given, When, And, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    When('he taps Get a licence', () => tap('Get a licence'));
    And('he types the email {string} and the phone {string}', async (_, email: string, phone: string) => {
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Phone'), phone);
    });
    And('he taps Send codes', () => tap('Send codes'));
    And('he types the email code {string} and the phone code {string}', async (_, emailCode: string, phoneCode: string) => {
      await user.type(await screen.findByLabelText('Email code'), emailCode);
      await user.type(screen.getByLabelText('Phone code'), phoneCode);
    });
    And('the backend refuses to confirm with {int} {string}', (_, status: number, error: string) => {
      confirmRefusal = { status, body: { error } };
    });
    And('he taps Confirm', () => tap('Confirm'));
    Then('the page shows {string}', (_, words: string) => shown(words));
  });

  Scenario('A closed registration is shown as the backend says it', ({ Given, When, And, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage(false));
    When('he taps Get a licence', () => tap('Get a licence'));
    And('he types the email {string} and the phone {string}', async (_, email: string, phone: string) => {
      await user.type(screen.getByLabelText('Email'), email);
      await user.type(screen.getByLabelText('Phone'), phone);
    });
    And('the backend refuses to start with {int} {string}', (_, status: number, error: string) => {
      startRefusal = { status, body: { error } };
    });
    And('he taps Send codes', () => tap('Send codes'));
    Then('the page shows {string}', (_, words: string) => shown(words));
  });
});
