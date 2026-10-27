// features/steps/hebrew-letters.steps.tsx — runs features/hebrew-letters.feature: the Hebrew letters on the Goal (Learn next, Alef's sheet and Hear it), the letter drill over the 27 glyphs, Drill it on
// Alef to Proved, the Greek letter drill as it was and no Hebrew letter at Greek only. The steps fix the seeds (letterDrillSeed, drillSeed) and rebuild each round or find each question with the same pure
// functions the screens use, so they know which option is right. Speech is the recording fake (tests/support/fake-speech.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { HEBREW_GLYPHS } from '../../src/data/grammar/hebrew/letters';
import { ideaOf } from '../../src/data/grammar/ladder';
import { GREEK_SET, HEBREW_SET, answerTarget, drawRound, isComplete, letterDrillSeed, startLetterDrill, type LetterDrillState, type LetterSet, type RoundItem } from '../../src/data/grammar/letterDrill';
import { mulberry32, type Random } from '../../src/data/random';
import { setGoal } from '../../src/data/repositories/settings';
import { setLanguages, teachIdea } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import type { Languages } from '../../src/settings/definitions/interest';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, HEBREW_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

const realLetterSeed = letterDrillSeed.next;
const realDrillSeed = drillSeed.next;
afterAll(() => {
  cleanup();
  clearBus();
  stopReading();
  vi.unstubAllGlobals();
  letterDrillSeed.next = realLetterSeed;
  drillSeed.next = realDrillSeed;
  db.close();
});

const SEED = 7;
const user = userEvent.setup();
Element.prototype.scrollIntoView = () => {};

let synth: FakeSynth;
let state: LetterDrillState;
let random: Random;
let round: RoundItem[] = [];
let roundNumber = 0;
let set: LetterSet = HEBREW_SET;
let askedForms = new Set<string>();
/** the chapters Drill it may have drawn its words from: none (the fixed words) or a Hebrew chapter */
let passages: Chapter[][] = [[]];
let askedWord = false;

async function fresh(languages: Languages, goal?: string): Promise<void> {
  cleanup();
  clearBus();
  stopReading();
  forgetTrail();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  synth = stubSpeech([HEBREW_VOICE, ENGLISH_VOICE]);
  stubChapterFetch();
  letterDrillSeed.next = () => SEED;
  drillSeed.next = () => SEED;
  askedForms = new Set();
  askedWord = false;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear(), db.drillRuns.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setLanguages(languages);
  if (goal !== undefined) await setGoal(goal);
  passages = [[], [await loadChapter('gen', 1)], [await loadChapter('jon', 1)]];
}

async function openGoal(): Promise<void> {
  window.history.replaceState(null, '', '/#/goal');
  await seedHisWords();
  render(<App />);
}

const hebrewList = () => screen.findByTestId('hebrew-ideas');
const hebrewRow = async (title: string) => within(await hebrewList()).getByText(title).closest('li') as HTMLElement;
const sheet = () => screen.findByRole('dialog', { name: 'Idea' });
const drillDialog = () => screen.getByRole('dialog', { name: 'Letter drill' });
const learnNext = () => screen.findByTestId('learn-next');

async function openHebrewIdea(title: string): Promise<HTMLElement> {
  await user.click(within(await hebrewRow(title)).getByRole('button'));
  return sheet();
}

function slideTo(dialog: HTMLElement, label: string): void {
  fireEvent.change(within(dialog).getByRole('slider', { name: 'Your level' }), { target: { value: String(['Not yet', 'Learning', 'I know it'].indexOf(label)) } });
}

async function openGreekAlphabet(): Promise<HTMLElement> {
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf('alphabet').title }));
  const dialog = await sheet();
  await waitFor(() => expect(within(dialog).queryByTestId('idea-loading')).toBeNull());
  return dialog;
}

