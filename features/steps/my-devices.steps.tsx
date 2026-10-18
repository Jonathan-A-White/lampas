// features/steps/my-devices.steps.tsx — runs features/my-devices.feature: My devices on the Licence page (mw-cvwm1u.5). The backend is a stub fetch at the
// network layer: GET /api/challenge, the signed GET /api/register/person, PATCH and DELETE /api/register/device; the chain a fake that holds a mint of the
// site issuer or of the Governor's.
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
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, HOLDER, HOLDER_PUB, ISSUER, ISSUER_PUB, newChain, SITE_ISSUER, SITE_ISSUER_PUB } from '../../tests/support/licence-chain';

afterAll(async () => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  await usageWritesSettled();
  db.close();
});

const user = userEvent.setup();
const NOW = Date.parse('2026-10-18T12:00:00.000Z');
const OTHER_KEY = '03' + 'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5';

interface Device {
  key: string;
  name: string;
  addedAt: string;
  lastSeen?: string;
}

let chain: ReturnType<typeof newChain>;
let devices: Device[];
let listRefusal: { status: number; body: object } | null;
let removeRefusal: { status: number; body: object } | null;
let renameRefusal: { status: number; body: object } | null;
let asked: { list: number; removed: object[]; renamed: object[] };

function stubBackend(): void {
  const chapters = globalThis.fetch;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? 'GET').toUpperCase();
      const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.endsWith('/api/challenge')) return json(200, { nonce: 'ab'.repeat(32) });
      if (url.includes('/api/register/person')) {
        asked.list += 1;
        expect(String(new Headers(init?.headers).get('Authorization'))).toMatch(new RegExp(`^Postern2 ${HOLDER_PUB}:`));
        if (listRefusal) return json(listRefusal.status, listRefusal.body);
        return json(200, { known: true, personId: 'p1', keys: devices.map((d) => d.key), devices, dailyLimit: 50 });
      }
      if (url.endsWith('/api/register/device') && method === 'DELETE') {
        const body = JSON.parse(String(init?.body)) as { deviceKey: string; personId: string };
        asked.removed.push(body);
        if (removeRefusal) return json(removeRefusal.status, removeRefusal.body);
        devices = devices.filter((d) => d.key !== body.deviceKey);
        return json(200, { personId: 'p1', devices });
      }
      if (url.endsWith('/api/register/device') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as { deviceKey: string; name: string };
        asked.renamed.push(body);
        if (renameRefusal) return json(renameRefusal.status, renameRefusal.body);
        devices = devices.map((d) => (d.key === body.deviceKey ? { ...d, name: body.name } : d));
        return json(200, { personId: 'p1', devices });
      }
      return chapters(input, init);
    }),
  );
}

async function openLicencePage(kind: 'site' | 'governor' | 'none'): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  window.localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  stubBackend();
  asked = { list: 0, removed: [], renamed: [] };
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (kind !== 'none') addMint(chain, kind === 'site' ? SITE_ISSUER : ISSUER);
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
  await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe(kind === 'none' ? 'not-licensed' : 'licensed'));
  await screen.findByRole('heading', { name: 'Licence', level: 1 });
}

function twoDevices(): void {
  devices = [
    { key: HOLDER_PUB, name: 'Pixel', addedAt: '2026-10-10T12:00:00Z', lastSeen: '2026-10-18T12:00:00Z' },
    { key: OTHER_KEY, name: 'Old tablet', addedAt: '2026-10-12T12:00:00Z' },
  ];
}

