// features/steps/tutor-does.steps.ts — runs features/tutor-does.feature: what the tutor's answer does shows on the Talk sheet (mw-t3xu9a.7): the ask-back's one line, a do's said line with Undo,
// a confirm command's button, and a go that is a step of Back. Postern is the fake (tests/support/fake-postern.ts) whose mill answers a grist with the reply a scenario sets.
import '@testing-library/react/dont-cleanup-after-each';
import { createElement } from 'react';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import type { Command } from 'voice-kit/talks';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { currentSettings } from '../../src/settings/registry';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { bibleTalkRegistry } from '../../src/tutor/registry';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type Reply } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { sheetEntriesGone } from '../../tests/support/sheet-history';
import { openTutor } from './open-tutor';

afterAll(() => {
  watcher?.disconnect();
  vi.restoreAllMocks();
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const ANSWER = 'Here is what I found.';
const LOOKING = 'Looking at your';
let fake: FakePostern;
/** set while a scenario watches the page for the looking line */
let watcher: MutationObserver | undefined;
let lookingSeen = false;
/** how many times the confirm command's run was called */
let ran = 0;

/** Opens the app on Romans 8; `reply` is what the mill answers a grist with, worked out from the request (undefined holds that grist for the scenario to answer). */
async function open(reply: (input: Record<string, unknown>) => Reply | undefined): Promise<void> {
  // each step is a test of its own, so a scenario's mocks are let go of by the next scenario's start, not after the step that made them
  vi.restoreAllMocks();
  cleanup();
  await sheetEntriesGone();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = undefined;
  fake.replyFor = reply;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  lookingSeen = false;
  ran = 0;
  watcher?.disconnect();
  watcher = new MutationObserver(() => {
    if (document.body.textContent?.includes(LOOKING)) lookingSeen = true;
  });
  watcher.observe(document.body, { childList: true, subtree: true, characterData: true });
  render(createElement(App));
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const answered = (extra: Record<string, unknown> = {}): Reply => ({ status: 'answered', answer: { answer: ANSWER, words: [], ...extra } });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const sheetGone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());

async function openTalk(): Promise<void> {
  await openTutor();
  await screen.findByRole('dialog', { name: /^Talk about / });
}

async function send(question: string): Promise<void> {
  const box = within(sheet()).getByRole('textbox', { name: 'Your message' });
  await user.clear(box);
  await user.type(box, question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

const says = (text: string) => waitFor(() => expect(sheet()).toHaveTextContent(text));
const liveRegion = (): HTMLElement => document.querySelector('[data-live-region]') as HTMLElement;

/** the confirm command a scenario adds to the Bible talk's registry: Lampas has no confirm command yet, so the registry answers for this one alongside its own */
const forgetNote: Command = {
  name: 'forget-note',
  tell: 'Forgets his note on a chapter',
  kind: 'confirm',
  offer: () => 'Forget the note about Romans 8?',
  run: async () => {
    ran += 1;
    return { said: 'Forgot the note' };
  },
};

function addConfirmCommand(): void {
  const registry = bibleTalkRegistry();
  const command = registry.command.bind(registry);
  const refuses = registry.refuses.bind(registry);
  const run = registry.run.bind(registry);
  vi.spyOn(registry, 'command').mockImplementation((name) => (name === forgetNote.name ? forgetNote : command(name)));
  vi.spyOn(registry, 'refuses').mockImplementation((name, args) => (name === forgetNote.name ? undefined : refuses(name, args)));
  vi.spyOn(registry, 'run').mockImplementation(async (name, args) => (name === forgetNote.name ? { ok: true, ...(await forgetNote.run(args)) } : run(name, args)));
}

const feature = await loadFeature('features/tutor-does.feature');

describeFeature(feature, ({ Scenario }) => {
  const shows = () => says(ANSWER);

  Scenario('The tutor looks at his books first, and the sheet says so until the second answer comes', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor asks for {string} before it answers', (async (_: unknown, fact: string) => {
      // the first grist is answered with the ask; the follow-up (it carries `asked`) is held for the scenario
      await open((input) => ('asked' in input ? undefined : answered({ asks: [fact] })));
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('the live region says {string}', (_, line: string) => waitFor(() => expect(liveRegion()).toHaveTextContent(line)));
    And('the follow-up carries what was asked for {string}', async (_, fact: string) => {
      await waitFor(() => expect(fake.received.length).toBe(2));
      const asked = fake.received[1].input.asked as Record<string, unknown>;
      expect(Object.keys(asked)).toEqual([fact]);
      expect(fake.received[0].input).not.toHaveProperty('asked');
    });
    When('the tutor gives its second answer', async () => {
      await fake.answer(answered());
    });
    Then('the answer shows in the sheet', shows);
    And('the sheet no longer says {string}', async (_, line: string) => {
      await waitFor(() => expect(sheet()).not.toHaveTextContent(line));
    });
  });

  Scenario('An answer that asks for nothing never shows the looking line', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers at once', () => open(() => answered()));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet', shows);
    And('the line {string} was never kept for this talk', (_, line: string) => {
      expect(lookingSeen).toBe(false);
      expect(window.localStorage.getItem('lampas.pendingAsks') ?? '').not.toContain('looking');
      expect(document.body).not.toHaveTextContent(line);
    });
  });

  Scenario('A change the tutor made shows what it did, and Undo puts it back and says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a do that sets the theme to dark', () =>
      open(() => answered({ do: [{ name: 'set-setting', args: { name: 'theme', value: 'dark' } }], said: 'Set the theme to dark.' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string} with an Undo button', async (_, line: string) => {
      await says(line);
      expect(await within(sheet()).findByRole('button', { name: /^Undo/ })).toBeInTheDocument();
    });
    And('the theme is {string}', async (_, theme: string) => {
      await waitFor(async () => expect((await currentSettings()).theme).toBe(theme));
    });
    When('he taps Undo on that line', async () => {
      await user.click(within(sheet()).getByRole('button', { name: /^Undo/ }));
    });
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('the sheet has no Undo button', () => {
      expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
    });
    And('the theme is back to {string}', async (_, theme: string) => {
      await waitFor(async () => expect((await currentSettings()).theme).toBe(theme));
    });
  });

  Scenario('A command that needs his yes shows a button and runs only on the tap', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a do of the confirm command {string}', (async (_: unknown, name: string) => {
      await open(() => answered({ do: [{ name, args: {} }], said: 'Asked him whether to forget the note.' }));
      addConfirmCommand();
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string} with a {string} button', async (_, line: string, button: string) => {
      await says(line);
      expect(await within(sheet()).findByRole('button', { name: button })).toBeInTheDocument();
    });
    And('the command has not run', () => {
      expect(ran).toBe(0);
    });
    When('he taps {string} in the sheet', async (_, name: string) => {
      await user.click(within(sheet()).getByRole('button', { name }));
    });
    Then('the command has run once', async () => {
      await waitFor(() => expect(ran).toBe(1));
    });
    And('the sheet says {string}', (_, line: string) => says(line));
    And('the sheet has no {string} button', (_, name: string) => {
      expect(within(sheet()).queryByRole('button', { name })).toBeNull();
    });
  });

  Scenario('A place the tutor opens is a step of Back, and Back returns to the same talk', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor takes him to {string} when he asks for it', (async (_: unknown, place: string) => {
      await open((input) => (String(input.question).includes('my review') ? answered({ go: { name: place, args: {} }, said: 'Opened Review.' }) : answered()));
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', async (_, question: string) => {
      const before = await db.talks.count();
      await send(question);
      await waitFor(async () => expect(await db.talks.count()).toBe(before + 1));
    });
    And('he sends {string}', async (_, question: string) => {
      const before = await db.talks.count();
      await send(question);
      await waitFor(async () => expect(await db.talks.count()).toBe(before + 1));
    });
    Then('the Review screen is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Review', level: 1 })).toBeInTheDocument();
    });
    And('the Talk sheet is closed', sheetGone);
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('the Talk sheet is open again', async () => {
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    And('the talk shows his {int} messages', async (_, count: number) => {
      await waitFor(() => expect(sheet().querySelectorAll('[data-turn]')).toHaveLength(count));
      expect(sheet()).toHaveTextContent('what does grace mean');
      expect(sheet()).toHaveTextContent('take me to my review');
    });
    And('the Review screen is not open', () => {
      expect(screen.queryByRole('heading', { name: 'Review', level: 1 })).toBeNull();
    });
  });
});
