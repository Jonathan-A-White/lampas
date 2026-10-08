// features/steps/gate.steps.tsx — runs features/gate.feature: the Unlock screen, the device key, the
// held / none / revoked answers, the offline grace and the key storage seam (docs/testing.md).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import type { licence } from 'bsv-kit/bsv';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { Gate } from '../../src/gate/Gate';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { addMint, addRevoke, HOLDER, HOLDER_PUB, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const ISSUER = '02' + 'ab'.repeat(32);
const HOUR = 3_600_000;

type Status = licence.LicenceStatus;
const checkedAt = () => new Date(clock).toISOString();
const outpoint = { txid: 'a'.repeat(64), vout: 0 };

let answer: Status | Error;
let clock: number;
let issuer: string;
let stubChain: ReturnType<typeof newChain> | undefined;
let notedKey = '';
let copied = '';

function reset(): void {
  window.localStorage.clear();
  window.location.hash = '';
  answer = { state: 'none', checkedAt: '' };
  clock = Date.parse('2026-10-08T12:00:00.000Z');
  issuer = ISSUER;
  stubChain = undefined;
  notedKey = '';
  cleanup();
}

const holds = (): Status => ({ state: 'held', outpoint, collection: 'lampas', checkedAt: checkedAt() });

async function open(): Promise<void> {
  cleanup();
  stubChapterFetch();
  render(
    <Gate
      issuer={issuer}
      now={() => clock}
      check={
        !issuer
          ? undefined
          : stubChain
            ? (publicKeyHex) => fetchLicenceStatus(publicKeyHex, { issuer, reader: stubChain })
            : async () => { if (answer instanceof Error) throw answer; return answer; }
      }
    >
      <App />
    </Gate>,
  );
}

const keyText = () => screen.getByTestId('device-key').textContent ?? '';

async function seeReader(): Promise<void> {
  expect(await screen.findByRole('heading', { name: 'Romans 8', level: 1 })).toBeInTheDocument();
}

async function seeUnlock(): Promise<void> {
  expect(await screen.findByRole('heading', { name: 'Unlock' })).toBeInTheDocument();
}

function readerNotShown(): void {
  expect(screen.queryByRole('heading', { name: 'Romans 8', level: 1 })).not.toBeInTheDocument();
}

