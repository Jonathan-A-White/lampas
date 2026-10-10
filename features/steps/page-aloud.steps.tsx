// features/steps/page-aloud.steps.tsx — runs features/page-aloud.feature: Read aloud and Share in the header of About, My study way and the Preface.
// Speech is the honest fake of tests/support/fake-speech.ts; navigator.share and the clipboard are stood in for by the steps.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { attribution } from '../../src/attribution';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const ADDRESS: Record<string, { hash: string; title: string }> = {
  About: { hash: '#/about', title: 'About' },
  'My study way': { hash: '#/studyway', title: 'My study way' },
  Preface: { hash: '#/preface', title: 'Preface' },
};

let synth: FakeSynth;
let share: ReturnType<typeof vi.fn>;
let written: string[];

async function open(page: string, canShare: boolean | null): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  written = [];
  share = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'share', { configurable: true, value: canShare ? share : undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => (written.push(text), Promise.resolve()) } });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', `/${ADDRESS[page].hash}`);
  render(<App />);
  await screen.findByRole('heading', { name: ADDRESS[page].title, level: 1 });
}

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const blocks = () => [...document.querySelectorAll<HTMLElement>('[data-read-block]')];
const header = () => screen.getByRole('banner');
const bar = () => screen.queryByRole('region', { name: 'Speaking' });
const barButtons = () => within(screen.getByRole('region', { name: 'Speaking' })).getAllByRole('button').map((b) => b.textContent);
const onBar = (name: string) => user.click(within(screen.getByRole('region', { name: 'Speaking' })).getByRole('button', { name }));
/** What a block is when it is spoken: its text, without the dash that leads a quote's credit. */
const saidOf = (el: HTMLElement) => squash(el.textContent).replace(/^[—–]\s*/, '');
const finishLine = async () => {
  synth.finish();
  // the next line is handed to the phone once the end of this one has been heard
  await waitFor(() => expect(synth.speaking).toBe(true));
};

const feature = await loadFeature('features/page-aloud.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  const aboutWithVoices = 'Lampas is opened on the About page on a phone with an English and a Greek voice';
  const tap = async (_: unknown, name: string) => {
    await user.click(within(header()).getByRole('button', { name, exact: true }));
  };

  Scenario('Read aloud speaks the first paragraph first and shows the speaking bar', ({ Given, When, Then, And }) => {
    Given(aboutWithVoices, () => open('About', false));
    When('he taps {string} in the header', tap);
    Then('the phone speaks the first paragraph of the page first, in {string}', (_, lang: string) => {
      expect(synth.spoken[0].text).toBe(attribution.quote?.text);
      expect(synth.spoken[0].text).toBe(saidOf(blocks()[0]));
      expect(synth.spoken[0].lang).toBe(lang);
    });
    And('the speaking bar shows Pause, Restart and Stop', () => {
      expect(barButtons()).toEqual(['Pause', 'Restart', 'Stop']);
    });
    And('the line being read is marked', () => {
      expect(document.querySelectorAll('[data-reading]')).toHaveLength(1);
      expect(blocks()[0]).toHaveAttribute('data-reading');
    });
  });

  Scenario('Pause and Resume go on from the same sentence', ({ Given, And, When, Then }) => {
    let before = 0;
    Given(aboutWithVoices, () => open('About', false));
    And('he taps {string} in the header', tap);
    And('the phone finishes the first line', finishLine);
    When('he taps {string} on the speaking bar', (_, name: string) => onBar(name));
    And('he taps {string} on the speaking bar', async (_, name: string) => {
      before = synth.spoken.length;
      await onBar(name);
    });
    Then('the phone speaks the second line again', () => {
      expect(synth.spoken.slice(before).map((u) => u.text)).toEqual([saidOf(blocks()[1])]);
    });
    And('the first line was not spoken again', () => {
      expect(synth.spoken.slice(before).map((u) => u.text)).not.toContain(saidOf(blocks()[0]));
    });
  });

  Scenario('The reading moves on and the mark follows it', ({ Given, And, When, Then }) => {
    Given(aboutWithVoices, () => open('About', false));
    And('he taps {string} in the header', tap);
    When('the phone finishes the first line', finishLine);
    Then('the second line is the one marked', () => {
      expect(document.querySelectorAll('[data-reading]')).toHaveLength(1);
      expect(blocks()[1]).toHaveAttribute('data-reading');
    });
  });

  Scenario('Leaving the page stops the reading', ({ Given, And, When, Then }) => {
    Given(aboutWithVoices, () => open('About', false));
    And('he taps {string} in the header', tap);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label, exact: true }));
    });
    Then('nothing is being spoken', () => {
      expect(synth.speaking).toBe(false);
    });
    And('there is no speaking bar', async () => {
      await waitFor(() => expect(bar()).toBeNull());
    });
  });

  const sharedWith = (_: unknown, title: string, url: string) => {
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ title, text: squash(blocks()[0].textContent), url });
  };

  Scenario("Share hands the page's link to the phone", ({ Given, When, Then }) => {
    Given('Lampas is opened on the About page on a phone that can share', () => open('About', true));
    When('he taps {string} in the header', tap);
    Then('the phone is asked to share the title {string}, the first paragraph and the link {string}', sharedWith);
  });

  Scenario('With no share sheet the link is copied', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the About page on a phone that cannot share', () => open('About', null));
    When('he taps {string} in the header', tap);
    Then('the clipboard holds {string}', async (_, url: string) => {
      await waitFor(() => expect(written).toEqual([url]));
    });
    And('the page says {string}', async (_, text: string) => {
      expect(await screen.findByText(text)).toHaveAttribute('role', 'status');
    });
  });

  ScenarioOutline('Every page of prose has both buttons', ({ Given, Then }, variables: { page: string }) => {
    Given('Lampas is opened on the <page> page on a phone with an English and a Greek voice', () => open(variables.page, false));
    Then('the header has a {string} button and a {string} button', (_, a: string, b: string) => {
      for (const name of [a, b]) expect(within(header()).getByRole('button', { name, exact: true })).toBeVisible();
    });
  });

  Scenario('Study way shares its own link', ({ Given, When, Then }) => {
    Given('Lampas is opened on the My study way page on a phone that can share', () => open('My study way', true));
    When('he taps {string} in the header', tap);
    Then('the phone is asked to share the title {string}, the first paragraph and the link {string}', sharedWith);
  });
});
