// features/steps/ask-by.steps.tsx — runs features/ask-by.feature: the setting 'Ask by' (Speaking | Typing), the Verse view's Ask the tutor following it, and the
// tutor switching it when he asks (the verse-ask answer carries a settings_changes entry). Postern and the recogniser are fakes.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { askBySetting } from '../../src/settings/definitions/askBy';
import { setSetting } from '../../src/settings/store';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { composerIn, holdBarsIn } from '../../tests/support/composer';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

const TYPE_REPLY = {
  ...SYNERGEI_ANSWER,
  answer: 'I have switched Ask by to Typing.',
  words: [],
  settings_changes: [{ key: 'askBy', value: 'typing' }],
};
const SPEAK_REPLY = {
  ...SYNERGEI_ANSWER,
  answer: 'I have switched Ask by back to Speaking.',
  words: [],
  settings_changes: [{ key: 'askBy', value: 'speaking' }],
};
const REPLIES: Record<string, unknown> = { 'Let me type instead': TYPE_REPLY, 'Switch back to speaking': SPEAK_REPLY };

async function start(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
}

async function renderApp(): Promise<void> {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

async function openSettings(): Promise<void> {
  await start();
  await renderApp();
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await screen.findByRole('heading', { name: 'More', level: 2 });
  await screen.findByRole('group', { name: 'Tips' });
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });

async function openAsk(): Promise<void> {
  await renderApp();
  const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => h.textContent?.includes('Walking by the Spirit'));
  if (!heading) throw new Error('no heading');
  await user.click(within(heading).getByRole('button'));
  await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(viewEl()).getByRole('button', { name: 'Ask the tutor', exact: true }));
  await within(viewEl()).findByTestId('composer');
}

const askByGroup = async (): Promise<HTMLElement> => screen.findByRole('group', { name: 'Ask by' });
const askBySaved = async (): Promise<string | undefined> => (await db.settings.get('askBy'))?.value;

const typeFirst = async () => {
  const composer = composerIn(viewEl());
  expect(await within(composer).findByRole('textbox', { name: 'Your question' })).toBeInTheDocument();
  expect(within(composer).getByRole('button', { name: 'Send' })).toBeInTheDocument();
  expect(within(composer).getByRole('button', { name: 'Ask by speaking' })).toBeInTheDocument();
  expect(holdBarsIn(viewEl())).toHaveLength(0);
};
const speakFirst = async () => {
  const composer = composerIn(viewEl());
  await waitFor(() => expect(holdBarsIn(viewEl())).toHaveLength(1));
  expect(within(composer).getByRole('button', { name: 'Type a question' })).toBeInTheDocument();
  expect(within(composer).queryByRole('textbox', { name: 'Your question' })).toBeNull();
};

const feature = await loadFeature('features/ask-by.feature');

