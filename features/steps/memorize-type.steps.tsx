// features/steps/memorize-type.steps.tsx — runs features/memorize-type.feature: typing a recall in the Memorize session (src/memorize/TypeIt.tsx) over fake-indexeddb; the chapters are the committed ones.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review } from '../../src/data/db';
import { setGreekInterest } from '../../src/data/repositories';
import { memorize, recallsOf } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import type { MemorizeLang } from '../../src/memorize/languages';
import { memorizeTarget } from '../../src/memorize/target';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openMemorizeSession } from '../../src/nav/route';
import { greekKeyboardSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { stubRecorder } from '../../tests/support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const LAST_WHEN = 1_700_000_000_000;

afterAll(() => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

let ref = '';
let lang: MemorizeLang = 'en';

/** Each step is a test of its own, so a scenario starts here: in its first Given. */
async function begin(verse: string, language: MemorizeLang): Promise<void> {
  stopReading();
  cleanup();
  clearBus();
  forgetTrail();
  forgetChapters();
  stubChapterFetch();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  stubRecognizer();
  stubRecorder();
  await db.open();
  await Promise.all([db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.words.clear()]);
  await setGreekInterest(5);
  window.history.replaceState(null, '', '/#/today');
  ref = verse;
  lang = language;
  await memorize(ref, [lang], LAST_WHEN);
  await db.reviews.where('[kind+id]').equals(['verse', `${lang}:${ref}`]).modify({ step: 0, due: Date.now() - 1000, lastWhen: LAST_WHEN } satisfies Partial<Review>);
}

const feature = await loadFeature('features/memorize-type.feature');

describeFeature(feature, ({ Scenario }) => {
  const opens = (When: (text: string, fn: () => Promise<void>) => void) =>
    When('I open its Memorize session', async () => {
      openMemorizeSession(ref, lang);
      render(<MemorizeScreen />);
      await screen.findByTestId('memorize-verse');
    });
  const taps = (step: (text: string, fn: (...args: string[]) => Promise<void> | void) => void) =>
    step('I tap {string}', async (_, name: string) => {
      fireEvent.click(await screen.findByRole('button', { name }));
    });
  const checks = (step: (text: string, fn: () => Promise<void>) => void) =>
    step('I check what I typed', async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Check' }));
    });
  const types = (step: (text: string, fn: (...args: string[]) => void) => void) =>
    step('I type {string}', (_, words: string) => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: words } });
    });
  const noTyping = (step: (text: string, fn: () => void) => void) =>
    step('there is no way to type', () => {
      expect(screen.queryByRole('button', { name: 'Type it' })).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
    });
  const says = (step: (text: string, fn: (...args: string[]) => Promise<void>) => void) =>
    step('the session says {string}', async (_, words: string) => {
      expect(await screen.findByText(new RegExp(words))).toBeTruthy();
    });
  const kept = (step: (text: string, fn: (...args: unknown[]) => Promise<void>) => void) =>
    step('the recall is kept as typed with a score of {number}', async (_, score: unknown) => {
      const [recall] = await recallsOf(ref, lang);
      expect(recall.how).toBe('typed');
      expect(recall.score).toBeCloseTo(score as number);
    });

  Scenario('I type the verse in English', ({ Given, When, Then, And }) => {
    Given('the verse {string} is new in English', (_, v: string) => begin(v, 'en'));
    opens(When);
    taps(And);
    types(And);
    checks(And);
    says(Then);
    kept(And);
  });

  Scenario('I type Greek once I have a Greek keyboard', ({ Given, When, Then, And }) => {
    Given('the verse {string} is new in Greek', (_, v: string) => begin(v, 'el'));
    opens(When);
    says(Then);
    noTyping(And);
    When('I turn on Greek keyboard in Settings', () => setSetting(greekKeyboardSetting, 'on'));
    taps(And);
    And('I type the Greek of the verse without accents', async () => {
      const target = await memorizeTarget(ref, 'el');
      const plain = (target ? target.tokens : []).map((t) => t.text.normalize('NFD').replace(/[̀-ͯ]/g, '')).join(' ');
      fireEvent.change(screen.getByRole('textbox'), { target: { value: plain } });
    });
    checks(And);
    says(And);
    kept(And);
  });

  Scenario('Weave is only spoken', ({ Given, When, Then, And }) => {
    Given('the verse {string} is new in the Weave', (_, v: string) => begin(v, 'weave'));
    opens(When);
    noTyping(Then);
    And('the session offers {string}', (_, name: string) => {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy();
    });
  });
});
