// features/steps/pronunciation.steps.tsx — runs features/pronunciation.feature: the word sheet's respelling in the chosen
// pronunciation, and a scheme registered by a test showing up in Settings and on the sheet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { registerPronunciation } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ensureSettingsGroup, openSettingsGroup, leaveSettings, setEachOnItsOwn } from '../../tests/support/settings-pages';

const user = userEvent.setup();
let unregister: (() => void) | undefined;

async function openFresh(saved: Record<string, string> = {}): Promise<void> {
  unregister?.();
  unregister = undefined;
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await db.settings.bulkPut(Object.entries(saved).map(([key, value]) => ({ key, value })));
  window.history.replaceState(null, '', '/');
  render(<App />);
  await waitForReader();
}

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

afterAll(() => {
  unregister?.();
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const sheet = () => screen.getByRole('dialog');

/** Opens Settings and its Listening group from the Reader. */
const openSettingsListening = async (): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'listening');
};
/** A pronunciation row of Listening: the radio group of the scheme list, by its name. */
const rowNamed = (name: string): HTMLElement | null => screen.queryByRole('radiogroup', { name });
const openedAt = (greek: number, hebrew: number, saved: Record<string, string> = {}) => openFresh({ greekInterest: String(greek), hebrewInterest: String(hebrew), ...saved });
const labelsOf = (group: HTMLElement): (string | undefined)[] => within(group).getAllByRole('radio').map((r) => document.getElementById(r.getAttribute('aria-labelledby') ?? '')?.textContent ?? undefined);
const comboNamed = (name: string): HTMLElement | null => screen.queryByRole('combobox', { name });
const ensureListening = (): Promise<void> => ensureSettingsGroup('listening');
const ensureDaily = (): Promise<void> => ensureSettingsGroup('daily');
const sliderNamed = (name: string): HTMLElement | null => screen.queryByRole('slider', { name });

const feature = await loadFeature('features/pronunciation.feature');