/** The drill has just opened: its first round is the one the seed gives, in the set of the language. */
async function drillOpens(of: LetterSet): Promise<void> {
  await screen.findByRole('dialog', { name: 'Letter drill' });
  set = of;
  state = startLetterDrill();
  random = mulberry32(SEED);
  round = drawRound(state, random, undefined, false, set);
  roundNumber = 1;
}

async function answerQuestion(index: number, right: boolean): Promise<void> {
  const item = round[index];
  const dialog = drillDialog();
  await waitFor(() => expect(within(dialog).getByTestId('grammar-prompt')).toHaveTextContent(item.question.prompt));
  await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent(`Round ${roundNumber} · Question ${index + 1} of 8`));
  const options = within(dialog).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));
  expect(options.map((o) => o.textContent)).toEqual(item.question.options);
  askedForms.add(item.target.form);
  if (set === HEBREW_SET) for (const option of options) expect(option.getAttribute('lang'), option.textContent ?? '').toBe('he');
  const wrong = item.question.options.find((o) => o !== item.question.right)!;
  fireEvent.click(options.find((o) => o.textContent === (right ? item.question.right : wrong))!);
  state = answerTarget(state, item.target, right);
  fireEvent.click(await within(dialog).findByTestId('letter-next'));
}

async function answerRound(): Promise<void> {
  for (let i = 0; i < round.length; i += 1) await answerQuestion(i, true);
  await within(drillDialog()).findByTestId('letter-round-result');
}

// ---- Drill it ----

const drillItDialog = () => screen.getByRole('dialog', { name: 'Drill it' });

function questionOnScreen(ideaId: string) {
  const dialog = drillItDialog();
  const prompt = within(dialog).getByTestId('grammar-prompt').textContent ?? '';
  const form = within(dialog).queryByTestId('grammar-form')?.textContent ?? '';
  const options = Array.from(dialog.querySelectorAll('[data-option]')).map((o) => o.textContent ?? '');
  for (const passage of passages) {
    const found = drillSteps(ideaId, { passage, seed: SEED })
      .flatMap((s) => s.questions)
      .find((q) => q.prompt === prompt && (q.form ?? '') === form && q.options.join('|') === options.join('|'));
    if (found) return found;
  }
  throw new Error(`question not among the steps: ${prompt} / ${form} / ${options.join(', ')}`);
}

const feature = await loadFeature('features/hebrew-letters.feature');