const myDevices = () => screen.findByRole('region', { name: 'My devices' });
const rowOf = async (name: string) => {
  const list = await myDevices();
  return within(list).getByRole('listitem', { name });
};
const shown = (words: string) => waitFor(() => expect(screen.getByRole('alert').textContent).toBe(words));
const listed = async (...names: string[]) => {
  const region = await myDevices();
  await waitFor(() => expect(within(region).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(names));
};

const feature = await loadFeature('features/my-devices.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(() => {
    twoDevices();
    listRefusal = null;
    removeRefusal = null;
    renameRefusal = null;
  });

  Scenario('A site-licensed phone lists its devices by name and last use', ({ Given, Then, And }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    Then('My devices lists {string} as this phone and {string}', async (_, mine: string, other: string) => {
      await listed(mine, other);
      expect(within(await rowOf(mine)).getByText('this phone')).toBeInTheDocument();
      expect(within(await rowOf(other)).queryByText('this phone')).toBeNull();
    });
    And('each device shows when it was last used', async () => {
      expect((await rowOf('Pixel')).textContent).toMatch(/Last used 18 Oct 2026/);
      expect((await rowOf('Old tablet')).textContent).toMatch(/Last used 12 Oct 2026/);
    });
    And('My devices says a new phone joins with the same phone number', async () => {
      expect((await myDevices()).textContent).toContain('A new phone joins this licence: tap Get a licence there and use the same phone number.');
    });
  });

  Scenario('Removing the other device asks first and leaves one', ({ Given, When, Then, And }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Remove on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Remove/ }));
    });
    Then('he is asked and told {string}', async (_, words: string) => {
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog.textContent).toContain(words);
      expect(asked.removed).toEqual([]);
    });
    When('he confirms Remove', async () => {
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
    });
    Then('My devices lists only {string}', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      await listed(name);
    });
    And('the backend was told to remove {string}', (_, name: string) => {
      expect(asked.removed).toEqual([{ deviceKey: name === 'Old tablet' ? OTHER_KEY : HOLDER_PUB, personId: 'p1' }]);
    });
    And('the Licence page says {string}', async (_, words: string) => {
      expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument();
      expect(screen.getByTestId('licence-state').textContent).toBe('licensed');
    });
  });

  Scenario('Keeping a device after all changes nothing', ({ Given, When, And, Then }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Remove on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Remove/ }));
    });
    And('he taps Keep', () => user.click(screen.getByRole('button', { name: 'Keep' })));
    Then('My devices lists {string} as this phone and {string}', async (_, mine: string, other: string) => {
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      await listed(mine, other);
      expect(asked.removed).toEqual([]);
    });
  });

  Scenario('Removing this phone returns it to Not licensed', ({ Given, When, And, Then }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Remove on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Remove/ }));
    });
    And('he confirms Remove', async () => {
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
    });
    Then('the Licence page says {string}', async (_, words: string) => {
      await waitFor(() => expect(within(screen.getByRole('status')).getByText(words)).toBeInTheDocument());
      expect(screen.getByTestId('licence-state').textContent).toBe('not-licensed');
    });
    And('there is no My devices', () => expect(screen.queryByRole('region', { name: 'My devices' })).toBeNull());
  });

  Scenario('Renaming a device is kept by the backend', ({ Given, When, And, Then }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Rename on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Rename/ }));
    });
    And('he types the name {string} and saves', async (_, name: string) => {
      const field = screen.getByLabelText('Device name');
      await user.clear(field);
      await user.type(field, name);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('My devices lists {string} as this phone and {string}', async (_, mine: string, other: string) => {
      await listed(mine, other);
    });
    And('the backend was told to rename {string} to {string}', (_, _from: string, to: string) => {
      expect(asked.renamed).toEqual([{ deviceKey: OTHER_KEY, name: to }]);
    });
  });

  Scenario("The backend's refusal of a removal is shown in its own words", ({ Given, When, And, Then }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Remove on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Remove/ }));
    });
    And('the backend refuses the removal with {int} {string}', (_, status: number, error: string) => {
      removeRefusal = { status, body: { error } };
    });
    And('he confirms Remove', async () => {
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
    });
    Then('the page shows {string}', (_, words: string) => shown(words));
    And('My devices lists {string} as this phone and {string}', async (_, mine: string, other: string) => {
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      await listed(mine, other);
    });
  });

  Scenario("The backend's refusal of a rename is shown in its own words", ({ Given, When, And, Then }) => {
    Given('this phone is licensed by the site issuer with two devices and the Licence page is open', () => openLicencePage('site'));
    When('he taps Rename on {string}', async (_, name: string) => {
      await user.click(within(await rowOf(name)).getByRole('button', { name: /^Rename/ }));
    });
    And('the backend refuses the rename with {int} {string}', (_, status: number, error: string) => {
      renameRefusal = { status, body: { error } };
    });
    And('he types the name {string} and saves', async (_, name: string) => {
      const field = screen.getByLabelText('Device name');
      await user.clear(field);
      await user.type(field, name);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('the page shows {string}', (_, words: string) => shown(words));
  });

  Scenario("The backend's refusal of the list is shown in its own words", ({ Given, And, Then }) => {
    Given('the backend refuses to list devices with {int} {string}', (_, status: number, error: string) => {
      listRefusal = { status, body: { error } };
    });
    And('this phone is licensed by the site issuer and the Licence page is open', () => openLicencePage('site'));
    Then('the page shows {string}', (_, words: string) => shown(words));
  });

  Scenario("A licence from the Governor's own issuer shows no My devices", ({ Given, Then, And }) => {
    Given("this phone is licensed by the Governor's own issuer and the Licence page is open", () => openLicencePage('governor'));
    Then('there is no My devices', () => expect(screen.queryByRole('region', { name: 'My devices' })).toBeNull());
    And('the backend was not asked for devices', () => expect(asked.list).toBe(0));
  });

  Scenario('A phone with no licence shows no My devices', ({ Given, Then }) => {
    Given('this phone has no licence and the Licence page is open', () => openLicencePage('none'));
    Then('there is no My devices', () => expect(screen.queryByRole('region', { name: 'My devices' })).toBeNull());
  });
});
