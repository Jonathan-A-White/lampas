// tests/unit/step-quiz-start.test.ts — the step 'he starts the quiz on the passage' finds its buttons and its sheet without a role query over the
// whole Reader (mw-indx1x6.38).
// a role query for a button inside the Verse view (within(view), name) and screen.getByRole('dialog') work out the accessible name and visibility of every element of the
// Reader behind them: ~1 s a call on a calm host at load 17, so the step (four button taps and the sheet) took 3.4 to 4.6 s and outran a 3 s step
// limit; the message was typed key by key (a render of the sheet each). The step is features/steps/start-quiz.ts, shared by study-way and quiz-goal.
// Recipe to see it: `TZ=UTC npx vitest run features/steps/study-way.steps.tsx features/steps/quiz-goal.steps.tsx --testTimeout=3000`.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['features/steps/start-quiz.ts', 'features/steps/study-way.steps.tsx', 'features/steps/quiz-goal.steps.tsx'];

/** The role queries that walk the whole Reader: a button asked for inside the Verse view, and any dialog asked for on `screen`. */
const OFFENCES = [/within\(view\)\.(find|get|query)(All)?ByRole\('button'/, /screen\.(find|get|query)(All)?ByRole\('dialog'/];

describe('the quiz-starting steps', () => {
  it.each(FILES)('%s asks no role query that walks the Reader for a button of the Verse view or for a dialog', (file) => {
    const offences = readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) => (OFFENCES.some((re) => re.test(line)) ? [`${file}:${i + 1} ${line.trim()}`] : []));
    expect(offences).toEqual([]);
  });

  it.each(['features/steps/study-way.steps.tsx', 'features/steps/quiz-goal.steps.tsx'])('%s starts the quiz through the shared step', (file) => {
    expect(readFileSync(file, 'utf8')).toContain("from './start-quiz'");
  });
});
