// features/steps/hebrew-memorize.steps.tsx — runs features/hebrew-memorize.feature: an Old Testament verse memorized in Hebrew (mw-gdcyf98.15): the languages its Hebrew dial offers on a list's row,
// and the session (src/memorize/MemorizeSession.tsx) over fake-indexeddb and the fake recogniser; the chapters are the committed ones.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db, type Review } from '../../src/data/db';
import { createVerseList, setGreekInterest, setHebrewInterest } from '../../src/data/repositories';
import { listMemorized, memorize, recallsOf } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { MemorizeScreen } from '../../src/memorize/MemorizeScreen';
import { memorizeTarget } from '../../src/memorize/target';
import { forgetTrail } from '../../src/nav/lastRoute';
import { openMemorizeSession } from '../../src/nav/route';
import { hebrewKeyboardSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { stubRecorder } from '../../tests/support/fake-recorder';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const LAST_WHEN = 1_700_000_000_000;
const REF = 'Jonah.1.1';
const user = userEvent.setup();

afterAll(() => {
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

/** Each step is a test of its own, so a scenario starts in its first Given. */
async function reset(): Promise<void> {
  stopReading();
  cleanup();
  clearBus();
  forgetTrail();
  forgetChapters();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
  stubRecognizer();
  stubRecorder();
  await db.open();
  await Promise.all([db.verseLists.clear(), db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.meta.clear(), db.words.clear()]);
}

const memorized = async (): Promise<string[]> => (await listMemorized()).map((r) => `${r.lang}:${r.ref}`).sort();
const switches = (sheet: HTMLElement): string[] => within(sheet).getAllByRole('switch').map((s) => s.getAttribute('aria-label') ?? '');

/** The folded words of the Hebrew verse as he says them: no points, no cantillation. */
async function hebrewWords(): Promise<string[]> {
  const target = await memorizeTarget(REF, 'he');
  return (target ? target.tokens : []).map((t) => t.text.normalize('NFD').replace(/\p{M}/gu, ''));
}

const verse = (): HTMLElement => screen.getByTestId('memorize-verse');

async function say(words: string): Promise<void> {
  fireEvent.pointerDown(await screen.findByRole('button', { name: /Hold to say it/ }), { pointerId: 1, clientX: 10, clientY: 10 });
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
  const recogniser = FakeRecognizer.last();
  recogniser.open();
  recogniser.say([result(words, false)]);
  fireEvent.pointerUp(await screen.findByRole('button', { name: /Release|Say it|Hold to say it|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
}

const feature = await loadFeature('features/hebrew-memorize.feature');

describeFeature(feature, ({ Scenario }) => {
  const onList = (Given: (text: string, fn: (...args: never[]) => Promise<void>) => void) =>
    Given('my Hebrew setting is step {int} and my Greek setting is step {int} and I have a list {string} holding {string}', async (_, hebrew: number, greek: number, name: string, refs: string) => {
      await reset();
      await setGreekInterest(greek as never);
      await setHebrewInterest(hebrew as never);
      const row = await createVerseList(name, refs.split(', '), 1);
      window.history.replaceState(null, '', `/#/lists/${row.id}`);
      render(<App />);
      await screen.findByRole('switch', { name: 'Memorize this list' });
    });
  const tapsMemorize = (step: (text: string, fn: () => Promise<void>) => void) =>
    step('I tap Memorize on the row', async () => {
      await user.click(await screen.findByRole('button', { name: 'Memorize' }));
    });
  const opensLanguages = (step: (text: string, fn: () => Promise<void>) => void) =>
    step("I open the row's languages", async () => {
      await user.click(await screen.findByRole('button', { name: 'Memorizing · English' }));
    });

  Scenario('Jonah 1:1 offers Hebrew at Hebrew Curious', ({ Given, When, Then, And }) => {
    onList(Given);
    tapsMemorize(When);
    opensLanguages(And);
    Then('the sheet offers English and Hebrew', async () => {
      expect(switches(await screen.findByRole('dialog', { name: 'Memorize Jonah 1:1' }))).toEqual(['English', 'Hebrew']);
    });
    When('I switch Hebrew on in the sheet', async () => {
      await user.click(within(screen.getByRole('dialog', { name: 'Memorize Jonah 1:1' })).getByRole('switch', { name: 'Hebrew' }));
    });
    Then('Jonah 1:1 is memorized in English and Hebrew', async () => {
      await waitFor(async () => expect(await memorized()).toEqual([`en:${REF}`, `he:${REF}`]));
    });
  });

  Scenario('The Weave joins at Hebrew Dipping a toe', ({ Given, When, Then, And }) => {
    onList(Given);
    tapsMemorize(When);
    opensLanguages(And);
    Then('the sheet offers English, Hebrew and Weave', async () => {
      expect(switches(await screen.findByRole('dialog', { name: 'Memorize Jonah 1:1' }))).toEqual(['English', 'Hebrew', 'Weave']);
    });
  });

  Scenario('With Greek only an Old Testament verse offers English at most', ({ Given, When, Then }) => {
    onList(Given);
    tapsMemorize(When);
    Then('the row reads {string}', async (_, label: string) => {
      expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    });
    opensLanguages(When);
    Then('no sheet opens', async () => {
      await screen.findByRole('button', { name: 'Memorize' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(await memorized()).toEqual([]);
    });
  });

  Scenario('A Greek verse is still learned by the Greek setting', ({ Given, When, Then, And }) => {
    onList(Given);
    tapsMemorize(When);
    opensLanguages(And);
    Then('the sheet offers English and Greek', async () => {
      expect(switches(await screen.findByRole('dialog', { name: 'Memorize Rom 8:28' }))).toEqual(['English', 'Greek']);
    });
  });

  const atStep2 = (Given: (text: string, fn: () => Promise<void>) => void) =>
    Given('Jonah 1:1 is at step 2 in Hebrew', async () => {
      await reset();
      await setGreekInterest(0);
      await setHebrewInterest(5);
      window.history.replaceState(null, '', '/#/today');
      await memorize(REF, ['he'], LAST_WHEN);
      await db.reviews.where('[kind+id]').equals(['verse', `he:${REF}`]).modify({ step: 2, due: Date.now() - 1000, lastWhen: LAST_WHEN } satisfies Partial<Review>);
    });
  const opens = (When: (text: string, fn: () => Promise<void>) => void) =>
    When('I open its Memorize session', async () => {
      openMemorizeSession(REF, 'he');
      render(<MemorizeScreen />);
      await screen.findByTestId('memorize-verse');
    });
  const says = (step: (text: string, fn: (...args: string[]) => Promise<void>) => void) =>
    step('the session says {string}', async (_, words: string) => {
      expect(await screen.findByText(new RegExp(words))).toBeTruthy();
    });

  Scenario('The session hides the Hebrew words, right to left', ({ Given, When, Then, And }) => {
    atStep2(Given);
    opens(When);
    says(Then);
    And('the verse is drawn right to left in Hebrew with {int} of its {int} words blank', (_, blank: number, all: number) => {
      expect(verse().getAttribute('dir')).toBe('rtl');
      const tokens = [...verse().querySelectorAll('[data-token]')];
      expect(tokens).toHaveLength(all);
      expect(tokens.every((t) => t.getAttribute('lang') === 'he' && t.classList.contains('script-he'))).toBe(true);
      expect(verse().querySelectorAll('[data-blank]')).toHaveLength(blank);
    });
  });

  Scenario('What I say in Hebrew is judged in Hebrew', ({ Given, When, Then, And }) => {
    atStep2(Given);
    opens(When);
    And('I hold the bar and say the verse in Hebrew without points and without its fourth word', async () => {
      await say((await hebrewWords()).filter((_, i) => i !== 3).join(' '));
    });
    Then('the phone was asked to hear he-IL', () => {
      expect(FakeRecognizer.last().lang).toBe('he-IL');
    });
    says(And);
    And('the fourth word is marked', async () => {
      const [fourth] = (await hebrewWords()).slice(3);
      const marked = [...verse().querySelectorAll('[data-missed]')];
      expect(marked).toHaveLength(1);
      expect(marked[0].getAttribute('data-token')).toBe('3');
      expect(marked[0].textContent?.normalize('NFD').replace(/\p{M}/gu, '')).toBe(fourth);
    });
    And('the recall is kept in Hebrew as said', async () => {
      const [recall] = await recallsOf(REF, 'he');
      expect(recall.how).toBe('said');
      expect(recall.asked.every((a) => a.lang === 'he')).toBe(true);
      expect(recall.score).toBeCloseTo(7 / 8);
    });
  });

  Scenario('What I say right passes', ({ Given, When, Then, And }) => {
    atStep2(Given);
    opens(When);
    And('I hold the bar and say the whole verse in Hebrew without points', async () => {
      await say((await hebrewWords()).join(' '));
    });
    says(Then);
  });

  Scenario('Type it appears only with the Hebrew keyboard On', ({ Given, When, Then, And }) => {
    atStep2(Given);
    opens(When);
    says(Then);
    And('there is no way to type', () => {
      expect(screen.queryByRole('button', { name: 'Type it' })).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
    });
    When('I turn on Hebrew keyboard in Settings', () => setSetting(hebrewKeyboardSetting, 'on'));
    And('I tap {string}', async (_, name: string) => {
      fireEvent.click(await screen.findByRole('button', { name }));
    });
    Then('the box is for Hebrew, right to left', async () => {
      const box = await screen.findByRole('textbox', { name: 'Type the verse in Hebrew' });
      expect(box.getAttribute('lang')).toBe('he');
      expect(box.getAttribute('dir')).toBe('rtl');
    });
    When('I type the whole verse in Hebrew without points', async () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: (await hebrewWords()).join(' ') } });
    });
    And('I check what I typed', async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Check' }));
    });
    says(And);
    And('the recall is kept in Hebrew as typed', async () => {
      const [recall] = await recallsOf(REF, 'he');
      expect(recall.how).toBe('typed');
      expect(recall.score).toBeCloseTo(1);
    });
  });
});
