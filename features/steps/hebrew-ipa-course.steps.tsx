// features/steps/hebrew-ipa-course.steps.tsx — runs features/hebrew-ipa-course.feature: the optional course 'Learn the IPA sounds' for Hebrew (src/ipa/, #/ipa?lang=he, mw-gdcyf98.24), reached by
// the Optional entry of the Goal screen while his Hebrew dial is above 0 and the setting IPA lesson is On. The drill and the pass check draw from ipaSeed; the steps fix it and rebuild each
// question and round with the same pure functions the screen uses (src/ipa/drill.ts, course.ts). The Hebrew voice is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/random';
import { getIpaProgress } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { passCheckQuestions, courseSounds, type CourseSound } from '../../src/ipa/course';
import { answerDrill, currentQuestion, drawRound, questionFor, startRound, type DrillItem, type DrillState, type IpaQuestion } from '../../src/ipa/drill';
import { ipaSeed } from '../../src/ipa/seed';
import { forgetTrail } from '../../src/nav/lastRoute';
import { chooseAccent, chosenAccent, accentOf } from '../../src/speech/accents';
import { stopSpeaking } from '../../src/speech/greek';
import { hebrewPronunciationOf } from '../../src/speech/pronunciation';
import type { SoundId } from '../../src/speech/sounds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { GROUPS } from '../../src/settings/rows';

const user = userEvent.setup();
const SEED = 5;
const scheme = hebrewPronunciationOf();
const sounds: CourseSound[] = courseSounds(scheme, accentOf('american'));
const COURSE_LINE = 'You do not need this for Lampas or for reading Hebrew. It is only here if you want it.';
const DIALS: Record<string, string> = { 'Just English': '0', Curious: '1', Learning: '3' };

Element.prototype.scrollIntoView = function () {};

let synth: FakeSynth;

