// features/steps/appearance.steps.tsx — runs features/appearance.feature: Theme, Text size and the two speech speeds in
// Settings. matchMedia is a fake phone colour scheme and speech synthesis the honest fake of tests/support/fake-speech.ts; what the pixels look like
// (dark palette, 44 px at every size) is proven at phone width in tests/e2e/appearance.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { THEME_COLORS } from '../../src/appearance/themes';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { setSpeechRate, speak, stopSpeaking } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech, type FakeSynth, type FakeVoice } from '../../tests/support/fake-speech';

const GREEK: FakeVoice = { lang: 'el-GR', name: 'Greek (Greece)' };
const ENGLISH: FakeVoice = { lang: 'en-US', name: 'English (US)' };
let synth: FakeSynth;

/** The phone's colour scheme: matchMedia answers for it and tells its listeners when it switches. */
let phoneIsDark = true;
const schemeListeners = new Set<(e: { matches: boolean }) => void>();
const fakeMatchMedia = (query: string) => ({
  media: query,
  get matches() {
    return query.includes('dark') ? phoneIsDark : query.includes('light') ? !phoneIsDark : false;
  },
  addEventListener: (_: string, l: (e: { matches: boolean }) => void) => schemeListeners.add(l),
  removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => schemeListeners.delete(l),
});

const user = userEvent.setup();

const barColour = (): string | null | undefined => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
const pageTheme = (): string | undefined => document.documentElement.dataset.theme;
const textScale = (): number => Number.parseFloat(document.documentElement.style.getPropertyValue('--lp-scale'));

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** Nothing saved, the phone in `dark` or light, the reader open. */
async function openOnPhone(dark: boolean): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  phoneIsDark = dark;
  schemeListeners.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--lp-scale');
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  synth = stubSpeech([GREEK, ENGLISH]);
  vi.stubGlobal('matchMedia', fakeMatchMedia);
  setSpeechRate('english', 1);
  setSpeechRate('greek', 1);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await waitForReader();
  await openSettings();
}

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openSettings(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}
async function backToReader(): Promise<void> {
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
}

const choiceIn = (group: string, label: string) => within(screen.getByRole('group', { name: group })).getByRole('button', { name: label });
const expectPressed = async (group: string, label: string) =>
  waitFor(() => expect(choiceIn(group, label)).toHaveAttribute('aria-pressed', 'true'));
const slider = (name: string) => screen.getByRole('slider', { name });
const setSpeed = async (name: 'English speed' | 'Greek speed', value: string) => {
  await screen.findByRole('slider', { name });
  fireEvent.change(slider(name), { target: { value } });
  // the start-up sync has already published the saved speeds: wait for this one
  await waitFor(() => expect(latest('rates-changed')?.rates[name === 'English speed' ? 'english' : 'greek']).toBe(Number(value)));
};
const speedsAre = async (english: number, greek: number) =>
  waitFor(() => {
    expect(Number((slider('English speed') as HTMLInputElement).value)).toBe(english);
    expect(Number((slider('Greek speed') as HTMLInputElement).value)).toBe(greek);
    // and the speaker has been told: a button tapped next speaks at these
    expect(latest('rates-changed')?.rates).toEqual({ english, greek });
  });

/** Back in the reader showing Greek (a verse's play button reads what is shown), taps the play button of verse 1 and
 * reads the rate the phone was told. */
async function greekRateOfAButton(): Promise<number> {
  await backToReader();
  if (document.querySelector('[data-reader]')?.getAttribute('data-view') !== 'greek') {
    await user.click(screen.getByRole('button', { name: 'Greek' }));
    await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
  }
  const play = within(document.querySelector<HTMLElement>('[data-verse="1"]')!).getByRole('button', { name: 'Hear the verse' });
  const before = synth.spoken.length;
  await user.click(play);
  await waitFor(() => expect(synth.spoken.length).toBe(before + 1));
  const rate = synth.spoken[before].rate;
  expect(synth.spoken[before].lang).toBe('el-GR');
  stopSpeaking();
  await openSettings();
  return rate;
}
function englishRate(): number {
  const before = synth.spoken.length;
  speak('Hello', 'test:english', undefined, 'english');
  expect(synth.spoken.length).toBe(before + 1);
  expect(synth.spoken[before].lang).toMatch(/^en/);
  stopSpeaking();
  return synth.spoken[before].rate;
}

