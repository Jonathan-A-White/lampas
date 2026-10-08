// features/steps/drill.steps.tsx — runs features/drill.feature: the Parsing drill on Romans 8 (src/DrillScreen.tsx), its
// steps and choices, the two links to the tutor, and the results kept in Dexie. The chapter comes from disk; the right
// choice of a step is found from the word's RP code with the same builder the app uses.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { buildSteps } from '../../src/data/drill';
import { mulberry32 } from '../../src/data/quiz';
import { listDrillResults } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const rom8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

afterAll(() => {
  cleanup();
  stopReading();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();

interface Asked {
  lemma: string;
  /** the step ids asked, in order */
  steps: string[];
}

/** The questions answered so far in the scenario, and the steps answered in the one on screen. */
let asked: Asked[] = [];
let answeredSteps = 0;

async function openLampasFresh(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.results.clear(), db.drills.clear()]);
  window.localStorage.clear();
  window.location.hash = '';
  asked = [];
  answeredSteps = 0;
  render(<App newRandom={() => mulberry32(7)} />);
}

async function openDrill(): Promise<void> {
  // The Test button is in the Words header, which the Reader's Settings opens.
  if (!screen.queryByRole('button', { name: 'Test' })) {
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Words' }));
  }
  await user.click(await screen.findByRole('button', { name: 'Test' }));
  await user.click(await screen.findByRole('button', { name: 'Parsing drill: Romans 8' }));
  await screen.findByRole('heading', { name: 'Parsing drill' });
  await screen.findByTestId('drill-word');
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const wordOnScreen = () => screen.getByTestId('drill-word');
const codeOnScreen = (): string => {
  const verse = rom8.verses.find((v) => v.n === Number(wordOnScreen().dataset.verse));
  const word = verse?.g[Number(wordOnScreen().dataset.at)];
  if (!word) throw new Error('the word on screen is not in Romans 8');
  return word.p;
};
const stepOnScreen = (): string => screen.getByTestId('drill-step').dataset.stepId ?? '';
const rightOf = (stepId: string): string => {
  const step = buildSteps(codeOnScreen(), mulberry32(0)).find((s) => s.id === stepId);
  if (!step) throw new Error(`no step ${stepId} for ${codeOnScreen()}`);
  return step.right;
};

/** Taps the right choice of the step on screen, or a wrong one. */
async function answer(right: boolean): Promise<void> {
  const correct = rightOf(stepOnScreen());
  const target = options().find((o) => (o.textContent === correct) === right);
  if (!target) throw new Error('no such choice');
  await user.click(target);
  answeredSteps += 1;
}

const nextButton = () => screen.findByTestId('next');

/** Answers the question on screen step by step; `rightAt(step)` says whether a step is answered rightly. */
async function answerQuestion(rightAt: (stepIndex: number) => boolean): Promise<void> {
  const lemma = wordOnScreen().dataset.lemma ?? '';
  const steps: string[] = [];
  for (let i = 0; ; i += 1) {
    steps.push(stepOnScreen());
    await answer(rightAt(i));
    const next = await nextButton();
    const label = next.textContent;
    await user.click(next);
    if (label !== 'Next step') break;
  }
  asked.push({ lemma, steps });
}

async function playRound(rightAt: (questionIndex: number, stepIndex: number) => boolean): Promise<void> {
  for (let q = 0; ; q += 1) {
    if (screen.queryByTestId('score')) return;
    await screen.findByTestId('drill-word');
    await answerQuestion((s) => rightAt(q, s));
    await waitFor(() => expect(screen.queryByTestId('score') ?? screen.queryByTestId('drill-word')).not.toBeNull());
  }
}

/** Answers questions rightly until the word on screen has a code starting with `head`; stops on that question. */
async function goOnTo(head: string): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await screen.findByTestId('drill-word');
    if (codeOnScreen().startsWith(`${head}-`)) return;
    await answerQuestion(() => true);
  }
  throw new Error(`no ${head} word in the round`);
}

async function answerRightlyAndGoOn(): Promise<void> {
  await answer(true);
  await user.click(await nextButton());
}

const expectStep = (id: string) => expect(stepOnScreen()).toBe(id);
const parsingOf = (): string => {
  const code = codeOnScreen();
  const words = rom8.parse[code];
  if (!words) throw new Error(`no parsing for ${code}`);
  return words;
};