const feature = await loadFeature('features/gate.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(reset);

  Scenario('First open shows Unlock with a device key and Copy', ({ Given, Then, And, When }) => {
    Given('Lampas is opened for the first time on a phone with no licence', async () => {
      answer = { state: 'none', checkedAt: checkedAt() };
      await open();
    });
    Then('he sees the Unlock screen', seeUnlock);
    And('the Unlock screen shows a device key', async () => {
      await waitFor(() => expect(keyText()).toMatch(/^0[23][0-9a-f]{64}$/));
    });
    And('there is a Copy button', () => {
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
    When('he taps Copy', async () => {
      await user.click(screen.getByRole('button', { name: 'Copy' }));
      // user-event's clipboard stub lasts one step (each step is a test), so read it here.
      copied = await navigator.clipboard.readText();
    });
    Then('the clipboard holds the device key', async () => {
      expect(copied).toBe(keyText());
    });
  });

  Scenario('A held licence opens the reader', ({ Given, When, Then, And }) => {
    Given("the chain says this phone's key holds a licence", () => {
      answer = holds();
    });
    When('Lampas is opened', open);
    Then('he sees the reader', seeReader);
    And('the Unlock screen is gone', () => {
      expect(screen.queryByRole('heading', { name: 'Unlock' })).not.toBeInTheDocument();
    });
  });

  Scenario('No licence shows No licence yet and the key', ({ Given, When, Then, And }) => {
    Given("the chain says this phone's key has no licence", () => {
      answer = { state: 'none', checkedAt: checkedAt() };
    });
    When('Lampas is opened', open);
    Then('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
    And('the Unlock screen shows a device key', async () => {
      expect(keyText()).toMatch(/^0[23][0-9a-f]{64}$/);
    });
  });

  Scenario('A revoked licence shows Licence revoked', ({ Given, When, Then, And }) => {
    Given("the chain says this phone's licence was revoked", () => {
      answer = { state: 'revoked', outpoint, collection: 'lampas', checkedAt: checkedAt() };
    });
    When('Lampas is opened', open);
    Then('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
    And('the reader is not shown', readerNotShown);
  });

  Scenario('A licence the issuer minted and then revoked shows Licence revoked', ({ Given, And, When, Then }) => {
    Given("the issuer minted a licence to this phone's key on a stub chain", () => {
      issuer = ISSUER_PUB;
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
      stubChain = newChain();
      addMint(stubChain);
    });
    And('the issuer then signed a revoke for it', () => {
      expect(HOLDER_PUB).toMatch(/^0[23]/);
      addRevoke(stubChain!);
    });
    When('Lampas is opened', open);
    Then('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
    And('the reader is not shown', readerNotShown);
  });

  Scenario('A held result is remembered through an offline open within the grace', ({ Given, And, When, Then }) => {
    Given("the chain says this phone's key holds a licence", () => {
      answer = holds();
    });
    And('Lampas is opened', open);
    And('he is in the reader', seeReader);
    When('the phone is offline and Lampas is opened again 6 hours later', async () => {
      answer = new Error('offline');
      clock += 6 * HOUR;
      await open();
    });
    Then('he sees the reader', seeReader);
  });

  Scenario('A held result older than the grace does not open an offline phone', ({ Given, And, When, Then }) => {
    Given("the chain says this phone's key holds a licence", () => {
      answer = holds();
    });
    And('Lampas is opened', open);
    And('he is in the reader', seeReader);
    When('the phone is offline and Lampas is opened again 25 hours later', async () => {
      answer = new Error('offline');
      clock += 25 * HOUR;
      await open();
    });
    Then('he sees the Unlock screen', seeUnlock);
    And('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text.replace("'", '.')))).toBeInTheDocument();
    });
    And('the reader is not shown', readerNotShown);
  });

  Scenario('The key survives a reload', ({ Given, And, When, Then }) => {
    Given('Lampas is opened for the first time on a phone with no licence', async () => {
      answer = { state: 'none', checkedAt: checkedAt() };
      await open();
    });
    And('he notes the device key', async () => {
      await seeUnlock();
      notedKey = keyText();
      expect(notedKey).not.toBe('');
    });
    When('Lampas is opened again', open);
    Then('the Unlock screen shows the same device key', async () => {
      await seeUnlock();
      expect(keyText()).toBe(notedKey);
    });
  });

  Scenario('Coming back to the page checks the licence again', ({ Given, And, When, Then }) => {
    Given("the chain says this phone's key has no licence", () => {
      answer = { state: 'none', checkedAt: checkedAt() };
    });
    And('Lampas is opened', open);
    And('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
    });
    When('the licence is issued and the page comes back into view', async () => {
      answer = holds();
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    });
    Then('he sees the reader', seeReader);
  });

  Scenario('A key stored through the test seam is the device key', ({ Given, When, Then }) => {
    Given('the private key {string} is stored under {string} before Lampas boots', (_, hex: string, name: string) => {
      expect(name).toBe(DEVICE_KEY_STORAGE_KEY);
      window.localStorage.setItem(name, hex);
    });
    When('Lampas is opened', open);
    Then('the Unlock screen shows the public key {string}', async (_, publicKey: string) => {
      await seeUnlock();
      expect(keyText()).toBe(publicKey);
    });
  });

  Scenario('No issuer set keeps the gate shut and says so', ({ Given, When, Then, And }) => {
    Given('no licence issuer is configured', () => {
      issuer = '';
    });
    When('Lampas is opened', open);
    Then('he sees {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    });
    And('the reader is not shown', readerNotShown);
  });
});