const feature = await loadFeature('features/appearance.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Theme Phone follows a dark colour scheme and a light one', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone whose colour scheme is dark, with nothing saved', () => openOnPhone(true));
    Then('the Theme in Settings is Phone', () => expectPressed('Theme', 'Phone'));
    And("the page follows the phone's colour scheme", () => waitFor(() => expect(pageTheme()).toBe('phone')));
    And('the browser bar colour is the dark one', () => waitFor(() => expect(barColour()).toBe(THEME_COLORS.dark)));
    When('the phone switches to a light colour scheme', () => {
      phoneIsDark = false;
      schemeListeners.forEach((l) => l({ matches: false }));
    });
    Then('the browser bar colour is the light one', () => waitFor(() => expect(barColour()).toBe(THEME_COLORS.light)));
    And("the page still follows the phone's colour scheme", () => waitFor(() => expect(pageTheme()).toBe('phone')));
  });

  Scenario('Theme Dark makes the reader dark whatever the phone says', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone whose colour scheme is light, with nothing saved', () => openOnPhone(false));
    Then('the browser bar colour is the light one', () => waitFor(() => expect(barColour()).toBe(THEME_COLORS.light)));
    When('he sets Theme to Dark in Settings', () => user.click(choiceIn('Theme', 'Dark')));
    Then('the bus has heard the theme is dark', () => waitFor(() => expect(latest('theme-changed')?.theme).toBe('dark')));
    And('the page is dark', () => waitFor(() => expect(pageTheme()).toBe('dark')));
    And('the browser bar colour is the dark one', () => waitFor(() => expect(barColour()).toBe(THEME_COLORS.dark)));
    When('he sets Theme to Light in Settings', () => user.click(choiceIn('Theme', 'Light')));
    Then('the page is light', () => waitFor(() => expect(pageTheme()).toBe('light')));
    And('the browser bar colour is the light one', () => waitFor(() => expect(barColour()).toBe(THEME_COLORS.light)));
  });

  Scenario('Text size Large makes the verse text larger and every tap target stays at least 44 px tall', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone whose colour scheme is dark, with nothing saved', () => openOnPhone(true));
    Then('the Text size in Settings is Normal', () => expectPressed('Text size', 'Normal'));
    And("the page text is at 100% of the phone's size", () => waitFor(() => expect(textScale()).toBe(1)));
    When('he sets Text size to Large in Settings', () => user.click(choiceIn('Text size', 'Large')));
    Then('the bus has heard the text size is {int}', (_, percent: number) =>
      waitFor(() => expect(latest('text-size-changed')?.percent).toBe(percent)),
    );
    And("the page text has become {int}% of the phone's size", (_, percent: number) =>
      waitFor(() => expect(Math.round(textScale() * 100)).toBe(percent)),
    );
  });

  Scenario(
    'a slower Greek rate slows a Greek speaker button and leaves English at its own rate, and a slower English rate slows English only',
    ({ Given, When, Then, And }) => {
      Given('Lampas is opened on a phone whose colour scheme is dark, with nothing saved', () => openOnPhone(true));
      Then('the English speed in Settings is {number} and the Greek speed is {number}', (_, english: number, greek: number) => speedsAre(english, greek));
      When('he sets the Greek speed to {number} in Settings', (_, value: number) => setSpeed('Greek speed', String(value)));
      Then('the bus has heard the speeds are English {number} and Greek {number}', (_, english: number, greek: number) =>
        waitFor(() => expect(latest('rates-changed')?.rates).toEqual({ english, greek })),
      );
      And('a Greek speaker button speaks at {number}', async (_, rate: number) => expect(await greekRateOfAButton()).toBe(rate));
      And('English is spoken at {number}', (_, rate: number) => waitFor(() => expect(englishRate()).toBe(rate)));
      When('he sets the English speed to {number} in Settings', (_, value: number) => setSpeed('English speed', String(value)));
      Then('English is spoken at {number}', (_, rate: number) => waitFor(() => expect(englishRate()).toBe(rate)));
      And('a Greek speaker button still speaks at {number}', async (_, rate: number) => expect(await greekRateOfAButton()).toBe(rate));
    },
  );

  Scenario('Theme, Text size and both rates survive a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone whose colour scheme is light, with nothing saved', () => openOnPhone(false));
    When('he sets Theme to Dark in Settings', () => user.click(choiceIn('Theme', 'Dark')));
    And('he sets Text size to Largest in Settings', () => user.click(choiceIn('Text size', 'Largest')));
    And('he sets the English speed to {number} in Settings', (_, value: number) => setSpeed('English speed', String(value)));
    And('he sets the Greek speed to {number} in Settings', (_, value: number) => setSpeed('Greek speed', String(value)));
    And('Lampas is reopened at the Settings address', async () => {
      // what a fresh start has: no attributes on the page, the speaker at its defaults, the bus empty
      await waitFor(async () => expect((await db.settings.get('rate.greek'))?.value).toBe('1.3'));
      cleanup();
      clearBus();
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.removeProperty('--lp-scale');
      setSpeechRate('english', 1);
      setSpeechRate('greek', 1);
      render(<App />);
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('the Theme in Settings is Dark', () => expectPressed('Theme', 'Dark'));
    And('the Text size in Settings is Largest', () => expectPressed('Text size', 'Largest'));
    And('the English speed in Settings is {number} and the Greek speed is {number}', (_, english: number, greek: number) => speedsAre(english, greek));
    And('the page is dark', async () => waitFor(() => expect(pageTheme()).toBe('dark')));
    And("the page text is at {int}% of the phone's size", async (_, percent: number) =>
      waitFor(() => expect(Math.round(textScale() * 100)).toBe(percent)),
    );
    And('a Greek speaker button speaks at {number}', async (_, rate: number) => expect(await greekRateOfAButton()).toBe(rate));
    And('English is spoken at {number}', (_, rate: number) => waitFor(() => expect(englishRate()).toBe(rate)));
  });
});
