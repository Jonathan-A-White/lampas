// features/steps/ask-by.steps.tsx — runs features/ask-by.feature: the setting 'Ask by' (Speaking | Typing), the Verse view's Ask the tutor following it, and the
// tutor switching it when he asks (the answer carries a settings_changes entry). Postern and the recogniser are fakes.
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
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { validate, type Schema } from '../../tests/support/schema-validate';
import { seedHisWords } from '../../tests/support/his-words';
import { instructionsOf } from '../../scripts/grind-parts';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import '../../tests/support/grinds-in-graph';

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
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
}

async function renderApp(): Promise<void> {
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

async function openSettings(): Promise<void> {
  await start();
  await renderApp();
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'tutor');
  await screen.findByRole('group', { name: 'Tips' });
}


const askByGroup = async (): Promise<HTMLElement> => screen.findByRole('group', { name: 'Ask by' });


const feature = await loadFeature('features/ask-by.feature');

describeFeature(feature, ({ Scenario }) => {
  const settingsAskBy = async () => {
    const group = await askByGroup();
    expect(within(group).getByRole('button', { name: 'Speaking' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Typing' })).toHaveAttribute('aria-pressed', 'false');
  };

  Scenario('Settings shows Ask by with Speaking and Typing', ({ Given, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openSettings);
    Then('Settings shows the group {string} with Speaking chosen', settingsAskBy);
  });

  Scenario("The tutor's instructions say to switch Ask by only when he asks", ({ Given, Then }) => {
    Given('the bible-talk grind', () => undefined);
    Then('its answer schema lets an answer change Ask by to Speaking or Typing and no other value, and its instructions say when', () => {
      const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema;
      const base = { answer: 'x', question: 'Why?', words: [] };
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'typing' }] }, schema)).toEqual([]);
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'speaking' }] }, schema)).toEqual([]);
      expect(validate({ ...base, settings_changes: [{ key: 'askBy', value: 'shouting' }] }, schema)).not.toEqual([]);
      const text = instructionsOf('bible-talk');
      expect(text).toContain('`settings_changes`');
      expect(text).toContain('askBy');
      expect(text).toContain('only when he asks');
    });
  });
});
