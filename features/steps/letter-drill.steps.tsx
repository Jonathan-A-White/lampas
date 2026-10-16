// features/steps/letter-drill.steps.tsx — runs features/letter-drill.feature: Got it (Learning) on The Greek alphabet starts the letter drill (src/LetterDrillScreen.tsx).
// The steps fix the drill's seed (letterDrillSeed) and rebuild each round from it with the same pure functions the screen uses, so they know which option is right.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { DRILL_RUN_CAP, LETTER_IDS } from '../../src/data/grammar/inference';
import { ideaOf } from '../../src/data/grammar/ladder';
import { TARGETS, answerTarget, drawRound, isComplete, letterDrillSeed, startLetterDrill, type LetterDrillState, type RoundItem } from '../../src/data/grammar/letterDrill';
import { mulberry32, type Random } from '../../src/data/random';
import { getEvidence, getLevel } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  letterDrillSeed.next = realSeed;
  db.close();
});

const realSeed = letterDrillSeed.next;
const SEED = 7;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
/** The drill as the screen has it: rebuilt from the same seed with the same functions. */
let state: LetterDrillState;
let random: Random;
let round: RoundItem[] = [];
let roundNumber = 0;
/** Every question the screen showed in the scenario: its mode and the form it asked. */
let asked: { mode: string; form: string; prompt: string }[] = [];

async function open(goal: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  letterDrillSeed.next = () => SEED;
  asked = [];
  roundNumber = 0;
  fake = makeFakePostern();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  await db.settings.put({ key: 'goal', value: goal });
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const ideaSheet = () => screen.getByRole('dialog', { name: 'Idea' });
const drillDialog = () => screen.getByRole('dialog', { name: 'Letter drill' });

async function opensIdeaFromGoal(id: string): Promise<void> {
  window.location.hash = '#/goal';
  await user.click(await screen.findByTestId('ideas-bar'));
  await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
  await screen.findByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
}

async function slidesTo(label: string): Promise<void> {
  fireEvent.change(within(ideaSheet()).getByRole('slider', { name: 'Your level' }), { target: { value: String(['Not yet', 'Learning', 'I know it'].indexOf(label)) } });
}

/** The drill has just opened: its first round is the one the seed gives. */
async function drillOpens(): Promise<void> {
  await screen.findByRole('dialog', { name: 'Letter drill' });
  state = startLetterDrill();
  random = mulberry32(SEED);
  round = drawRound(state, random);
  roundNumber = 1;
}

/** Answers the question on screen, checks it is the one the seed gives, taps Next. */
async function answerQuestion(index: number, right: boolean): Promise<void> {
  const item = round[index];
  const dialog = drillDialog();
  await waitFor(() => expect(within(dialog).getByTestId('grammar-prompt')).toHaveTextContent(item.question.prompt));
  await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent(`Round ${roundNumber} · Question ${index + 1} of 8`));
  expect(within(dialog).getByTestId('grammar-prompt').getAttribute('data-kind')).toBe(item.mode === 'hear' ? 'sound' : 'letter');
  const options = within(dialog).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));
  expect(options.map((o) => o.textContent)).toEqual(item.question.options);
  asked.push({ mode: item.mode, form: item.target.form, prompt: item.question.prompt });
  const wrong = item.question.options.find((o) => o !== item.question.right)!;
  // fireEvent, not user-event: a drill is some forty questions and each pointer sequence costs a loaded host real time
  fireEvent.click(options.find((o) => o.textContent === (right ? item.question.right : wrong))!);
  state = answerTarget(state, item.target, right);
  fireEvent.click(await within(dialog).findByTestId('letter-next'));
}

/** Answers the round on screen, every question right except those in `wrongAt`; the screen then shows the round's end. */
async function answerRound(wrongAt: readonly number[] = []): Promise<void> {
  for (let i = 0; i < round.length; i += 1) await answerQuestion(i, !wrongAt.includes(i));
  await within(drillDialog()).findByTestId('letter-round-result');
}