describeFeature(feature, ({ Scenario }) => {
  const settingsAskBy = async () => {
    const group = await askByGroup();
    expect(within(group).getByRole('button', { name: 'Speaking' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Typing' })).toHaveAttribute('aria-pressed', 'false');
  };
  const savedAs = async (_: unknown, value: string) => {
    await waitFor(async () => expect(await askBySaved()).toBe(value));
  };
  const openAskView = async () => {
    await start();
    await openAsk();
  };

  Scenario('Settings shows Ask by with Speaking and Typing and the search finds it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openSettings);
    Then('Settings shows the group {string} with Speaking chosen', settingsAskBy);
    When('he types {string} in the Settings search', async (_, text: string) => {
      await user.type(await screen.findByRole('searchbox', { name: 'Search settings' }), text);
    });
    Then('the group {string} is still shown with Speaking chosen', settingsAskBy);
    And('Settings has no group {string}', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('group', { name })).toBeNull());
    });
  });

  Scenario('Choosing Typing makes Ask the tutor type-first and it survives a reload', ({ Given, When, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openSettings);
    When('he chooses {string} in the group {string}', async (_, choice: string, name: string) => {
      await user.click(within(await screen.findByRole('group', { name })).getByRole('button', { name: choice }));
    });
    Then('Ask by is saved as {string}', savedAs);
    When('Lampas is opened again on the Verse view of Romans 8 with Ask the tutor chosen', async () => {
      cleanup();
      clearBus();
      forgetTrail();
      window.history.replaceState(null, '', '/');
      await openAsk();
    });
    Then('Ask the tutor shows the text box, Send and a small mic and no Hold to ask bar', typeFirst);
  });

  Scenario('Speaking is the default and Ask the tutor shows the Hold to ask bar', ({ Given, Then }) => {
    Given('Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen', openAskView);
    Then('Ask the tutor shows the Hold to ask bar and a Type a question button and no text box', speakFirst);
  });

  Scenario('Asking to type switches Ask by to Typing, the reply says so, and asking to speak switches it back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen', openAskView);
    const ask = async (_: unknown, question: string) => {
      fake.received.length = 0;
      fake.autoReply = { status: 'answered', answer: REPLIES[question] };
      const composer = composerIn(viewEl());
      if (!within(composer).queryByRole('textbox', { name: 'Your question' })) await user.click(within(composer).getByRole('button', { name: 'Type a question' }));
      await user.type(within(composerIn(viewEl())).getByRole('textbox', { name: 'Your question' }), question);
      await user.click(within(composerIn(viewEl())).getByRole('button', { name: 'Send' }));
    };
    When('he asks {string} by the composer', ask);
    Then('the grist carried Ask by as {string}', async (_, value: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].grist).toMatchObject({ kind: 'verse-ask' });
      expect(fake.received[0].input.settings).toMatchObject({ askBy: value });
    });
    And('the reply says {string}', async (_, text: string) => {
      await waitFor(() => expect(within(viewEl()).getAllByText(text).length).toBeGreaterThan(0));
    });
    And('the answer says {string}', async (_, text: string) => {
      expect(await within(viewEl()).findByText(text)).toBeInTheDocument();
    });
    And('Ask by is saved as {string}', savedAs);
    And('Ask the tutor shows the text box, Send and a small mic and no Hold to ask bar', typeFirst);
    When('he then asks {string} by the composer', ask);
    Then('the next grist carried Ask by as {string}', async (_, value: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(fake.received[0].input.settings).toMatchObject({ askBy: value });
    });
    And('the next reply says {string}', async (_, text: string) => {
      await waitFor(() => expect(within(viewEl()).getAllByText(text).length).toBeGreaterThan(0));
    });
    And('Ask by is now saved as {string}', savedAs);
    And('Ask the tutor shows the Hold to ask bar and a Type a question button and no text box', speakFirst);
  });

  const tutorAnswers = async (text: string, changes: unknown) => {
    fake.received.length = 0;
    fake.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, answer: text, words: [], settings_changes: changes } };
    const composer = composerIn(viewEl());
    if (!within(composer).queryByRole('textbox', { name: 'Your question' })) await user.click(within(composer).getByRole('button', { name: 'Type a question' }));
    await user.type(within(composerIn(viewEl())).getByRole('textbox', { name: 'Your question' }), 'What does it mean?');
    await user.click(within(composerIn(viewEl())).getByRole('button', { name: 'Send' }));
  };
  const answerShows = async (_: unknown, text: string) => {
    expect(await within(viewEl()).findByText(text)).toBeInTheDocument();
  };
  const noText = async (_: unknown, text: string) => {
    // the answer is on screen by now (the step before awaited it), so a failure or a card would be too
    expect(within(viewEl()).queryByText(new RegExp(text))).toBeNull();
  };

  Scenario('A setting change the app refuses never costs him the tutor\'s answer', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen', openAskView);
    When('the tutor answers {string} and also asks to change the theme', (_, text: string) => tutorAnswers(text, [{ key: 'theme', value: 'dark' }, { key: 'askBy', value: 'typing' }]));
    Then('the answer shows {string}', answerShows);
    And('no {string} is shown', noText);
    And('no {string} card is shown', noText);
    And('Ask by is still speaking', async () => {
      expect(await askBySaved()).not.toBe('typing');
    });
  });

  Scenario('A change to the value already set shows no Changed card', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen', openAskView);
    When('the tutor answers {string} and also asks for Ask by Typing while it is Typing', async (_, text: string) => {
      await setSetting(askBySetting, 'typing');
      await tutorAnswers(text, [{ key: 'askBy', value: 'typing' }]);
    });
    Then('the answer shows {string}', answerShows);
    And('no {string} card is shown', noText);
  });

  Scenario("The tutor's instructions say to switch Ask by only when he asks", ({ Given, Then }) => {
    Given('the verse-ask grind', () => undefined);
    Then('its answer schema lets an answer change only Ask by to Speaking or Typing, and its instructions say when', () => {
      const schema = JSON.parse(readFileSync('grinds/verse-ask.answer.schema.json', 'utf8')) as Schema;
      const base = { answer: 'x', words: [] };
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'typing' }] }, schema)).toEqual([]);
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'speaking' }] }, schema)).toEqual([]);
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'shouting' }] }, schema)).not.toEqual([]);
      expect(validate({ ...base, settings_changes: [{ key: 'theme', value: 'dark' }] }, schema)).not.toEqual([]);
      const text = readFileSync('grinds/verse-ask.instructions.md', 'utf8');
      expect(text).toContain('`settings_changes`');
      expect(text).toContain('askBy');
      expect(text).toContain('only when he asks');
    });
  });
});
