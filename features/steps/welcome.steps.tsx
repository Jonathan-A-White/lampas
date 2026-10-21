// features/steps/welcome.steps.tsx — runs features/welcome.feature: a phone whose licence is first found opens in English and the tutor welcomes him with a short
// interview that writes the memory index; Skip ends it; a phone that already has a profile or settings is not welcomed (mw-yrmkdf.3). The tutor is a fake Postern
// (tests/support/fake-postern.ts) whose mill answers each message with the reply the step names.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getNewWordsADay, getReaderView, getWeave, setDeveloper } from '../../src/data/repositories';
import { getIndex } from '../../src/data/repositories/memory';
import { saveProfile } from '../../src/data/repositories/profile';
import { getWelcome } from '../../src/data/repositories/welcome';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail } from '../../src/nav/lastRoute';
import type { LicenceStatus } from '../../src/services/licenceCheck';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type ReceivedGrist } from '../../tests/support/fake-postern';
import { openSettingsGroup } from '../../tests/support/settings-pages';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const NOW = Date.parse('2026-10-12T12:00:00.000Z');
const ISSUER_PUB = '02' + '11'.repeat(32);
const FIRST_QUESTION = 'Why are you here: to read, to study, or to learn the Greek?';
const held = (): Promise<LicenceStatus> => Promise.resolve({ state: 'held', outpoint: { txid: 'a'.repeat(64), vout: 0 }, collection: 'lampas', checkedAt: new Date(NOW).toISOString() });

/** What the tutor answers to each of his answers, by his words. */
const REPLIES: Record<string, Record<string, unknown>> = {
  'just read': { answer: 'Lovely. What would you like from the app?', words: [], memory_update: [{ name: 'index', append: 'came to read' }] },
  'a calm chapter a day': { answer: 'Good. Is there one thing about yourself you would like me to know?', words: [], memory_update: [{ name: 'index', append: 'wants a calm chapter a day' }] },
  'I am a retired nurse': {
    answer: 'Thank you, that is all I need. Enjoy the reading.',
    words: [],
    memory_update: [{ name: 'index', append: 'a retired nurse' }],
    welcome_done: true,
  },
  'I want to learn the Greek': {
    answer: 'Wonderful. Would you like me to show you the Greek now?',
    words: [],
    memory_update: [{ name: 'index', append: 'came to learn the Greek' }],
    greek_offer: { kind: 'view', text: 'Show me the Greek' },
  },
};
let fake: FakePostern;

