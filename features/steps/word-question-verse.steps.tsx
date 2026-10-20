// features/steps/word-question-verse.steps.tsx — runs features/word-question-verse.feature: the 'in Hebrews 8:9 as ἐκ' line of an answered word question
// (src/WordQuestion.tsx) opens the verse card with the form marked, in the view he reads in. The question is drawn on its own with the chapter files read from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { db } from '../../src/data/db';
import type { Question } from '../../src/data/quiz';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { WordQuestion } from '../../src/WordQuestion';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

const EK: Question = {
  lemma: 'ἐκ',
  prompt: 'ἐκ',
  form: 'ἐκ',
  reference: 'Hebrews 8:9',
  book: 'heb',
  chapter: 8,
  verse: 9,
  gloss: 'out of',
  options: ['out of', 'in', 'to', 'with'],
};

/** The question as a screen holds it: the answer is the screen's state, so a card closing must not change it. */
export function Holder({ answered }: { answered: boolean }) {
  const [picked, setPicked] = useState<string | null>(answered ? EK.gloss : null);
  return <WordQuestion question={EK} index={0} picked={picked} onPick={setPicked} />;
}

async function drawQuestion(answered: boolean): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/#/test');
  render(<Holder answered={answered} />);
}

async function seed(view: 'english' | 'greek', weave: 'off' | 'solid', solid: boolean): Promise<void> {
  await db.open();
  await Promise.all([db.words.clear(), db.settings.clear()]);
  await setReaderView(view);
  await setWeave(weave);
  if (solid) await db.words.put({ lemma: 'ἐκ', lemmas: ['ἐκ'], gloss: 'out of', lesson: 1, state: 'solid', since: 0 });
}

const card = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-reference-card]');
const cards = (): number => document.querySelectorAll('[data-reference-card]').length;
const marked = (): HTMLElement[] => [...(card()?.querySelectorAll<HTMLElement>('[data-marked]') ?? [])];

const feature = await loadFeature('features/word-question-verse.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The reference on an answered card is a link and an unanswered card has no line', ({ Given, When, Then }) => {
    Given('a word question for ἐκ in Hebrews 8:9 that he has not answered', async () => {
      await seed('greek', 'off', false);
      await drawQuestion(false);
    });
    Then("the card has no 'in … as …' line", () => {
      expect(screen.queryByRole('link', { name: 'Hebrews 8:9' })).toBeNull();
    });
    When('he answers it', async () => {
      await user.click(screen.getByRole('button', { name: 'out of' }));
    });
    Then('the line reads {string} and {string} is a link', (_, line: string, name: string) => {
      expect(screen.getByTestId('chapter-form').textContent).toBe(line);
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    });
  });

  Scenario('In the Greek view the card shows the Greek verse with ἐκ marked', ({ Given, And, When, Then }) => {
    Given("the reader's view is Greek", async () => seed('greek', 'off', false));
    And('a word question for ἐκ in Hebrews 8:9 that he has answered', async () => drawQuestion(true));
    When('he taps the reference {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} shows the Greek verse', async (_, heading: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      await within(dialog).findByText(/ἐξαγαγεῖν/);
      expect(within(dialog).queryByText(/Egypt/)).toBeNull();
    });
    And('the word {string} is marked on the card', async (_, word: string) => {
      await waitFor(() => expect(marked().map((m) => m.textContent?.trim())).toEqual([word]));
    });
  });

  Scenario('In the English view with ἐκ in the Weave the card shows the verse woven with ἐκ marked', ({ Given, And, When, Then }) => {
    Given('the reader\'s view is English with the Weave Solid and ἐκ a solid word', async () => seed('english', 'solid', true));
    And('a word question for ἐκ in Hebrews 8:9 that he has answered', async () => drawQuestion(true));
    When('he taps the reference {string}', async (_, name: string) => {
      await user.click(screen.getByRole('link', { name }));
    });
    Then('a card headed {string} shows the English verse', async (_, heading: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      await within(dialog).findByText(/Egypt/);
    });
    And('the word {string} is marked on the card', async (_, word: string) => {
      await waitFor(() => expect(marked().map((m) => m.textContent?.trim())).toEqual([word]));
    });
    And('the word {string} stands woven in the English', (_, word: string) => {
      expect(marked()[0].closest('[data-woven]')).not.toBeNull();
      expect(card()?.textContent).toContain(word);
    });
  });

  Scenario('Closing the card leaves the question answered, and a double tap opens one card', ({ Given, And, When, Then }) => {
    Given("the reader's view is Greek", async () => seed('greek', 'off', false));
    And('a word question for ἐκ in Hebrews 8:9 that he has answered', async () => drawQuestion(true));
    When('he taps the reference {string} twice quickly', async (_, name: string) => {
      await user.dblClick(screen.getByRole('link', { name }));
    });
    Then('one card is showing', async () => {
      await screen.findByRole('dialog');
      expect(cards()).toBe(1);
    });
    When('he closes the card', async () => {
      await user.click(within(card() as HTMLElement).getByRole('button', { name: 'Close' }));
    });
    Then('no card is showing', async () => {
      await waitFor(() => expect(card()).toBeNull());
    });
    And('the question is still answered with the line in place', () => {
      expect(screen.getByTestId('chapter-form').textContent).toBe('in Hebrews 8:9 as ἐκ');
      expect(screen.getByRole('link', { name: 'Hebrews 8:9' })).toBeInTheDocument();
      expect(screen.getByTestId('feedback').textContent).toBe('Right.');
    });
  });
});