afterAll(() => {
  cleanup();
  stopSpeaking();
  chooseAccent('american');
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on the Goal screen with Greek and Hebrew voices, every store emptied, and his Hebrew dial at `dial`. */
async function open(dial: string, hash = '#/goal'): Promise<void> {
  cleanup();
  stopSpeaking();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE]);
  stubChapterFetch();
  localStorage.clear();
  chooseAccent('american');
  ipaSeed.next = () => SEED;
  window.history.replaceState(null, '', `/${hash}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.settings.put({ key: 'hebrewInterest', value: DIALS[dial] });
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

const optional = () => screen.findByRole('region', { name: 'Optional' });
const entryNames = async (): Promise<string[]> => within(await optional()).getAllByRole('button').map((b) => b.textContent ?? '');
const home = () => screen.findByTestId('ipa-home');

async function opensHebrewCourse(): Promise<void> {
  await open('Learning');
  await user.click(await screen.findByTestId('ipa-entry-he'));
  await user.click(await screen.findByTestId('ipa-start'));
  await home();
}

async function backToGoal(): Promise<void> {
  await user.click(screen.getByRole('button', { name: '‹ Goal' }));
  await screen.findByRole('heading', { name: 'Goal', level: 1 });
}

/** Opens the card of `id` from the sounds and goes back to them; waits until the count shows it. */
async function opensSound(id: string, opened: number): Promise<void> {
  await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
  await screen.findByTestId('ipa-card');
  await user.click(screen.getByRole('button', { name: '‹ Sounds' }));
  await waitFor(() => expect(screen.getByTestId('ipa-count')).toHaveTextContent(`${opened} of ${sounds.length} sounds opened`));
}

async function opensSounds(ids: string[]): Promise<void> {
  for (const [i, id] of ids.entries()) await opensSound(id, i + 1);
}

// ---- the drill, mirrored ----
let pool: SoundId[] = [];
let state: DrillState;
let round = 1;
let asked: { item: DrillItem; right: boolean }[] = [];
let firstItem: DrillItem;

const optionButtons = (): HTMLElement[] => within(screen.getByTestId('ipa-question')).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));

/** The question the screen should show now, checked against what it shows. */
async function questionShown(): Promise<IpaQuestion> {
  const item = currentQuestion(state)!;
  const q = questionFor(item, state.asked, SEED + round, pool, sounds, scheme);
  await waitFor(() => expect(screen.getByTestId('ipa-prompt')).toHaveTextContent(q.prompt));
  expect(screen.getByTestId('ipa-question').getAttribute('data-direction')).toBe(q.direction);
  expect(optionButtons().map((b) => b.textContent)).toEqual(q.options.map((o) => o.label));
  if (q.direction === 'hear') expect(screen.getByTestId('tap-to-hear')).toBeInTheDocument();
  else expect(screen.getByTestId('ipa-symbol')).toHaveTextContent(q.symbol!);
  return q;
}

/** Picks the right choice, or a wrong one. */
async function pick(right: boolean): Promise<void> {
  const q = await questionShown();
  const choice = right ? q.right : q.options.find((o) => o.id !== q.right)!.id;
  fireEvent.click(optionButtons().find((b) => b.getAttribute('data-sound') === choice)!);
  asked.push({ item: currentQuestion(state)!, right });
  state = answerDrill(state, right);
}
const nextQuestion = async (): Promise<void> => void fireEvent.click(await screen.findByTestId('ipa-next'));
const same = (a: DrillItem, b: DrillItem): boolean => a.sound === b.sound && a.direction === b.direction;

// ---- the pass check, mirrored ----
let checkQuestions: IpaQuestion[] = [];
let checkAt = 0;

async function checkAnswer(right: boolean): Promise<void> {
  const q = checkQuestions[checkAt];
  await waitFor(() => expect(screen.getByTestId('ipa-step')).toHaveTextContent(`Pass check · Question ${checkAt + 1} of ${checkQuestions.length}`));
  await waitFor(() => expect(screen.getByTestId('ipa-prompt')).toHaveTextContent(q.prompt));
  expect(optionButtons().map((b) => b.textContent)).toEqual(q.options.map((o) => o.label));
  const choice = right ? q.right : q.options.find((o) => o.id !== q.right)!.id;
  fireEvent.click(optionButtons().find((b) => b.getAttribute('data-sound') === choice)!);
  expect(screen.queryByTestId('ipa-told')).toBeNull();
  checkAt += 1;
  fireEvent.click(await screen.findByTestId('ipa-next'));
}

const feature = await loadFeature('features/hebrew-ipa-course.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The Hebrew entry shows when he reads Hebrew, and not when he reads Greek only', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', async (_, dial: string) => open(dial));
    Then('the Optional section has the entries {string} and {string}', async (_, a: string, b: string) => {
      await waitFor(async () => expect(await entryNames()).toEqual([a, b]));
    });
    When('Lampas is opened on the Goal screen with his Hebrew dial at {string}', async (_, dial: string) => open(dial));
    Then('the Optional section has the entry {string} alone', async (_, a: string) => {
      expect(await entryNames()).toEqual([a]);
    });
  });

  Scenario('Turning the IPA lesson Off takes both entries away', ({ Given, When, Then }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', async (_, dial: string) => open(dial));
    When('he turns {string} Off', async (_, name: string) => {
      window.location.hash = '#/settings?setting=ipaLesson';
      const group = await screen.findByRole('group', { name });
      await user.click(within(group).getByRole('button', { name: 'Off' }));
      await waitFor(() => expect(within(group).getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true'));
      window.location.hash = '#/goal';
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
    Then('the Goal screen has no Optional section', async () => {
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Optional' })).toBeNull());
      expect(screen.queryByTestId('ipa-entry')).toBeNull();
      expect(screen.queryByTestId('ipa-entry-he')).toBeNull();
      expect((await db.settings.get('ipaLesson'))?.value).toBe('off');
    });
    When('he turns {string} On', async (_, name: string) => {
      window.location.hash = '#/settings?setting=ipaLesson';
      const group = await screen.findByRole('group', { name });
      await user.click(within(group).getByRole('button', { name: 'On' }));
      await waitFor(() => expect(within(group).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true'));
      window.location.hash = '#/goal';
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
    Then('the Optional section has the entries {string} and {string}', async (_, a: string, b: string) => {
      await waitFor(async () => expect(await entryNames()).toEqual([a, b]));
    });
  });

  Scenario('The Hebrew course opens on Why learn it? and says first that it is not needed', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', async (_, dial: string) => open(dial));
    When('he taps the entry {string}', async (_, name: string) => {
      const entry = await screen.findByTestId('ipa-entry-he');
      expect(entry.textContent).toBe(name);
      await user.click(entry);
    });
    Then('{string} shows with the line {string} first', async (_, heading: string, line: string) => {
      const why = await screen.findByTestId('ipa-why');
      expect(within(why).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(why.querySelector('p')!.textContent).toBe(line);
      expect(line).toBe(COURSE_LINE);
      expect(window.location.hash).toBe('#/ipa?lang=he');
      expect(screen.getByRole('heading', { name: 'Learn the IPA sounds of Hebrew', level: 1 })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(screen.getByTestId('ipa-why')).getByRole('button', { name }));
    });
    Then('the Goal screen shows again', async () => {
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
      expect(screen.queryByTestId('ipa-why')).toBeNull();
    });
    And('the Hebrew course has kept nothing, and the Greek course neither', async () => {
      expect(await db.settings.get('ipaCourse.he')).toBeUndefined();
      expect(await db.settings.get('ipaCourse')).toBeUndefined();
    });
  });

  Scenario('A card gives a Hebrew sound its symbol, key word, Hebrew letters and a Hebrew word to hear', ({ Given, When, Then }) => {
    Given('he has opened the Hebrew course and tapped {string}', async () => opensHebrewCourse());
    Then('the course lists every sound the Israeli pronunciation says, none of them opened yet', async () => {
      const list = within(await home()).getByRole('list', { name: 'Sounds' });
      expect(within(list).getAllByRole('listitem').map((li) => li.getAttribute('data-sound'))).toEqual(sounds.map((s) => s.id));
      expect(sounds).toHaveLength(24);
      expect(screen.getByTestId('ipa-count')).toHaveTextContent(`0 of ${sounds.length} sounds opened`);
    });
    When('he opens the sound {string}', async (_, id: string) => {
      await user.click(within(within(await home()).getByRole('list', { name: 'Sounds' })).getAllByRole('listitem').find((li) => li.getAttribute('data-sound') === id)!.querySelector('button')!);
      await screen.findByTestId('ipa-card');
    });
    Then('the card shows the symbol {string}, the key word {string}, the Hebrew letters of that sound drawn right to left and a Hebrew word that has it', (_, symbol: string, key: string) => {
      expect(screen.getByTestId('ipa-card-symbol')).toHaveTextContent(symbol);
      expect(screen.getByTestId('ipa-card-key').textContent).toBe(key);
      const guide = scheme.soundGuide![symbol as SoundId]!;
      const letters = within(screen.getByTestId('ipa-card-letters')).getAllByRole('listitem');
      expect(letters.map((li) => li.textContent)).toEqual([...guide.letters]);
      for (const li of letters) {
        const hebrew = li.querySelector('.script-he');
        expect(hebrew, li.textContent ?? '').not.toBeNull();
        expect(hebrew!.getAttribute('dir')).toBe('rtl');
        expect(hebrew!.getAttribute('lang')).toBe('he');
      }
      const word = screen.getByTestId('ipa-card-word');
      expect(word).toHaveTextContent(guide.word);
      expect(word.querySelector('.script-he')!.getAttribute('dir')).toBe('rtl');
      expect(screen.getByRole('heading', { name: 'Hebrew letters that make it' })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('the Hebrew voice is handed that word', async () => {
      await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
      const said = synth.spoken[synth.spoken.length - 1];
      expect(said.text).toBe(scheme.voiceForm(scheme.soundGuide!['/ʃ/']!.word));
      expect(said.lang).toBe('he-IL');
    });
  });

  Scenario('What he does in the Hebrew course is kept apart from the Greek course', ({ Given, When, Then, And }) => {
    Given('he has opened the Hebrew course and tapped {string}', async () => opensHebrewCourse());
    And('he has opened the sounds {string}, {string} and {string}', async (_, a: string, b: string, c: string) => opensSounds([a, b, c]));
    When('he goes back to the Goal screen and opens the Greek course', async () => {
      await backToGoal();
      await user.click(await screen.findByTestId('ipa-entry'));
    });
    Then('it opens on {string}', async (_, heading: string) => {
      const why = await screen.findByTestId('ipa-why');
      expect(within(why).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/ipa');
    });
    When('he goes back to the Goal screen and opens the Hebrew course again', async () => {
      await backToGoal();
      await user.click(await screen.findByTestId('ipa-entry-he'));
    });
    Then('it opens on the sounds and says {string}', async (_, count: string) => {
      await home();
      expect(screen.queryByTestId('ipa-why')).toBeNull();
      await waitFor(() => expect(screen.getByTestId('ipa-count')).toHaveTextContent(count));
    });
  });

  Scenario('The Hebrew drill asks both ways and a wrong answer comes back until it is right twice', ({ Given, When, Then, And }) => {
    Given('he has opened the Hebrew course and tapped {string}', async () => opensHebrewCourse());
    And('he has opened the sounds {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await opensSounds([a, b, c]);
      pool = [a, b, c] as SoundId[];
    });
    When('he starts the drill', async () => {
      fireEvent.click(await screen.findByTestId('ipa-drill'));
      round = 1;
      asked = [];
      state = startRound(drawRound(pool, () => 0, mulberry32(SEED)));
      firstItem = currentQuestion(state)!;
      await waitFor(() => expect(screen.getByTestId('ipa-step')).toHaveTextContent(`Round 1 · ${state.queue.length} to go`));
    });
    Then('each question is a hear question with symbols to pick, or a see question with key words to pick', async () => {
      const q = await questionShown();
      if (q.direction === 'hear') for (const o of optionButtons()) expect(o.textContent).toMatch(/^\/.+\/$/);
      else for (const o of optionButtons()) expect(o.textContent).not.toMatch(/^\/.+\/$/);
    });
    When('he answers the first question wrong', async () => {
      await pick(false);
    });
    Then('it says {string} and the answer', async (_, said: string) => {
      const told = await screen.findByTestId('ipa-told');
      expect(told.getAttribute('data-result')).toBe('wrong');
      expect(told).toHaveTextContent(said);
      const lesson = sounds.find((s) => s.id === firstItem.sound)!;
      expect(told).toHaveTextContent(lesson.word);
      expect(told).toHaveTextContent(lesson.id);
    });
    When('he goes on, answering every question right, until the first question has been right twice', async () => {
      await nextQuestion();
      for (let guard = 0; guard < 80 && asked.filter((a) => same(a.item, firstItem) && a.right).length < 2; guard += 1) {
        await pick(true);
        await nextQuestion();
      }
    });
    Then('that question was asked wrong, then right, then right', () => {
      expect(asked.filter((a) => same(a.item, firstItem)).map((a) => a.right)).toEqual([false, true, true]);
    });
  });

  Scenario('The Hebrew pass check of every sound both ways passes and offers IPA in the hints', ({ Given, When, Then, And }) => {
    Given('he has opened the Hebrew course and tapped {string}', async () => opensHebrewCourse());
    When('he starts the pass check', async () => {
      fireEvent.click(await screen.findByTestId('ipa-check'));
      checkQuestions = passCheckQuestions(sounds, mulberry32(SEED), scheme);
      checkAt = 0;
      await waitFor(() => expect(screen.getByTestId('ipa-step')).toHaveTextContent(`Pass check · Question 1 of ${checkQuestions.length}`));
    });
    Then('it asks every sound both ways, once each', () => {
      expect(checkQuestions).toHaveLength(sounds.length * 2);
      expect(new Set(checkQuestions.map((q) => `${q.sound}:${q.direction}`)).size).toBe(sounds.length * 2);
    });
    When('he answers every question right', async () => {
      while (checkAt < checkQuestions.length) await checkAnswer(true);
      await screen.findByTestId('ipa-result');
    });
    Then('he is told {string} with {string}', (_, told: string, score: string) => {
      expect(screen.getByTestId('ipa-result').getAttribute('data-result')).toBe('passed');
      expect(screen.getByRole('heading', { name: told })).toBeInTheDocument();
      expect(screen.getByTestId('ipa-score').textContent).toBe(score);
    });
    And('{string} is offered', (_, name: string) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
    And('the Hebrew course is kept as passed, and the Greek course is not', async () => {
      await waitFor(async () => expect((await getIpaProgress('he')).passedAt).toBeTypeOf('number'));
      expect((await getIpaProgress('grc')).passedAt).toBeUndefined();
      expect(chosenAccent().id).toBe('american');
    });
  });

  Scenario('Nothing else names the course', ({ Given, Then, And }) => {
    Given('Lampas is opened on the Goal screen with his Hebrew dial at {string}', async (_, dial: string) => open(dial));
    Then('no other part of the Goal screen mentions the course than its two entries', async () => {
      await screen.findByTestId('ipa-entry-he');
      expect((document.body.textContent ?? '').match(/IPA/g)).toHaveLength(2);
    });
    And('the course is named on no other screen', async () => {
      const screens: [string, string][] = [['#/', ''], ['#/words', 'Words'], ['#/settings', 'Settings'], ...GROUPS.map((g): [string, string] => [`#/settings?group=${g.id}`, g.title]), ['#/path', 'The whole path'], ['#/paradigms', 'Paradigms']];
      for (const [hash, title] of screens) {
        window.location.hash = hash;
        if (title) await screen.findByRole('heading', { name: title, level: 1 });
        else await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
        expect(document.body.textContent, hash).not.toMatch(/IPA sounds/);
      }
    });
  });
});
