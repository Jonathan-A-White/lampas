// features/steps/grammar-approach.steps.tsx — runs features/grammar-approach.feature: the Grammar approach section of Settings
// (src/approaches/), the levels it must leave alone, and the tutor changing the approach through a fake Postern.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getGrammarApproach } from '../../src/data/repositories';
import { getLevel, setLevel } from '../../src/data/repositories/grammarLevels';
import { clearBus, latest } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const group = () => screen.getByRole('radiogroup', { name: 'Grammar approach' });
const radio = (name: string) => within(group()).getByRole('radio', { name });
const credit = () => document.querySelector<HTMLElement>('[data-approach-credit]');
const method = () => document.querySelector<HTMLElement>('[data-approach-method]');
const nextRows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-approach-lessons] li')).filter((li) => li.querySelector('[data-next]'));

async function openSettings(): Promise<void> {
  cleanup();
  clearBus();
  window.location.hash = '#/settings';
  await db.open();
  await Promise.all([db.settings.clear(), db.grammarLevels.clear()]);
  render(<SettingsScreen />);
  await screen.findByRole('radiogroup', { name: 'Grammar approach' });
}

async function openTalkApp(changes: { key: string; value: unknown }[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Done.', words: [], settings_changes: changes } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const changeRows = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-change]'));

const feature = await loadFeature('features/grammar-approach.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("Settings > Grammar approach offers BMA Tutor and Lampas ladder, BMA Tutor chosen", ({ Given, Then, And }) => {
    Given('Settings is open on a fresh phone', openSettings);
    Then('the Grammar approach offers {string} and {string}', (_, a: string, b: string) => {
      expect(within(group()).getAllByRole('radio').map((r) => r.textContent?.startsWith(a) || r.textContent?.startsWith(b))).toEqual([true, true]);
      radio(a);
      radio(b);
    });
    And('{string} is chosen', (_, name: string) => {
      expect(radio(name)).toHaveAttribute('aria-checked', 'true');
    });
  });

  Scenario('The chosen approach shows its credit line and its method', ({ Given, Then, And, When }) => {
    Given('Settings is open on a fresh phone', openSettings);
    Then('the approach shows the credit line {string}', (_, line: string) => {
      expect(credit()).toHaveTextContent(line);
    });
    And('the credit line links to Biblical Mastery Academy', () => {
      const link = within(credit()!).getByRole('link', { name: 'Biblical Mastery Academy' });
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    });
    And('the approach shows its method and its first lesson {string} marked {string}', (_, title: string, mark: string) => {
      expect(method()?.textContent?.trim().length).toBeGreaterThan(40);
      const rows = nextRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent(title);
      expect(rows[0].querySelector('[data-next]')).toHaveTextContent(mark);
    });
    When('he chooses {string}', async (_, name: string) => {
      await user.click(radio(name));
    });
    Then('the approach shows no credit line', async () => {
      await waitFor(() => expect(credit()).toBeNull());
      expect(method()).not.toBeNull();
    });
    And('{string} is chosen and the bus has heard the approach is {string}', async (_, name: string, id: string) => {
      await waitFor(() => expect(radio(name)).toHaveAttribute('aria-checked', 'true'));
      expect(latest('approach-changed')).toEqual({ kind: 'approach-changed', approach: id });
    });
  });

  Scenario("Switching to Lampas ladder changes nothing of his levels", ({ Given, And, When, Then }) => {
    Given('Settings is open on a fresh phone', openSettings);
    And('the alphabet and the genitive are solid and the aorist is at the frontier', async () => {
      await setLevel('alphabet', 'solid', 'marked');
      await setLevel('case-genitive', 'solid', 'marked');
      await setLevel('tense-aorist', 'frontier', 'marked');
    });
    When('he chooses {string}', async (_, name: string) => {
      await user.click(radio(name));
      await waitFor(() => expect(radio(name)).toHaveAttribute('aria-checked', 'true'));
    });
    Then('the genitive is still solid and the aorist is still at the frontier', async () => {
      expect((await getLevel('case-genitive'))?.level).toBe('solid');
      expect((await getLevel('tense-aorist'))?.level).toBe('frontier');
      expect((await getLevel('alphabet'))?.level).toBe('solid');
      expect(await db.grammarLevels.count()).toBe(3);
    });
    And('the lesson marked {string} is {string}', async (_, mark: string, title: string) => {
      await waitFor(() => expect(nextRows()).toHaveLength(1));
      expect(nextRows()[0].querySelector('[data-lesson-title]')).toHaveTextContent(title);
      expect(nextRows()[0].querySelector('[data-next]')).toHaveTextContent(mark);
    });
  });

  Scenario('The tutor changes the approach when asked', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change grammarApproach ladder', () =>
      openTalkApp([{ key: 'grammarApproach', value: 'ladder' }]),
    );
    And('he opens Talk', async () => {
      await user.click(await screen.findByRole('button', { name: 'Talk' }));
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he sends {string}', async (_, question: string) => {
      await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
      expect(within(row).getByRole('button', { name: 'Undo Grammar approach' })).toHaveTextContent('Undo');
    });
    And('the saved approach is {string}', async (_, id: string) => {
      expect(await getGrammarApproach()).toBe(id);
    });
    When('he taps Undo', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Undo Grammar approach' }));
    });
    Then('the saved approach is {string}', async (_, id: string) => {
      await waitFor(async () => expect(await getGrammarApproach()).toBe(id));
    });
  });
});
