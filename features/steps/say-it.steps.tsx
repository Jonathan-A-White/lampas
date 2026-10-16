// features/steps/say-it.steps.tsx — runs features/say-it.feature: Say it in the letter drill (src/LetterDrillScreen.tsx, src/data/grammar/sayIt.ts, mw-86e9r1.12).
// The phone's microphone is bsv-kit's honest one (tests/support/fake-mic.ts) hearing a clip whose words the scenario names; the voice is the honest speech fake.
// The steps fix the drill's seed (letterDrillSeed) to one whose round asks Β as its Say it question, and rebuild each round from it with the same pure functions the screen uses.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { clips } from 'bsv-kit/testing/mic';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { SAY_AT, answerTarget, drawRound, letterDrillSeed, startLetterDrill, type LetterDrillState, type RoundItem } from '../../src/data/grammar/letterDrill';
import { mulberry32 } from '../../src/data/random';
import { getEvidence } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopSpeaking } from '../../src/speech/greek';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { type StubbedMic, stubMic } from '../../tests/support/fake-mic';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  stopSpeaking();
  vi.unstubAllGlobals();
  letterDrillSeed.next = realSeed;
  Object.defineProperty(window.navigator, 'permissions', { configurable: true, value: undefined });
  db.close();
});

const realSeed = letterDrillSeed.next;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 10, clientY: 10 };
let fake: FakePostern;
let mic: StubbedMic | undefined;
let synth: FakeSynth;
let state: LetterDrillState;
let round: RoundItem[] = [];
/** what the scenario's phone does about hearing him */
type Hearing = { kind: 'hears'; words: string } | { kind: 'permission-denied' } | { kind: 'refuses' } | { kind: 'none' };

/** The first seed whose first round asks `glyph` as its Say it question. */
function seedAsking(glyph: string): number {
  for (let seed = 1; seed < 5000; seed += 1) {
    const say = drawRound(startLetterDrill(), mulberry32(seed), undefined, true).find((r) => r.mode === 'say');
    if (say?.question.right === glyph) return seed;
  }
  throw new Error(`no seed asks ${glyph} as Say it`);
}

async function open(goal: string, hearing: Hearing, glyph: string): Promise<void> {
  cleanup();
  stopReading();
  stopSpeaking();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  Object.defineProperty(window.navigator, 'permissions', { configurable: true, value: undefined });
  tutorTimings.pollMs = 20;
  const seed = seedAsking(glyph);
  letterDrillSeed.next = () => seed;
  state = startLetterDrill();
  round = [];
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  mic = undefined;
  if (hearing.kind === 'hears') mic = stubMic({ clip: { ...clips.english, transcript: hearing.words } });
  if (hearing.kind === 'refuses') mic = stubMic({ denied: true });
  if (hearing.kind === 'permission-denied') {
    mic = stubMic();
    Object.defineProperty(window.navigator, 'permissions', { configurable: true, value: { query: () => Promise.resolve({ state: 'denied' }) } });
  }
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

const slidesTo = (label: string): void =>
  void fireEvent.change(within(ideaSheet()).getByRole('slider', { name: 'Your level' }), { target: { value: String(['Not yet', 'Learning', 'I know it'].indexOf(label)) } });

/** The drill has opened: its first round is the one the seed gives, with Say it in it only where the phone can hear him. */
async function drillOpens(withSay: boolean): Promise<void> {
  await screen.findByRole('dialog', { name: 'Letter drill' });
  await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent('Round 1'));
  state = startLetterDrill();
  round = drawRound(state, mulberry32(letterDrillSeed.next()), undefined, withSay);
}

/** Answers the choice question on screen (checked against the seed's round) and taps Next. */
async function answerQuestion(index: number, total: number): Promise<void> {
  const item = round[index];
  const dialog = drillDialog();
  await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent(`Question ${index + 1} of ${total}`));
  await waitFor(() => expect(within(dialog).getByTestId('grammar-prompt')).toHaveTextContent(item.question.prompt));
  const options = within(dialog).getAllByRole('button').filter((b) => b.hasAttribute('data-option'));
  expect(options.map((o) => o.textContent)).toEqual(item.question.options);
  fireEvent.click(options.find((o) => o.textContent === item.question.right)!);
  state = answerTarget(state, item.target, true);
  fireEvent.click(await within(dialog).findByTestId('letter-next'));
}

