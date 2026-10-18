// features/steps/sound-alike-miss.steps.tsx — runs features/sound-alike-miss.feature: the card of a 'Words that sound alike' question (src/GrammarCard.tsx)
// says, after a miss, that the two words sound alike and the spelling tells them apart (mw-86e9r1.44).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, type RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { GrammarCard } from '../../src/GrammarCard';
import { ideaOf } from '../../src/data/grammar/ladder';
import { buildSoundAlike } from '../../src/data/grammar/questions';
import type { GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { pronunciationOf } from '../../src/speech/pronunciation';

afterAll(() => cleanup());

const user = userEvent.setup();
let question: GrammarQuestion;

let view: RenderResult;
const show = (picked: string | null) => <GrammarCard question={question} mode="choice" picked={picked} onPick={(o) => view.rerender(show(o))} />;

const feature = await loadFeature('features/sound-alike-miss.feature');

describeFeature(feature, ({ Scenario }) => {
  const opens = () => {
    cleanup();
    question = buildSoundAlike(ideaOf('words-sound-alike'), mulberry32(1), pronunciationOf('modern'));
    view = render(show(null));
    expect(screen.getByTestId('grammar-prompt').textContent).toMatch(/^This word sounds just like another\./);
  };
  const tap = (text: string) => user.click(screen.getAllByRole('button').find((b) => b.textContent === text)!);
  const feedback = () => screen.getByTestId('feedback').textContent;

  Scenario('A wrong spelling says the two words sound alike and to trust the spelling', ({ Given, When, Then, And }) => {
    Given('a {string} question in Modern Greek', opens);
    When('he taps a spelling that is not the answer', async () => {
      await tap(question.options.find((o) => o !== question.right)!);
    });
    Then('the feedback says {string} with the right spelling', (_, text: string) => {
      expect(feedback()).toBe(`${text} It is ${question.right}.`);
    });
    And('a line under it says the two words sound alike and the spelling tells them apart', () => {
      const line = screen.getByTestId('rule-line').textContent ?? '';
      expect(line).toMatch(/sound alike/i);
      expect(line).toMatch(/spelling/i);
    });
  });

  Scenario('A right spelling has no such line', ({ Given, When, Then, And }) => {
    Given('a {string} question in Modern Greek', opens);
    When('he taps the right spelling', async () => {
      await tap(question.right);
    });
    Then('the feedback says {string}', (_, text: string) => {
      expect(feedback()).toBe(text);
    });
    And('no line says the two words sound alike', () => {
      expect(screen.queryByTestId('rule-line')).toBeNull();
    });
  });
});
