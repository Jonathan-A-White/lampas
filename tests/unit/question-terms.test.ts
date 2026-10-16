// tests/unit/question-terms.test.ts — a lesson question uses only terms he has been taught (mw-5r3p30.379). His report: 'The singular', step 2 of 3,
// asked 'Tap the accusative singular personal pronoun' (1 John 1:10) before 'accusative' or 'personal pronoun' is taught. Every question of every idea
// (the review and placement builder, and the steps of Drill it) is held to the ideas at or before its own on the ladder (ladder.ts order).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { LADDER, ideaOf, type GrammarIdea } from '../../src/data/grammar/ladder';
import { drillSteps } from '../../src/data/grammar/drillIt';
import { buildConcept, buildEnding, buildIdeaQuestion, buildTapForm, type GrammarQuestion } from '../../src/data/grammar/questions';
import { splitParse } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';
import { TERMS, taughtBy, termsUsedIn } from '../../src/data/grammar/taughtTerms';

const load = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;
const PASSAGES: Record<string, Chapter[]> = {
  '1 John 1': [load('1jn/1')],
  'Romans 8': [load('rom/8')],
  'John 1 and Mark 1': [load('jhn/1'), load('mrk/1')],
  none: [],
};
// every idea of the ladder over a passage, many seeds: a whole walk takes seconds, so each test holds one SLICE of the ladder (every SLICES-th idea from k)
const SLICES = 4;
const sliceOf = (k: number): GrammarIdea[] => LADDER.filter((_, i) => i % SLICES === k);
const SEEDS = Array.from({ length: 15 }, (_, i) => i + 1);

/** Everything a question shows in English: what is asked and what can be picked (a Greek choice names no term). */
const textOf = (q: GrammarQuestion): string => [q.prompt, ...q.options].join('\n');

/** The terms the question uses that an idea at or before `idea` on the ladder does not teach. */
function early(idea: GrammarIdea, q: GrammarQuestion): string[] {
  return termsUsedIn(textOf(q))
    .filter(([, teachers]) => !taughtBy(teachers, idea))
    .map(([term, teachers]) => `${idea.id} (${q.kind}) uses “${term}” (taught by ${teachers.join(' or ')}): ${q.prompt.slice(0, 90)}`);
}

describe('a question uses only terms taught by its idea and the ideas before it', () => {
  it('knows the terms (so the test can see one)', () => {
    expect(TERMS.length).toBeGreaterThan(50);
    const q = { kind: 'tap-form', ideaId: 'number-singular', prompt: 'Tap the accusative singular personal pronoun', options: [], right: '' } as GrammarQuestion;
    expect(early(ideaOf('number-singular'), q).map((m) => /“([^”]+)”/.exec(m)![1])).toEqual(['personal pronoun', 'accusative']);
  });

  it('holds on 1 John 1:10: The singular does not ask for the accusative or the personal pronoun', () => {
    const singular = ideaOf('number-singular');
    const prompts = new Set<string>();
    for (const seed of SEEDS) {
      const q = buildTapForm(singular, PASSAGES['1 John 1'], mulberry32(seed));
      if (q) prompts.add(q.prompt);
    }
    expect(prompts.size).toBeGreaterThan(0);
    for (const prompt of prompts) expect(prompt, prompt).not.toMatch(/accusative|personal pronoun|nominative|genitive|dative|masculine|feminine|neuter/);
  });

  it('asks an ending only when the prompt still settles it: every feature is named, but a noun\'s gender', () => {
    for (const idea of LADDER) {
      for (const passage of [PASSAGES['1 John 1'], PASSAGES['Romans 8']]) {
        for (const seed of SEEDS) {
          const q = buildEnding(idea, passage, mulberry32(seed));
          if (!q) continue;
          const { pos, features } = splitParse(q.code!);
          const named = features.filter((f) => q.prompt.includes(f.value));
          const left = features.filter((f) => !q.prompt.includes(f.value));
          expect(named.length, q.prompt).toBeGreaterThan(0);
          expect(left.every((f) => pos === 'noun' && f.id === 'gender'), `${idea.id}: ${q.prompt} leaves out ${left.map((f) => f.value)}`).toBe(true);
        }
      }
    }
  });

  it('the slices of the ladder together are every idea of it', () => {
    expect(Array.from({ length: SLICES }, (_, k) => sliceOf(k)).flat().map((i) => i.id).sort()).toEqual(LADDER.map((i) => i.id).sort());
  });

  for (const [name, passage] of Object.entries(PASSAGES)) {
    for (let slice = 0; slice < SLICES; slice++) {
      it(`holds for the ideas ${slice + 1} of ${SLICES} over ${name}: the review question, the form to tap, the ending and the concept`, () => {
        const found: string[] = [];
        for (const idea of sliceOf(slice)) {
          for (const seed of SEEDS) {
            const questions = [buildIdeaQuestion(idea, passage, mulberry32(seed)), buildTapForm(idea, passage, mulberry32(seed)), buildEnding(idea, passage, mulberry32(seed)), buildConcept(idea, mulberry32(seed))];
            for (const q of questions) if (q) found.push(...early(idea, q));
          }
        }
        expect([...new Set(found)]).toEqual([]);
      });

      it(`holds for every step of Drill it for the ideas ${slice + 1} of ${SLICES} over ${name}`, () => {
        const found: string[] = [];
        for (const idea of sliceOf(slice)) {
          for (const step of drillSteps(idea.id, { passage, seed: 3 })) for (const q of step.questions) found.push(...early(idea, q));
        }
        expect([...new Set(found)]).toEqual([]);
      });
    }
  }
});
