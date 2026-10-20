// What the tutor is told on the results of a drill (mw-5r3p30.649): every question of the run with the idea it tests, what was asked, his answer, the right answer
// and whether he was right, as the `drill` of the request's `screen`, and the first question the sheet suggests (src/tutor/drillTalk.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { MAX_REQUEST_BYTES, buildTalkRequest, fitHistory, scopeRef, type TalkScope } from '../../src/services/talk';
import { DRILL_ANSWER_MAX, MAX_DRILL_ANSWERS, fitScreen } from '../../src/tutor/screen';
import { drillScreen, drillSuggestions, type DrillTry } from '../../src/tutor/drillTalk';
import { validate, type Schema } from '../support/schema-validate';

const questions = drillSteps('diphthong-au', { seed: 1 }).flatMap((s) => s.questions);
const wrongOption = (right: string, options: string[]): string => options.find((o) => o !== right)!;

/** A run of three: right, wrong, right-with-a-hint. */
function run(): DrillTry[] {
  const [a, b, c] = questions;
  return [
    { question: a, picked: a.right, hinted: false },
    { question: b, picked: wrongOption(b.right, b.options), hinted: false },
    { question: c, picked: c.right, hinted: true },
  ];
}

const scopeOf = (screen: ReturnType<typeof drillScreen>): TalkScope => ({ title: screen.name, chapter: NO_CHAPTER, verse: null, screen });

describe('the screen a drill reports', () => {
  it('lists every question with its idea, what was asked, his answer, the right answer and right or wrong', () => {
    const tries = run();
    const screen = drillScreen({ idea: 'The vowel pair αυ', headline: 'You reached step 1 of 3', tries });
    expect(screen.name).toBe('Drill it');
    expect(screen.drill).toHaveLength(3);
    screen.drill!.forEach((got, i) => {
      const { question, picked } = tries[i];
      expect(got.idea, 'the idea').toBe(question.facet?.label);
      expect(got.asked, 'what was asked').toContain(question.prompt);
      expect(got.answer, 'his answer').toBe(picked);
      expect(got.right_answer, 'the right answer').toBe(question.right);
      expect(got.right, 'right or wrong').toBe(picked === question.right);
    });
    expect(screen.drill![1].right).toBe(false);
    expect(screen.drill![0].hinted).toBeUndefined();
    expect(screen.drill![2].hinted).toBe(true);
  });

  it('names the idea and the result among its facts', () => {
    const screen = drillScreen({ idea: 'The vowel pair αυ', headline: 'Proved', tries: run() });
    expect(screen.facts).toContainEqual({ label: 'Idea', value: 'The vowel pair αυ' });
    expect(screen.facts).toContainEqual({ label: 'Result', value: 'Proved' });
    expect(screen.facts.find((f) => f.label === 'Questions')?.value).toMatch(/3.*2 right/);
  });

  it('keeps the drill through fitScreen, cutting each text to the limits', () => {
    const tries = run();
    tries[0] = { ...tries[0], question: { ...tries[0].question, prompt: 'p'.repeat(1000) } };
    const fitted = fitScreen(drillScreen({ idea: 'x', headline: 'Proved', tries }));
    expect(fitted.drill).toHaveLength(3);
    expect(fitted.drill![0].asked.length).toBeLessThanOrEqual(DRILL_ANSWER_MAX.asked);
    expect(fitScreen({ name: 'Drill it', facts: [] }).drill).toBeUndefined();
  });

  it('reaches the tutor in the request, and the request meets the grind\'s input schema', () => {
    const screen = fitScreen(drillScreen({ idea: 'The vowel pair αυ', headline: 'You reached step 1 of 3', tries: run() }));
    const request = buildTalkRequest(scopeOf(screen), 'Why did I get these wrong?', [], []);
    expect(request.screen?.drill).toEqual(screen.drill);
    expect(request.screen?.drill?.filter((q) => !q.right)).toHaveLength(1);
    const schema = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema;
    expect(validate(JSON.parse(JSON.stringify(request)), schema)).toEqual([]);
  });

  it('stays inside the request budget for the longest drill', () => {
    const many = Array.from({ length: MAX_DRILL_ANSWERS }, (_, i): DrillTry => {
      const q = { ...questions[i % questions.length], prompt: 'q'.repeat(300), right: 'r'.repeat(200) };
      return { question: q, picked: 'w'.repeat(200), hinted: false };
    });
    const screen = fitScreen(drillScreen({ idea: 'i'.repeat(200), headline: 'h'.repeat(300), tries: many }));
    expect(screen.drill).toHaveLength(MAX_DRILL_ANSWERS);
    const request = fitHistory(buildTalkRequest(scopeOf(screen), 'Why?', [{ q: 'a', a: 'b' }], []));
    expect(new TextEncoder().encode(JSON.stringify(request)).length).toBeLessThanOrEqual(MAX_REQUEST_BYTES);
  });

  it('is kept under a talk of its own for each drill', () => {
    const one = { ...scopeOf(drillScreen({ idea: 'x', headline: 'Proved', tries: run() })), kept: 'screen.drill-it.1' };
    const two = { ...one, kept: 'screen.drill-it.2' };
    expect(scopeRef('', 0, one)).toBe('screen.drill-it.1');
    expect(scopeRef('', 0, two)).not.toBe(scopeRef('', 0, one));
  });
});

describe('the first question the sheet suggests', () => {
  it('is "Why did I get these wrong?" when any were wrong', () => {
    expect(drillSuggestions(drillScreen({ idea: 'x', headline: 'Proved', tries: run() }))[0]).toBe('Why did I get these wrong?');
  });

  it('is "What should I practise next?" when all were right', () => {
    const right = run().map((t) => ({ ...t, picked: t.question.right }));
    expect(drillSuggestions(drillScreen({ idea: 'x', headline: 'Proved', tries: right }))[0]).toBe('What should I practise next?');
  });
});