describeFeature(feature, ({ Scenario }) => {
  const switchToGreek = async () => {
    await user.click(screen.getByRole('button', { name: 'Greek' }));
    await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
  };
  const tapGreek = async (_: unknown, word: string, verse: number) => {
    await user.click(within(verseEl(verse)).getByRole('button', { name: word }));
  };
  const respelling = (_: unknown, want: string) => expect(within(sheet()).getByTestId('sheet-respelling')).toHaveTextContent(want);

  Scenario('The word sheet respells the word in Modern Greek and shows no beta-code', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openFresh());
    And('he switches the reader to Greek', switchToGreek);
    When('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', (_, want: string) => expect(within(sheet()).getByTestId('sheet-respelling').textContent).toBe(want));
    And('the word sheet shows no transliteration', () => {
      expect(within(sheet()).queryByTestId('sheet-translit')).toBeNull();
      expect(sheet().textContent).not.toContain('pneuma');
    });
  });

  Scenario('A scheme added to the registry is listed in Settings and respells the word sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openFresh());
    And('a second pronunciation {string} is registered that respells every word as its capitals', (_, label: string) => {
      unregister = registerPronunciation({
        id: 'shouting',
        label,
        lang: 'el-GR',
        scoringLang: 'el',
        note: 'Test scheme.',
        respell: (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase(),
        sounds: {},
        loneLetterForm: () => null,
        loneLetterClip: () => null,
        voiceForm: (text) => text,
        letterForm: (letter) => letter,
        tutorGuide: () => `${label}: every word as its capitals.`,
      });
    });
    When("he taps the gear in the reader's header", openSettingsListening);
    And('he sets each language on its own', () => setEachOnItsOwn(user, true));
    Then('Greek pronunciation lists {string} and {string}', async (_, a: string, b: string) => {
      const group = await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
      expect(within(group).getAllByRole('radio').map((r) => document.getElementById(r.getAttribute('aria-labelledby') ?? '')?.textContent)).toEqual([a, b]);
    });
    When('he chooses the pronunciation {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('radio', { name: label }));
      await waitFor(async () => expect((await db.settings.get('greekPronunciation'))?.value).toBe('shouting'));
    });
    And('he taps Back on the Settings screen', async () => {
      await leaveSettings(user);
      await waitForReader();
    });
    And('he switches the reader to Greek', switchToGreek);
    And('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', respelling);
  });

  const familyShownAlone = async (_: unknown, label: string): Promise<void> => {
    const group = await screen.findByRole('radiogroup', { name: 'Pronunciation' });
    expect(labelsOf(group)).toEqual([label]);
    expect(within(group).getByRole('radio', { name: new RegExp(`^${label}`) })).toBeChecked();
    expect(rowNamed('Greek pronunciation')).toBeNull();
    expect(rowNamed('Hebrew pronunciation')).toBeNull();
  };
  const savedAs = async (_: unknown, greek: string, hebrew: string): Promise<void> => {
    await waitFor(async () => {
      expect((await db.settings.get('greekPronunciation'))?.value).toBe(greek);
      expect((await db.settings.get('hebrewPronunciation'))?.value).toBe(hebrew);
    });
  };
  const OPENED = 'Lampas is opened with the Greek dial at {int} and the Hebrew dial at {int}, Greek pronunciation {string} and Hebrew pronunciation {string} saved';
  const openedSaved = (_: unknown, greek: number, hebrew: number, g: string, h: string) => openedAt(greek, hebrew, { greekPronunciation: g, hebrewPronunciation: h });
  const openedPlain = (_: unknown, greek: number, hebrew: number) => openedAt(greek, hebrew);
  const OPENED_PLAIN = 'Lampas is opened with the Greek dial at {int} and the Hebrew dial at {int}';

  Scenario('The family row sets both languages', ({ Given, When, Then }) => {
    Given(OPENED, openedSaved);
    When("he taps the gear in the reader's header", openSettingsListening);
    Then('Listening shows the Pronunciation row with the choice {string}, and neither the Greek nor the Hebrew pronunciation row', familyShownAlone);
    When('he chooses the pronunciation family {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('radio', { name: new RegExp(`^${label}`) }));
    });
    Then('Greek pronunciation is saved as {string} and Hebrew pronunciation as {string}', savedAs);
  });

  Scenario('Set each language on its own shows the Greek and the Hebrew row, and the family goes', ({ Given, When, Then, And }) => {
    Given(OPENED_PLAIN, openedPlain);
    When("he taps the gear in the reader's header", openSettingsListening);
    And('he sets each language on its own', () => setEachOnItsOwn(user, true));
    Then('Listening shows the Greek pronunciation and the Hebrew pronunciation rows, and no Pronunciation row', async () => {
      expect(await screen.findByRole('radiogroup', { name: 'Hebrew pronunciation' })).toBeInTheDocument();
      expect(rowNamed('Greek pronunciation')).not.toBeNull();
      expect(rowNamed('Pronunciation')).toBeNull();
    });
    And('{string} is the Greek pronunciation and {string} is the Hebrew pronunciation', (_, greek: string, hebrew: string) => {
      const checked = (name: string): string | undefined => labelsOf(rowNamed(name) as HTMLElement).find((_, i) => within(rowNamed(name) as HTMLElement).getAllByRole('radio')[i].getAttribute('aria-checked') === 'true');
      expect(checked('Greek pronunciation')).toBe(greek);
      expect(checked('Hebrew pronunciation')).toBe(hebrew);
    });
  });

  Scenario('Turning it off puts the family back and both languages follow it', ({ Given, When, Then, And }) => {
    Given(OPENED, openedSaved);
    When("he taps the gear in the reader's header", openSettingsListening);
    And('he sets each language on its own', () => setEachOnItsOwn(user, true));
    And('he turns Set each language on its own off', () => setEachOnItsOwn(user, false));
    Then('Listening shows the Pronunciation row with the choice {string}, and neither the Greek nor the Hebrew pronunciation row', familyShownAlone);
    And('Greek pronunciation is saved as {string} and Hebrew pronunciation as {string}', savedAs);
  });

  Scenario('The Hebrew voice, speed and keyboard rows show while Hebrew is at Curious or above', ({ Given, When, Then, And }) => {
    Given(OPENED_PLAIN, openedPlain);
    When("he taps the gear in the reader's header", openSettingsListening);
    Then('Listening has the Hebrew voice and the Hebrew speed, and no Greek voice or Greek speed', async () => {
      expect(await screen.findByRole('combobox', { name: 'Hebrew voice' })).toBeInTheDocument();
      expect(await screen.findByRole('slider', { name: 'Hebrew speed' })).toBeInTheDocument();
      expect(comboNamed('Greek voice')).toBeNull();
      expect(sliderNamed('Greek speed')).toBeNull();
    });
    And('Daily has the Hebrew keyboard, and no Greek keyboard', async () => {
      await ensureDaily();
      expect(await screen.findByRole('group', { name: 'Hebrew keyboard' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Greek keyboard' })).toBeNull();
    });
  });

  Scenario("Neither language's voice, speed or keyboard rows show at English only", ({ Given, When, Then, And }) => {
    Given(OPENED_PLAIN, openedPlain);
    When("he taps the gear in the reader's header", async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('Listening has neither the Hebrew nor the Greek voice or speed, nor a Pronunciation row', async () => {
      await ensureListening();
      expect(await screen.findByRole('combobox', { name: 'English voice' })).toBeInTheDocument();
      for (const name of ['Hebrew voice', 'Greek voice']) expect(comboNamed(name), name).toBeNull();
      for (const name of ['Hebrew speed', 'Greek speed']) expect(sliderNamed(name), name).toBeNull();
      for (const name of ['Pronunciation', 'Greek pronunciation', 'Hebrew pronunciation']) expect(rowNamed(name), name).toBeNull();
    });
    And('Daily has neither the Hebrew nor the Greek keyboard', async () => {
      await ensureDaily();
      expect(await screen.findByRole('group', { name: 'Review' })).toBeInTheDocument();
      for (const name of ['Hebrew keyboard', 'Greek keyboard']) expect(screen.queryByRole('group', { name }), name).toBeNull();
    });
  });
});