const feature = await loadFeature('features/drill.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The Parsing drill on Romans 8 asks ten words he knows, part of speech first', ({ Given, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    Then('the first question shows a word of Romans 8 in its verse and asks its part of speech with 4 choices', () => {
      const verse = rom8.verses.find((v) => v.n === Number(wordOnScreen().dataset.verse));
      expect(verse).toBeDefined();
      expect(screen.getByTestId('drill-verse')).toHaveTextContent(verse?.g[0].t ?? '');
      expect(wordOnScreen()).toHaveTextContent(verse?.g[Number(wordOnScreen().dataset.at)].t ?? '');
      expectStep('pos');
      expect(options()).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'Ask the tutor' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Talk about it' })).toBeInTheDocument();
    });
    When('he answers every step of every question rightly', () => playRound(() => true));
    Then('ten different words he knows were asked, each beginning with its part of speech', async () => {
      expect(asked).toHaveLength(10);
      expect(new Set(asked.map((a) => a.lemma)).size).toBe(10);
      for (const a of asked) {
        expect(a.steps[0]).toBe('pos');
        const word = await db.words.get(a.lemma);
        expect(word).toBeDefined();
        expect(word?.state).not.toBe('dropped');
      }
      expect(screen.getByTestId('score')).toHaveTextContent('10 of 10');
    });
  });

  Scenario('A verb asks tense, voice and mood in steps and a wrong step shows the right one and the full parsing', ({ Given, When, And, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    And('he goes on to a verb', () => goOnTo('V'));
    And('he answers the part of speech rightly and goes on', answerRightlyAndGoOn);
    Then('the verb is asked its tense', () => expectStep('tense'));
    When('he taps a wrong choice for the tense', () => answer(false));
    Then('the tapped choice is red, the right tense is green and the full parsing of the word is shown', () => {
      const red = document.querySelectorAll('[data-option][data-result="wrong"]');
      const green = document.querySelectorAll('[data-option][data-result="right"]');
      expect(red).toHaveLength(1);
      expect(green).toHaveLength(1);
      expect(green[0]).toHaveTextContent(rightOf('tense'));
      expect(screen.getByTestId('drill-parsing')).toHaveTextContent(parsingOf());
    });
    When('he goes on to the next step', async () => {
      await user.click(await nextButton());
    });
    Then('the verb is asked its voice', () => expectStep('voice'));
    When('he answers the voice rightly and goes on', answerRightlyAndGoOn);
    Then('the verb is asked its mood', () => expectStep('mood'));
  });

  Scenario('A noun asks case, number and gender', ({ Given, When, And, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    And('he goes on to a noun', () => goOnTo('N'));
    And('he answers the part of speech rightly and goes on', answerRightlyAndGoOn);
    Then('the noun is asked its case', () => expectStep('case'));
    When('he answers the case rightly and goes on', answerRightlyAndGoOn);
    Then('the noun is asked its number and gender', () => expectStep('number+gender'));
  });

  Scenario('Ask the tutor opens the Ask box on that verse with the question prefilled', ({ Given, When, And, Then }) => {
    let verse = 0;
    let question = '';
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    And('he taps Ask the tutor', async () => {
      verse = Number(wordOnScreen().dataset.verse);
      question = `Parse ${wordOnScreen().textContent} in Romans 8:${verse}: why is it ${parsingOf()}?`;
      await user.click(screen.getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the Reader opens on the verse of that word with the Ask box holding the question about the word', async () => {
      const box = await waitFor(() => {
        const found = document.querySelector<HTMLElement>(`[data-ask="${verse}"]`);
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect(within(box).getByRole('textbox', { name: 'Your question' })).toHaveValue(question);
      expect(screen.getByRole('button', { name: `Verse ${verse}` })).toHaveAttribute('aria-pressed', 'true');
    });
    When('he goes Back', () => {
      window.history.back();
    });
    Then('the drill is on the same question again', async () => {
      await screen.findByRole('heading', { name: 'Parsing drill' });
      expect(Number((await screen.findByTestId('drill-word')).dataset.verse)).toBe(verse);
      expectStep('pos');
    });
  });

  Scenario('Talk about it opens the Talk sheet on that verse', ({ Given, When, And, Then }) => {
    let verse = 0;
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    And('he taps Talk about it', async () => {
      verse = Number(wordOnScreen().dataset.verse);
      await user.click(screen.getByRole('button', { name: 'Talk about it' }));
    });
    Then('the Talk sheet opens on the verse of that word', async () => {
      const sheet = await screen.findByRole('dialog', { name: `Talk about Romans 8:${verse}` });
      expect(sheet).toBeInTheDocument();
    });
  });

  Scenario('The score shows at the end and results survive a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Parsing drill from the Test screen', openDrill);
    And('he answers every step rightly except the first step of the first word', () => playRound((q, s) => !(q === 0 && s === 0)));
    Then('the score reads one word short of the round', async () => {
      expect(await screen.findByTestId('score')).toHaveTextContent('9 of 10');
    });
    And('every step he answered is kept for its word', async () => {
      const kept = await db.drills.toArray();
      expect(kept).toHaveLength(answeredSteps);
      const first = kept.filter((r) => r.lemma === asked[0].lemma);
      expect(first.map((r) => r.step)).toEqual(asked[0].steps);
      expect(first[0].right).toBe(false);
      expect(first.slice(1).every((r) => r.right)).toBe(true);
      expect((await listDrillResults(asked[0].lemma, 'pos'))[0].right).toBe(false);
    });
    When('Lampas is opened again without clearing anything', async () => {
      cleanup();
      stopReading();
      clearBus();
      window.location.hash = '';
      render(<App newRandom={() => mulberry32(7)} />);
      await screen.findByRole('button', { name: 'Settings' });
    });
    Then('the steps he answered are still kept for their words', async () => {
      expect(await db.drills.count()).toBe(answeredSteps);
    });
  });
});