const sayItem = (): RoundItem => round[SAY_AT];
const sayCard = () => within(drillDialog()).getByTestId('say-card');
const sayBar = () => within(drillDialog()).getByRole('button', { name: 'Hold and say it' });

/** Holds the bar while the phone's microphone takes `ms`, lets go. */
async function holdsBar(ms: number): Promise<void> {
  const bar = sayBar();
  await user.pointer({ keys: '[MouseLeft>]', target: bar, coords: AT });
  act(() => mic?.advance(ms));
  // a refused microphone takes the bar away before he lets go
  if (bar.isConnected) await user.pointer({ keys: '[/MouseLeft]', target: bar, coords: AT });
}

const feature = await loadFeature('features/say-it.feature');

describeFeature(feature, ({ Scenario }) => {
  const OPEN = 'he opens the idea sheet of {string} from the Goal screen';
  const SLIDE = 'he slides {string} to {string}';
  const opensAlphabet = (_: unknown, id: string) => opensIdeaFromGoal(id);
  const slides = (_: unknown, _name: string, label: string) => slidesTo(label);
  const before = async () => {
    await drillOpens(true);
    expect(sayItem().mode).toBe('say');
    for (let i = 0; i < SAY_AT; i += 1) await answerQuestion(i, round.length);
  };
  const noSay = async () => {
    await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
    await drillOpens(false);
    expect(round).toHaveLength(8);
    for (let i = 0; i < round.length; i += 1) {
      expect(within(drillDialog()).queryByTestId('say-card')).toBeNull();
      expect(within(drillDialog()).queryByRole('button', { name: 'Hold and say it' })).toBeNull();
      await answerQuestion(i, round.length);
    }
    await within(drillDialog()).findByTestId('letter-round-result');
    expect(within(drillDialog()).getByTestId('letter-round-result')).toHaveTextContent('8 of 8 right');
  };
  const shows = async (_: unknown, glyph: string) => {
    const card = await within(drillDialog()).findByTestId('say-card');
    await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent(`Question ${SAY_AT + 1} of 8`));
    expect(within(card).getByTestId('say-letter')).toHaveTextContent(glyph);
    expect(within(card).getByTestId('say-letter')).toHaveAttribute('lang', 'grc');
    expect(sayBar()).toBeInTheDocument();
  };
  const holdsUntilHeard = async () => holdsBar(mic!.honest.clip.durationMs + 1000);
  const roundResult = async (score: string) => {
    await within(drillDialog()).findByTestId('letter-round-result');
    expect(within(drillDialog()).getByTestId('letter-round-result')).toHaveTextContent(score);
  };
  const counted = async (right: boolean, id: string) => {
    const evidence = (await getEvidence()).get(id);
    if (right) expect(evidence?.run).toBeGreaterThanOrEqual(1);
    else expect(evidence?.misses).toBeGreaterThanOrEqual(1);
  };

  Scenario('Saying the name of the letter is right', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, a microphone that hears {string} and a letter drill that asks {string} as its Say it question', (_, goal: string, words: string, glyph: string) =>
      open(goal, { kind: 'hears', words }, glyph),
    );
    When(OPEN, opensAlphabet);
    And(SLIDE, slides);
    And('he answers the questions before the Say it question right', before);
    Then('the Say it question shows {string} and asks him to say it', shows);
    When('he holds the bar until the phone has heard him and lets go', holdsUntilHeard);
    Then('Say it says he was right and what it heard was {string}', async (_, heard: string) => {
      const result = await within(sayCard()).findByTestId('say-result');
      expect(result).toHaveAttribute('data-result', 'right');
      expect(result).toHaveTextContent('Right');
      expect(within(sayCard()).getByTestId('say-heard')).toHaveTextContent(heard);
    });
    And('{string} is counted right in the round', async () => {
      fireEvent.click(await within(drillDialog()).findByTestId('letter-next'));
      state = answerTarget(state, sayItem().target, true);
      for (let i = SAY_AT + 1; i < round.length; i += 1) await answerQuestion(i, round.length);
      await roundResult('8 of 8 right');
    });
    And('the letter {string} has one more right use', async (_, id: string) => counted(true, id));
  });

  Scenario('Saying another letter is a miss that plays the right sound', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, a microphone that hears {string} and a letter drill that asks {string} as its Say it question', (_, goal: string, words: string, glyph: string) =>
      open(goal, { kind: 'hears', words }, glyph),
    );
    When(OPEN, opensAlphabet);
    And(SLIDE, slides);
    And('he answers the questions before the Say it question right', before);
    Then('the Say it question shows {string} and asks him to say it', shows);
    When('he holds the bar until the phone has heard him and lets go', holdsUntilHeard);
    Then('Say it says he was not right, shows the right answer {string} and what it heard was {string}', async (_, answer: string, heard: string) => {
      const result = await within(sayCard()).findByTestId('say-result');
      expect(result).toHaveAttribute('data-result', 'wrong');
      expect(result).toHaveTextContent('Not quite');
      expect(within(sayCard()).getByTestId('say-answer')).toHaveTextContent(answer);
      expect(within(sayCard()).getByTestId('say-heard')).toHaveTextContent(heard);
    });
    And('the voice says the sound of {string}', async (_, letter: string) => {
      await waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain(letter));
      expect(synth.spoken.at(-1)?.lang).toBe('el-GR');
    });
    And('{string} is not counted right in the round', async () => {
      fireEvent.click(await within(drillDialog()).findByTestId('letter-next'));
      state = answerTarget(state, sayItem().target, false);
      for (let i = SAY_AT + 1; i < round.length; i += 1) await answerQuestion(i, round.length);
      await roundResult('7 of 8 right');
    });
    And('the letter {string} is counted against', async (_, id: string) => counted(false, id));
  });

  Scenario('With the microphone denied no Say it question appears', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, the microphone permission denied and a letter drill that asks {string} as its Say it question', (_, goal: string, glyph: string) =>
      open(goal, { kind: 'permission-denied' }, glyph),
    );
    When(OPEN, opensAlphabet);
    And(SLIDE, slides);
    Then('the letter drill opens on a round of 8 questions', async () => {
      await screen.findByRole('dialog', { name: 'Letter drill' });
      await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
    });
    And('no question of the round is a Say it question', noSay);
  });

  Scenario('A phone that cannot turn speech into text is never asked to', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, no speech recognition and a letter drill that asks {string} as its Say it question', (_, goal: string, glyph: string) =>
      open(goal, { kind: 'none' }, glyph),
    );
    When(OPEN, opensAlphabet);
    And(SLIDE, slides);
    Then('the letter drill opens on a round of 8 questions', async () => {
      await screen.findByRole('dialog', { name: 'Letter drill' });
      await waitFor(() => expect(within(drillDialog()).getByTestId('letter-drill-step')).toHaveTextContent('Round 1 · Question 1 of 8'));
    });
    And('no question of the round is a Say it question', noSay);
  });

  Scenario('A microphone refused at the bar skips Say it and counts nothing against him', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with the goal {string}, a microphone the phone refuses and a letter drill that asks {string} as its Say it question', (_, goal: string, glyph: string) =>
      open(goal, { kind: 'refuses' }, glyph),
    );
    When(OPEN, opensAlphabet);
    And(SLIDE, slides);
    And('he answers the questions before the Say it question right', before);
    And('he holds the bar until the phone has answered and lets go', () => holdsBar(1000));
    Then('the Say it questions are left out of the round and the drill says why', async () => {
      const dialog = drillDialog();
      expect(await within(dialog).findByTestId('say-skipped')).toHaveTextContent('microphone');
      round = round.filter((r) => r.mode !== 'say');
      expect(round).toHaveLength(7);
      await waitFor(() => expect(within(dialog).getByTestId('letter-drill-step')).toHaveTextContent('Question 3 of 7'));
      expect(within(dialog).queryByTestId('say-card')).toBeNull();
    });
    And('the letter {string} is not counted against', async (_, id: string) => {
      expect((await getEvidence()).get(id)?.misses ?? 0).toBe(0);
    });
    And('he answers the rest of the round right', async () => {
      for (let i = SAY_AT; i < round.length; i += 1) await answerQuestion(i, round.length);
    });
    Then('the round says {string}', async (_, score: string) => roundResult(score));
  });
});