describeFeature(feature, ({ Scenario }) => {
  const hebrewGoal = async () => {
    await fresh('hebrew');
    await openGoal();
  };

  Scenario('Learn next offers the Hebrew alphabet and then Alef', ({ Given, When, Then }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', hebrewGoal);
    Then('Learn next on the Goal is {string}', async (_, title: string) => {
      await waitFor(async () => expect(await learnNext()).toHaveTextContent(`Learn next: ${title}`));
    });
    When('he opens {string} and marks it known without a drill', async (_, title: string) => {
      const dialog = await openHebrewIdea(title);
      await user.click(await within(dialog).findByRole('button', { name: 'Mark known without a drill' }));
    });
    Then('Learn next on the Goal has moved on to {string}', async (_, title: string) => {
      await waitFor(async () => expect(await learnNext()).toHaveTextContent(`Learn next: ${title}`));
    });
  });

  Scenario("Alef's sheet teaches it and Hear it speaks Hebrew", ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen, the Hebrew alphabet is known and the Goal screen is open', async () => {
      await fresh('hebrew');
      await teachIdea('he-alphabet', 'known');
      await openGoal();
    });
    When('he taps Learn next', async () => {
      await user.click(await learnNext());
    });
    Then('the sheet is {string} and shows the letter {string} right to left in lang he', async (_, title: string, letter: string) => {
      const dialog = await sheet();
      expect(within(dialog).getByRole('heading', { name: title })).toBeInTheDocument();
      const worked = within(dialog).getByTestId('worked-word');
      expect(worked).toHaveAttribute('lang', 'he');
      expect(worked).toHaveAttribute('dir', 'rtl');
      expect(within(dialog).getByTestId('idea-what')).toHaveTextContent(letter);
      const hebrew = within(dialog).getByTestId('idea-what').querySelector('[lang="he"]');
      expect(hebrew).toHaveAttribute('dir', 'rtl');
    });
    And("the sheet says how Alef sounds in the Israeli scheme", async () => {
      const sounds = within(await sheet()).getByTestId('idea-sounds');
      expect(sounds).toHaveTextContent('Israeli');
      expect(sounds).toHaveTextContent('nothing: it holds a vowel');
    });
    And("the sheet's card says what the letter is without naming a sound", async () => {
      const what = within(await sheet()).getByTestId('idea-what');
      expect(what).toHaveTextContent('Alef is a letter of the Hebrew alphabet');
      expect(what.textContent).not.toMatch(/\bsounds?\b|pronounc/i);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(await sheet()).getByRole('button', { name }));
    });
    Then('the phone is asked to say {string} in the Hebrew voice', async (_, text: string) => {
      await waitFor(() => expect(synth.spoken.at(-1)?.text).toBe(text));
      expect(synth.spoken.at(-1)?.lang).toBe('he-IL');
    });
  });

  Scenario('The letter drill in Hebrew runs over the 27 glyphs to its end', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', hebrewGoal);
    When('he opens {string} and slides {string} to {string}', async (_, title: string, _name: string, label: string) => {
      slideTo(await openHebrewIdea(title), label);
    });
    Then('the letter drill opens on a round of 8 questions', async () => {
      await drillOpens(HEBREW_SET);
      expect(round).toHaveLength(8);
      const dialog = drillDialog();
      expect(within(dialog).getByRole('heading', { name: 'The Hebrew alphabet' })).toBeInTheDocument();
      await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
    });
    And('its glyphs are drawn right to left in the Hebrew face', () => {
      const options = within(drillDialog()).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));
      expect(options).toHaveLength(4);
      for (const option of options) {
        expect(option).toHaveAttribute('lang', 'he');
        expect(option).toHaveAttribute('dir', 'rtl');
        expect(option).toHaveClass('script-he');
        expect(HEBREW_GLYPHS).toContain(option.textContent);
      }
    });
    When('he goes on in rounds, answering every question right, until the drill is complete', async () => {
      for (let guard = 0; guard < 12; guard += 1) {
        await answerRound();
        if (isComplete(state, set)) return;
        fireEvent.click(await within(drillDialog()).findByRole('button', { name: 'Another round' }));
        roundNumber += 1;
        round = drawRound(state, random, undefined, false, set);
      }
      throw new Error('the drill did not complete');
    });
    Then('the drill says every letter is right, and {string}', async (_, text: string) => {
      const dialog = drillDialog();
      expect(await within(dialog).findByTestId('letter-progress')).toHaveTextContent(text);
      expect(dialog).toHaveTextContent('Every letter is right, and every final form.');
      expect(within(dialog).queryByRole('button', { name: 'Another round' })).toBeNull();
    });
    And('the drill asked the 22 letters and the 5 final forms', () => {
      expect([...askedForms].sort()).toEqual(['final', 'small']);
      expect(HEBREW_SET.targets.filter((t) => t.form === 'final')).toHaveLength(5);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(drillDialog()).getByRole('button', { name }));
    });
    Then('the letter drill is closed and {string} is at the frontier', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Letter drill' })).toBeNull());
      await waitFor(() => expect(screen.getByTestId('idea-level')).toHaveTextContent('Frontier'));
      expect(within(await sheet()).getByRole('heading', { name: title })).toBeInTheDocument();
    });
  });

  Scenario('Drill it on Alef asks its name, a word that holds it and runs to Proved', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen, the Hebrew alphabet is known and the Goal screen is open', async () => {
      await fresh('hebrew');
      await teachIdea('he-alphabet', 'known');
      await openGoal();
    });
    When('he opens {string} and taps {string}', async (_, title: string, name: string) => {
      const dialog = await openHebrewIdea(title);
      const button = await within(dialog).findByRole('button', { name });
      await waitFor(() => expect(button).toBeEnabled());
      await user.click(button);
    });
    Then('Drill it asks {string} first', async (_, prompt: string) => {
      await screen.findByRole('dialog', { name: 'Drill it' });
      expect(within(drillItDialog()).getByTestId('grammar-prompt')).toHaveTextContent(prompt);
      expect(within(drillItDialog()).getByTestId('grammar-form')).toHaveAttribute('lang', 'he');
    });
    When('he answers every question right until Drill it ends', async () => {
      for (let guard = 0; guard < 40; guard += 1) {
        if (within(drillItDialog()).queryByTestId('drill-result')) return;
        const q = questionOnScreen('he-letter-alef');
        if (q.prompt.startsWith('Which of these words')) askedWord = true;
        const button = Array.from(drillItDialog().querySelectorAll<HTMLButtonElement>('[data-option]')).find((b) => b.textContent === q.right && !b.disabled);
        if (!button) throw new Error(`no answer ${q.right} to tap`);
        await user.click(button);
        await user.click(await within(drillItDialog()).findByTestId('drill-next'));
      }
      throw new Error('Drill it did not end');
    });
    Then('Drill it says {string}', async (_, headline: string) => {
      expect(await within(drillItDialog()).findByRole('heading', { name: headline })).toBeInTheDocument();
    });
    And('a question asked a word that holds the letter, and {string} has the level solid and no review row', async (_, id: string) => {
      expect(askedWord).toBe(true);
      await waitFor(async () => expect((await db.grammarLevels.get(id))?.level).toBe('solid'));
      expect(await db.reviews.count()).toBe(0);
    });
  });

  const greekGoal = async (_: unknown, goal: string) => {
    await fresh('greek', goal);
    await openGoal();
  };

  Scenario('The Greek letter drill is as it was', ({ Given, When, Then }) => {
    Given('Greek is the only language chosen, the goal is {string} and the Goal screen is open', greekGoal);
    When('he opens the idea sheet of {string} and slides {string} to {string}', async (_, _title: string, _name: string, label: string) => {
      slideTo(await openGreekAlphabet(), label);
    });
    Then('the letter drill opens on a round of 8 questions and none of it is Hebrew', async () => {
      await drillOpens(GREEK_SET);
      expect(round).toHaveLength(8);
      await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
      expect(drillDialog().textContent).not.toMatch(/[֐-׿]/);
      expect(drillDialog().querySelector('[lang="he"]')).toBeNull();
    });
    When('he answers the whole round right', () => answerRound());
    Then('the round says {string} and {string}', async (_, a: string, b: string) => {
      const result = await within(drillDialog()).findByTestId('letter-round-result');
      expect(result).toHaveTextContent(a);
      expect(within(drillDialog()).getByTestId('letter-progress')).toHaveTextContent(b);
    });
  });

  Scenario('With Greek only no Hebrew letter is anywhere', ({ Given, When, Then }) => {
    Given('Greek is the only language chosen, the goal is {string} and the Goal screen is open', greekGoal);
    Then('the Goal shows no Hebrew letter and no Hebrew idea', async () => {
      await screen.findByTestId('goal-title');
      expect(screen.queryByTestId('hebrew-ideas')).toBeNull();
      expect(screen.queryByText('Alef')).toBeNull();
      expect(document.body.textContent).not.toMatch(/[֐-׿]/);
    });
    When('he opens the idea sheet of {string} from the Goal list', async () => {
      await openGreekAlphabet();
    });
    Then('the sheet shows no Hebrew letter', async () => {
      const dialog = await sheet();
      expect(dialog.querySelector('[lang="he"]')).toBeNull();
      expect(dialog.textContent).not.toMatch(/[֐-׿]/);
    });
  });
});
