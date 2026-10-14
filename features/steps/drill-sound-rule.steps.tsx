// features/steps/drill-sound-rule.steps.tsx — runs features/drill-sound-rule.feature: Drill it (src/DrillItScreen.tsx) on Chi, a sound the scheme changes by the
// next letter: the word misread by the rule is among the answers, a wrong pick names the rule, and a Hint keeps the misread word.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { DrillItScreen } from '../../src/DrillItScreen';
import { drillSteps, type DrillQuestion } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { pronunciationOf, soundRuleOf } from '../../src/speech/pronunciation';

afterAll(() => cleanup());

const user = userEvent.setup();
const SEED = 11;
const modern = pronunciationOf('modern');
let ideaId = '';

const dialog = () => screen.getByRole('dialog', { name: 'Drill it' });
const options = (): HTMLElement[] => Array.from(dialog().querySelectorAll<HTMLElement>('[data-option]'));

/** The question on screen, found among the steps the seed gives. */
function onScreen(): DrillQuestion {
  const prompt = within(dialog()).getByTestId('grammar-prompt').textContent ?? '';
  const form = within(dialog()).queryByTestId('grammar-form')?.textContent ?? '';
  const shown = options().map((o) => o.textContent ?? '');
  const found = drillSteps(ideaId, { seed: SEED, scheme: modern })
    .flatMap((s) => s.questions)
    .find((q) => q.prompt === prompt && (q.form ?? '') === form && q.options.join('|') === shown.join('|'));
  if (!found) throw new Error(`no question '${prompt}' ${form} among the steps`);
  return found;
}

/** The word on screen misread by the rule of its idea: the near miss of the point taught. */
function misread(): string {
  const q = onScreen();
  return soundRuleOf(modern, ideaId)!.misread(q.form!);
}

const feature = await loadFeature('features/drill-sound-rule.feature');

describeFeature(feature, ({ Background, Scenario }) => {
  void Background;
  const opens = (_: unknown, title: string) => {
    cleanup();
    ideaId = LADDER.find((i) => i.title === title)!.id;
    drillSeed.next = () => SEED;
    render(<DrillItScreen ideaId={ideaId} mode="practice" onResult={() => {}} onClose={() => {}} />);
    expect(within(dialog()).getByRole('heading', { name: ideaOf(ideaId).title })).toBeTruthy();
  };
  const untilWord = async () => {
    for (let guard = 0; guard < 12; guard += 1) {
      const q = onScreen();
      if (q.prompt === 'How is this word said?' && soundRuleOf(modern, ideaId)!.sideOf(q.form!) !== null) return;
      await user.click(options().find((o) => o.textContent === q.right)!);
      await user.click(await within(dialog()).findByTestId('drill-next'));
    }
    throw new Error('no word was read');
  };

  Scenario('A wrong pick on a word of Chi names the rule of its side', ({ Given, When, And, Then }) => {
    Given('Drill it is open on {string}', opens);
    When('he answers right until he is asked how a word is said', untilWord);
    And('he picks the word misread by its rule', async () => {
      const near = misread();
      await user.click(options().find((o) => o.textContent === near)!);
    });
    Then('Drill it says {string} with the right respelling', (_, text: string) => {
      const q = onScreen();
      expect(within(dialog()).getByTestId('feedback').textContent).toBe(`${text} It is ${q.right}.`);
    });
    And("one line under it names the rule of the word's side", () => {
      const q = onScreen();
      const rule = soundRuleOf(modern, ideaId)!;
      const side = rule.sides.find((s) => s.id === rule.sideOf(q.form!))!;
      expect(within(dialog()).getByTestId('rule-line').textContent).toBe(side.line);
      expect(side.line).toMatch(/^χ before /);
    });
  });

  Scenario('A Hint on a word of Chi keeps the word misread by its rule', ({ Given, When, And, Then }) => {
    Given('Drill it is open on {string}', opens);
    When('he answers right until he is asked how a word is said', untilWord);
    And('he taps Hint on Drill it', async () => {
      await user.click(within(dialog()).getByRole('button', { name: 'Hint' }));
      expect(dialog().querySelectorAll('[data-taken]').length).toBeGreaterThan(0);
    });
    Then('the word misread by its rule is still there to pick', () => {
      const near = misread();
      const button = options().find((o) => o.textContent === near)!;
      expect(button.hasAttribute('data-taken')).toBe(false);
      expect((button as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