async function fresh(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/?b=rom&c=8');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: `Welcome to Lampas. ${FIRST_QUESTION}`, words: [] } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.requests.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with a chain that holds a licence for this phone. */
async function openApp(): Promise<void> {
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={held}>
      <App />
    </LicenceProvider>,
  );
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const welcome = () => screen.findByRole('dialog', { name: 'Welcome' });
const turns = (sheet: HTMLElement) => Array.from(sheet.querySelectorAll<HTMLElement>('[data-turn]'));
const talkGrists = (): ReceivedGrist[] => fake.received.filter((g) => g.grist.kind === 'bible-talk');
const languagePressed = () => document.querySelector<HTMLElement>('[role=group][aria-label=Language] button[aria-pressed=true]')?.textContent;

const feature = await loadFeature('features/welcome.feature');

describeFeature(feature, ({ Scenario }) => {
  const newPhone = async () => {
    await fresh();
    await openApp();
  };
  const asksFirst = async (_: unknown, question: string) => {
    const sheet = await welcome();
    await waitFor(() => expect(turns(sheet)[0]?.textContent ?? '').toContain(question));
  };
  const answers = async (_: unknown, words: string) => {
    const sheet = await welcome();
    // the first turn is the app's own hello with the tutor's first question; his answer is the next one
    await waitFor(() => expect(turns(sheet).length).toBeGreaterThan(0));
    const before = turns(sheet).length;
    fake.autoReply = { status: 'answered', answer: REPLIES[words] };
    await user.type(within(sheet).getByRole('textbox', { name: 'Your message' }), words);
    await user.click(within(sheet).getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(turns(sheet)).toHaveLength(before + 1));
  };
  const taps = async (_: unknown, name: string) => {
    await user.click(await screen.findByRole('button', { name }));
  };
  const indexHolds = async (...lines: string[]) => {
    await waitFor(async () => {
      const { text } = await getIndex();
      for (const line of lines) expect(text).toContain(line);
    });
  };
  const readerStillEnglish = async () => {
    await waitFor(async () => {
      // Just English (the dial's step 0) draws no English | Greek switch at all
      expect(document.querySelector('[role=group][aria-label=Language]')).toBeNull();
      expect(await getReaderView()).toBe('english');
      expect(await getWeave()).toBe('off');
    });
  };
  const noWelcomeWaiting = async () => {
    await waitFor(() => expect(getWelcome()).not.toBe('pending'));
  };
  const notWelcomed = async () => {
    // the licence is found and the check made: nothing opens
    await waitFor(() => expect(getWelcome()).toBe('done'));
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).toBeNull();
  };

  Scenario("A phone whose licence is first found opens in English and the tutor welcomes him", ({ Given, Then, And }) => {
    Given('a new phone whose licence is found when Lampas opens', newPhone);
    Then('the Reader shows English with no Greek and no New words chip', async () => {
      await waitFor(async () => {
        expect(languagePressed()).toBe('English');
        expect(await getWeave()).toBe('off');
        expect(await getNewWordsADay()).toBe(0);
      });
      expect(document.querySelector('[data-testid=new-words]')).toBeNull();
      expect(document.querySelector('[data-testid=weave-count]')).toBeNull();
    });
    And('the welcome talk is open and the tutor asks {string}', asksFirst);
    And('the first bible-talk grist is in welcome mode with no Greek text', async () => {
      await waitFor(() => expect(talkGrists()).toHaveLength(1));
      const input = talkGrists()[0].input as Record<string, unknown>;
      expect(input.mode).toBe('welcome');
      expect('greek' in input).toBe(false);
      expect('english' in input).toBe(false);
      expect(input.reference).toBe('Welcome');
    });
  });

  Scenario('Answering just read ends the welcome with the English defaults and the memory holds the three answers', ({ Given, When, And, Then }) => {
    Given('a new phone whose licence is found when Lampas opens', newPhone);
    When('he answers {string}', answers);
    And('he then answers {string}', answers);
    And('he lastly answers {string}', answers);
    Then('the tutor ends the welcome with thanks', async () => {
      const sheet = await welcome();
      await waitFor(() => expect(turns(sheet).at(-1)?.textContent ?? '').toContain('Enjoy the reading.'));
      await waitFor(() => expect(getWelcome()).toBe('done'));
    });
    And('the memory index holds {string}, {string} and {string}', async (_, a: string, b: string, c: string) => indexHolds(a, b, c));
    And('the Reader still shows English with the Weave off', readerStillEnglish);
    And('no welcome is waiting on this phone', noWelcomeWaiting);
  });

  Scenario('Answering learn the Greek offers the Greek view and a tap opens it', ({ Given, When, Then, And }) => {
    Given('a new phone whose licence is found when Lampas opens', newPhone);
    When('he answers {string}', answers);
    Then('the welcome talk shows the button {string}', async (_, name: string) => {
      expect(await within(await welcome()).findByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string}', taps);
    Then('the Reader shows the Greek', async () => {
      await waitFor(() => expect(languagePressed()).toBe('Greek'));
    });
    And('the Weave is on', async () => {
      await waitFor(async () => expect(await getWeave()).toBe('solid+learning'));
    });
  });

  Scenario('Skip ends the welcome with the English defaults', ({ Given, When, Then, And }) => {
    Given('a new phone whose licence is found when Lampas opens', newPhone);
    When('he taps {string}', async (_, name: string) => {
      // the tutor's first question is on screen before he skips: nothing of this welcome is still in flight when the next scenario begins
      const sheet = await welcome();
      await waitFor(() => expect(turns(sheet).length).toBeGreaterThan(0));
      await taps(_, name);
    });
    Then('the welcome talk is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Welcome' })).toBeNull());
    });
    And('the memory index holds {string}', async (_, line: string) => indexHolds(line));
    And('the Reader still shows English with the Weave off', readerStillEnglish);
    And('no welcome is waiting on this phone', noWelcomeWaiting);
  });

  Scenario('A phone with a profile already is not welcomed', ({ Given, Then, And }) => {
    Given('a phone that already has a profile, whose licence is found when Lampas opens', async () => {
      await fresh();
      await saveProfile({ age: '40' });
      await openApp();
    });
    Then('no welcome talk is opened', notWelcomed);
    And('no grist was sent', () => expect(fake.received.map((g) => g.grist.kind)).toEqual([]));
  });

  Scenario('A phone with settings already is not welcomed', ({ Given, Then, And }) => {
    Given('a phone that already has settings, whose licence is found when Lampas opens', async () => {
      await fresh();
      await db.settings.put({ key: 'layout', value: 'paragraph' });
      await openApp();
    });
    Then('no welcome talk is opened', notWelcomed);
    And('no grist was sent', () => expect(fake.received.map((g) => g.grist.kind)).toEqual([]));
  });

  Scenario('The Developer row brings the welcome back for the demo', ({ Given, When, And, Then }) => {
    Given('a phone that already has settings, whose licence is found when Lampas opens', async () => {
      await fresh();
      await db.settings.put({ key: 'layout', value: 'paragraph' });
      await openApp();
      await waitFor(() => expect(getWelcome()).toBe('done'));
    });
    When('he opens Settings and turns Developer mode on', async () => {
      await setDeveloper('on');
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      await openSettingsGroup(user, 'developer');
    });
    And('he taps {string}', taps);
    Then('the welcome talk is open and the tutor asks {string}', asksFirst);
  });
});
