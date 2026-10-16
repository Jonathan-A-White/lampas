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
import { clearBus } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

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
  await waitFor(() => expect(method()).not.toBeNull());
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
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const changeRows = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-change]'));

const feature = await loadFeature('features/grammar-approach.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings > Grammar approach shows the one path, with no choice to make', ({ Given, Then, And }) => {
    Given('Settings is open on a fresh phone', openSettings);
    Then('the Grammar approach shows no choice', () => {
      const section = screen.getByRole('group', { name: 'Grammar approach' });
      expect(screen.queryByRole('radiogroup', { name: 'Grammar approach' })).toBeNull();
      expect(within(section).queryAllByRole('radio')).toEqual([]);
    });
    And('the approach shows its method and its first lesson {string} marked {string}', (_, title: string, mark: string) => {
      expect(method()?.textContent?.trim().length).toBeGreaterThan(40);
      const rows = nextRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveTextContent(title);
      expect(rows[0].querySelector('[data-next]')).toHaveTextContent(mark);
    });
    And('the approach shows no credit line', () => {
      expect(credit()).toBeNull();
    });
    And('{string} is offered', async (_, name: string) => {
      await screen.findByRole('button', { name });
    });
  });

  Scenario('A phone that saved the BMA Tutor choice reads as the ladder', ({ Given, Then, And }) => {
    Given(
      'Settings is open on a phone that saved {string} with the alphabet and the genitive solid and the aorist at the frontier',
      async (_, saved: string) => {
        cleanup();
        clearBus();
        window.location.hash = '#/settings';
        await db.open();
        await Promise.all([db.settings.clear(), db.grammarLevels.clear()]);
        await db.settings.put({ key: 'grammarApproach', value: saved });
        await setLevel('alphabet', 'solid', 'marked');
        await setLevel('case-genitive', 'solid', 'marked');
        await setLevel('tense-aorist', 'frontier', 'marked');
        render(<SettingsScreen />);
        await waitFor(() => expect(method()).not.toBeNull());
      },
    );
    Then('the approach shows its method and its first lesson {string} marked {string}', async (_, title: string, mark: string) => {
      await waitFor(() => expect(nextRows()).toHaveLength(1));
      expect(nextRows()[0]).toHaveTextContent(title);
      expect(nextRows()[0].querySelector('[data-next]')).toHaveTextContent(mark);
    });
    And('the alphabet and the genitive are still solid and the aorist is still at the frontier', async () => {
      expect((await getLevel('alphabet'))?.level).toBe('solid');
      expect((await getLevel('case-genitive'))?.level).toBe('solid');
      expect((await getLevel('tense-aorist'))?.level).toBe('frontier');
      expect(await db.grammarLevels.count()).toBe(3);
    });
    And('the saved approach is {string} in the store and reads as {string}', async (_, saved: string, read: string) => {
      expect((await db.settings.get('grammarApproach'))?.value).toBe(saved);
      expect(await getGrammarApproach()).toBe(read);
    });
  });

  Scenario('The tutor is told the ladder when asked about the approach', ({ Given, And, When, Then }) => {
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
  });
});
