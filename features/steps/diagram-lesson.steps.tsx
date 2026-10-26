// features/steps/diagram-lesson.steps.tsx — runs features/diagram-lesson.feature: the optional lesson 'How to read a sentence diagram' (src/diagram/DiagramLesson.tsx, #/diagram-lesson).
// The whole app is opened on the lesson (jsdom has no layout: the diagram is measured by the estimate), the taps are on the diagram's own word buttons, and what is kept is read from localStorage.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { LESSON_STEPS, LESSON_TITLE } from '../../src/diagram/lesson';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { navigate, readerOf } from '../../src/nav/route';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();
const feature = await loadFeature('features/diagram-lesson.feature');

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on `hash` with every store emptied, so the phone has never seen the lesson. */
async function open(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  stubChapterFetch();
  localStorage.clear();
  window.history.replaceState(null, '', `/${hash}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  render(<App />);
}

const lesson = async (): Promise<HTMLElement> => screen.findByTestId('diagram-lesson');
const stepLine = (at: number): string => `Step ${at} of ${LESSON_STEPS.length}`;
const diagram = async (): Promise<HTMLElement> => (await lesson()).querySelector<HTMLElement>('[data-diagram]')!;
const wordButton = async (text: string): Promise<HTMLElement> => within(await diagram()).getByRole('button', { name: text, exact: true });
const told = (): HTMLElement => screen.getByTestId('diagram-lesson-told');
const buttonNamed = (name: string): HTMLElement => screen.getByRole('button', { name, exact: true });

async function opensOnLesson(): Promise<void> {
  await open('#/diagram-lesson');
  await lesson();
}

/** Taps the right word of the step on show. */
async function tapsTheRightWord(at: number): Promise<void> {
  const step = LESSON_STEPS[at];
  const button = (await diagram()).querySelector<HTMLElement>(`[data-word="${step.check.answer}"]`)!;
  await user.click(button);
  await waitFor(() => expect(told()).toHaveTextContent('Right.'));
}

async function tapsWord(_: unknown, word: string): Promise<void> {
  await user.click(await wordButton(word));
}

async function toldAndLit(_: unknown, said: string, lit: string): Promise<void> {
  await waitFor(() => expect(told()).toHaveTextContent(said));
  const lightened = within(await diagram()).getAllByRole('button').filter((b) => b.hasAttribute('data-lit'));
  expect(lightened.map((b) => b.textContent)).toEqual([lit]);
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The lesson opens at step 1', ({ Given, Then, And }) => {
    Given('the lesson is opened on a phone that has never seen it', opensOnLesson);
    Then('the screen is titled {string} and says {string}', async (_, title: string, step: string) => {
      expect(title).toBe(LESSON_TITLE);
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
      expect(screen.getByText(step)).toBeInTheDocument();
    });
    And('step {number} shows its sentences above the diagram of {string} and the check {string}', async (_, at: number, reference: string, check: string) => {
      const step = LESSON_STEPS[at - 1];
      expect(step.reference).toBe(reference);
      const main = await lesson();
      const text = within(main).getByText(step.text);
      const picture = await within(main).findByRole('img', { name: `Sentence diagram of ${reference}, English` });
      // the sentences come before the diagram on the page
      expect(text.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(main).getByText(check)).toBeInTheDocument();
    });
    And('the diagram scrolls sideways and its words are buttons', async () => {
      expect((await diagram()).className).toMatch(/overflow-x-auto/);
      expect(within(await diagram()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Jesus', 'wept']);
    });
    And('Back is not offered and Next is', async () => {
      expect(buttonNamed('Back')).toBeDisabled();
      expect(buttonNamed('Next')).toBeEnabled();
    });
  });

  Scenario('A right tap is told so and a wrong tap shows the right word lit', ({ Given, When, Then }) => {
    Given('the lesson is opened on a phone that has never seen it', opensOnLesson);
    When('he taps the wrong word {string}', tapsWord);
    Then('he is told {string} and the word {string} is lit', toldAndLit);
    When('he taps the right word {string}', tapsWord);
    Then('he is then told {string} and the word {string} is lit', toldAndLit);
  });

  Scenario('Next through the nine steps to Done, which is kept', ({ Given, When, Then, And }) => {
    Given('the lesson is opened from a Reader on Colossians 3:1', async () => {
      await open('#/?b=col&c=3&v=1');
      await screen.findByRole('region', { name: 'Verse view' });
      navigate('diagram-lesson');
      await lesson();
    });
    When('he goes through every step, tapping the right word of each, to the last', async () => {
      for (let at = 0; at < LESSON_STEPS.length - 1; at++) {
        const step = LESSON_STEPS[at];
        expect(await screen.findByText(stepLine(at + 1))).toBeInTheDocument();
        await within(await lesson()).findByRole('img', { name: `Sentence diagram of ${step.reference}, English` });
        expect(screen.getByTestId('diagram-lesson-check')).toHaveTextContent(`Tap the ${step.check.role}`);
        await tapsTheRightWord(at);
        await user.click(buttonNamed('Next'));
      }
    });
    Then('the last step is {string} and Next reads {string}', async (_, line: string, label: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
      expect(buttonNamed(label)).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Next', exact: true })).toBeNull();
    });
    And('step 9 draws Colossians 3:1 with Greek words in it', async () => {
      expect(await within(await lesson()).findByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeInTheDocument();
      expect(within(await diagram()).getByRole('button', { name: 'ζητεῖτε' })).toBeInTheDocument();
      await tapsTheRightWord(8);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(buttonNamed(name));
    });
    Then('he is back on the Reader at Colossians 3:1', async () => {
      await screen.findByRole('region', { name: 'Verse view' });
      expect(readerOf(window.location.hash)).toMatchObject({ book: 'col', chapter: 3, verse: 1 });
    });
    And('diagram-lesson is kept done on the phone', () => {
      expect(localStorage.getItem('lampas.diagram-lesson')).toBe('done');
    });
  });

  Scenario('Back goes a step back', ({ Given, When, And, Then }) => {
    Given('the lesson is opened on a phone that has never seen it', opensOnLesson);
    When('he taps {string} {number} times', async (_, name: string, times: number) => {
      for (let k = 0; k < times; k++) await user.click(buttonNamed(name));
    });
    And('he taps {string}', async (_, name: string) => {
      await user.click(buttonNamed(name));
    });
    Then('the screen says {string}', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
  });

  Scenario('Leaving at step 3 keeps step 3', ({ Given, When, And, Then }) => {
    Given('the lesson is opened on a phone that has never seen it', opensOnLesson);
    When('he taps {string} {number} times', async (_, name: string, times: number) => {
      for (let k = 0; k < times; k++) await user.click(buttonNamed(name));
    });
    And('he leaves the lesson', async () => {
      expect(screen.getByText(stepLine(3))).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '‹ Leave' }));
      await waitFor(() => expect(screen.queryByTestId('diagram-lesson')).toBeNull());
    });
    And('he opens the lesson again', async () => {
      navigate('diagram-lesson');
      await lesson();
    });
    Then('the screen says {string}', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
    And('diagram-lesson is not kept done', () => {
      expect(localStorage.getItem('lampas.diagram-lesson')).toBeNull();
    });
  });

  Scenario('Nothing else names the lesson', ({ Given, Then, When }) => {
    Given('Lampas is opened on the Goal screen', async () => {
      await open('#/goal');
      await screen.findByRole('heading', { name: 'Goal', level: 1 });
    });
    Then('the Goal screen does not name the lesson', () => {
      expect(document.body.textContent).not.toMatch(/sentence diagram|diagram-lesson/i);
    });
    When('he opens Today', async () => {
      navigate('today');
      await screen.findByRole('heading', { name: 'Today', level: 1 });
    });
    Then('Today does not name the lesson', () => {
      expect(document.body.textContent).not.toMatch(/sentence diagram|diagram-lesson/i);
    });
  });
});