const feature = await loadFeature('features/letter-drill.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'Lampas is opened on Romans 8 with the goal {string} and no idea level';
  const opensAlphabet = (_: unknown, id: string) => opensIdeaFromGoal(id);
  const closed = async () => {
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Letter drill' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Idea' })).toBeInTheDocument();
  };

  Scenario('A beginner drills the letters after Got it', ({ Given, When, Then, And }) => {
    Given(GIVEN, (_, goal: string) => open(goal));
    When('he opens the idea sheet of {string} from the Goal screen', opensAlphabet);
    And('he slides {string} to {string}', async (_, _name: string, label: string) => slidesTo(label));
    Then('the letter drill opens on a round of 8 questions', async () => {
      await drillOpens();
      expect(round).toHaveLength(8);
      const dialog = drillDialog();
      expect(within(dialog).getByRole('heading', { name: 'The Greek alphabet' })).toBeInTheDocument();
      await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
    });
    When('he answers the whole round right', () => answerRound());
    Then('the round ends on {string} and {string}', (_, a: string, b: string) => {
      const dialog = drillDialog();
      expect(within(dialog).getByRole('button', { name: a })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: b })).toBeInTheDocument();
    });
    And('the round says {string} and {string}', (_, score: string, total: string) => {
      const result = within(drillDialog()).getByTestId('letter-round-result');
      expect(result).toHaveTextContent(score);
      expect(result).toHaveTextContent(total);
    });
    When('he goes on in rounds, answering every question right, until the drill is complete', async () => {
      for (let guard = 0; !isComplete(state); guard += 1) {
        expect(guard).toBeLessThan(12);
        await user.click(within(drillDialog()).getByRole('button', { name: 'Another round' }));
        roundNumber += 1;
        round = drawRound(state, random);
        await answerRound();
      }
    });
    Then('every question was heard or named', () => {
      expect(asked.length).toBeGreaterThanOrEqual(TARGETS.length);
      for (const { mode, prompt } of asked) {
        if (mode === 'hear') expect(prompt).toBe('Tap to hear a letter, then tap it');
        else expect(prompt).toMatch(/^Which (capital )?letter is [A-Z][a-z]+\?$/);
      }
      expect(new Set(asked.map((a) => a.mode))).toEqual(new Set(['hear', 'name']));
    });
    And('both the small and the capital forms were asked', () => {
      expect(new Set(asked.map((a) => a.form))).toEqual(new Set(['small', 'capital']));
      expect(asked.some((a) => a.prompt === 'Which letter is Beta?' || /^Which letter is [A-Z][a-z]+\?$/.test(a.prompt))).toBe(true);
    });
    And('the drill says every letter is right in both forms, and offers only {string}', (_, done: string) => {
      const dialog = drillDialog();
      expect(within(dialog).getByTestId('letter-progress')).toHaveTextContent('48 of 48 right so far');
      expect(within(dialog).getByTestId('letter-round-result')).toHaveTextContent('Every letter is right, small and capital.');
      expect(within(dialog).queryByRole('button', { name: 'Another round' })).toBeNull();
      expect(within(dialog).getByRole('button', { name: done })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(drillDialog()).getByRole('button', { name: label }));
    });
    Then('the letter drill is closed and the idea sheet shows', closed);
    And('{string} is still at the frontier and no letter is solid', async (_, title: string) => {
      expect(within(ideaSheet()).getByRole('heading', { name: title })).toBeInTheDocument();
      expect(await getLevel('alphabet')).toMatchObject({ level: 'frontier' });
      for (const id of LETTER_IDS) expect((await getLevel(id))?.level).not.toBe('solid');
    });
    And('every letter has been credited', async () => {
      const evidence = await getEvidence();
      for (const id of LETTER_IDS) expect(evidence.get(id), id).toEqual({ run: DRILL_RUN_CAP, misses: 0 });
    });
  });

  Scenario('A letter missed comes back', ({ Given, When, Then, And }) => {
    Given(GIVEN, (_, goal: string) => open(goal));
    When('he opens the idea sheet of {string} from the Goal screen', opensAlphabet);
    And('he slides {string} to {string}', async (_, _name: string, label: string) => slidesTo(label));
    And('he answers the first question wrong and the rest of the round right', async () => {
      await drillOpens();
      await answerRound([0]);
    });
    Then('the round says {string} and {string}', (_, score: string, total: string) => {
      const result = within(drillDialog()).getByTestId('letter-round-result');
      expect(result).toHaveTextContent(score);
      expect(result).toHaveTextContent(total);
    });
    And('{string} is offered', (_, label: string) => {
      expect(within(drillDialog()).getByRole('button', { name: label })).toBeInTheDocument();
    });
    When('he starts another round', async () => {
      await user.click(within(drillDialog()).getByRole('button', { name: 'Another round' }));
      roundNumber += 1;
    });
    Then('the missed letter is asked again', async () => {
      const missed = asked[0];
      const item = round[0];
      const next = drawRound(state, random);
      round = next;
      const again = round.find((r) => r.target.letter === item.target.letter && r.target.form === item.target.form);
      expect(again, `${item.target.letter} ${missed.form}`).toBeDefined();
      // the first question on screen is the first of the round the seed gives
      await waitFor(() => expect(within(drillDialog()).getByTestId('grammar-prompt')).toHaveTextContent(round[0].question.prompt));
    });
  });

  Scenario('Stop leaves the drill for the idea sheet', ({ Given, When, Then, And }) => {
    Given(GIVEN, (_, goal: string) => open(goal));
    When('he opens the idea sheet of {string} from the Goal screen', opensAlphabet);
    And('he slides {string} to {string}', async (_, _name: string, label: string) => slidesTo(label));
    And('he taps {string}', async (_, label: string) => {
      await screen.findByRole('dialog', { name: 'Letter drill' });
      await user.click(within(drillDialog()).getByRole('button', { name: label }));
    });
    Then('the letter drill is closed and the idea sheet shows', closed);
  });
});
