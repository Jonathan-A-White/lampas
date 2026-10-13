// features/steps/voice-respelling-agree.steps.tsx — runs features/voice-respelling-agree.feature: his report of 1 Thessalonians 5:16 (mw-5r3p30.264),
// the word sheet of Πάντοτε respelt 'PAN-do-te' and its speaker heard without the n; and χαίρετε respelt HYE-re-te. Speech is the honest fake of
// tests/support/fake-speech.ts, which records what the phone is handed.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopSpeaking } from '../../src/speech/greek';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

const user = userEvent.setup();
let synth: FakeSynth;

afterAll(() => {
  stopSpeaking();
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app straight on 1 Thessalonians 5 in Greek (the address names the place, so no hop from Romans 8), with both voices and the stores emptied. */
async function openThessalonians(): Promise<void> {
  cleanup();
  stopSpeaking();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/#/?b=1th&c=5&view=greek');
  render(<App />);
  await screen.findByRole('heading', { name: '1 Thessalonians 5', level: 1 });
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
  await waitFor(() => expect(within(verseEl(16)).getAllByRole('button').length).toBeGreaterThan(1));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const sheet = () => screen.getByRole('dialog');

const tapGreek = async (_: unknown, word: string, verse: number) => {
  await user.click(within(verseEl(verse)).getByRole('button', { name: word }));
  await screen.findByTestId('sheet-respelling');
};
const respelling = (_: unknown, want: string) => expect(within(sheet()).getByTestId('sheet-respelling').textContent).toBe(want);

const feature = await loadFeature('features/voice-respelling-agree.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The speaker on Πάντοτε hands the Greek voice the n the respelling shows', ({ Given, When, Then }) => {
    Given('Lampas is opened on 1 Thessalonians 5 in Greek, on a phone with a Greek voice', openThessalonians);
    When('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', respelling);
    When("he taps the word sheet's speaker", async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Hear it' }));
    });
    Then('the phone is told to speak {string} with lang {string} in its Greek voice', (_, text: string, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(synth.spoken[0].text.normalize('NFC')).toBe(text.normalize('NFC'));
      expect(synth.spoken[0].lang).toBe(lang);
      expect(synth.spoken[0].voice).toBe(GREEK_VOICE);
    });
  });

  Scenario('χαίρετε is respelt with the soft χ of e and i', ({ Given, When, Then }) => {
    Given('Lampas is opened on 1 Thessalonians 5 in Greek, on a phone with a Greek voice', openThessalonians);
    When('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', respelling);
  });
});
