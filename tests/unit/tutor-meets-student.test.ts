// The tutor meets the student where they are (mw-1vuvq6.2): every tutor grind pitches its answer to learner_profile, the grammar and the
// words he has. verse-read and tips are sent `learner` and `learner_grammar` as bible-talk and verse-ask are; every instruction file says
// how the profile changes an answer; bible-talk and verse-ask each keep one question answered for two contrasting profiles.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import type { Verse } from '../../src/data/chapter';
import { learnerGrammarOf, type LearnerGrammar } from '../../src/data/grammar/learnerGrammar';
import { buildReadingRequest } from '../../src/services/reading';
import { buildTipRequest } from '../../src/tips/tip';
import { validate, type Schema } from '../support/schema-validate';
import type { GrindExample } from '../support/grind-examples';
import { instructionsOf } from '../../scripts/grind-parts';

const readJson = (rel: string): Record<string, unknown> => JSON.parse(readFileSync(rel, 'utf8')) as Record<string, unknown>;

const verse = { n: 28, g: [{ t: 'οἴδαμεν' }, { t: 'δὲ' }], e: [{ t: 'We know' }, { t: 'that' }] } as unknown as Verse;
const summary = { days_used: 1, days_used_last_7: 1, first_used_days_ago: 0, screens_visited: [], screens_never: [], features_used: [], features_never: [], settings_changed: [], settings_never: [], turned_off: [], counts: { wordsLearning: 0, wordsSolid: 0, talks: 0, asks: 0, quizAnswers: 0, drillAnswers: 0, readings: 0, grammarKnown: 0 } };
const learner = 'solid 3 words; learning: ἀγαπάω, πίστις; new today: -; due now: 2';
const grammar: LearnerGrammar = learnerGrammarOf({
  goal: 'Read 1 John 1:1',
  words: { solid: 3, frontier: 2, notYet: 9 },
  ideas: [
    { id: 'alphabet', title: 'The alphabet', level: 'solid' },
    { id: 'nominative', title: 'The nominative case', level: 'frontier' },
    { id: 'genitive', title: 'The genitive case', level: 'notYet' },
  ],
  placed: true,
  move: 'none',
  pickerLevel: 'frontier',
  approach: { name: 'BMA Tutor', credit: 'Biblical Mastery Academy', nextLesson: 'The nominative case' },
});

describe('verse-read and tips are sent learner and learner_grammar', () => {
  const grists: Record<string, (withThem: boolean) => { request: Record<string, unknown>; schema: string }> = {
    'verse-read': (on) => ({
      request: buildReadingRequest('Romans 8:28', verse, 'english', 'en', undefined, on ? learner : undefined, on ? grammar : undefined) as unknown as Record<string, unknown>,
      schema: 'grinds/verse-read.input.schema.json',
    }),
    tips: (on) => ({
      request: buildTipRequest(summary, ['a'], undefined, on ? learner : undefined, on ? grammar : undefined) as unknown as Record<string, unknown>,
      schema: 'grinds/tips.input.schema.json',
    }),
  };

  it.each(Object.keys(grists))('%s: carries both when the app has them, and validates', (kind) => {
    const { request, schema } = grists[kind](true);
    expect(request.learner).toBe(learner);
    expect(request.learner_grammar).toEqual(grammar);
    expect(validate(request, readJson(schema) as Schema)).toEqual([]);
  });

  it.each(Object.keys(grists))('%s: carries neither when it has none, and validates', (kind) => {
    const { request, schema } = grists[kind](false);
    expect('learner' in request).toBe(false);
    expect('learner_grammar' in request).toBe(false);
    expect(validate(request, readJson(schema) as Schema)).toEqual([]);
  });

  it.each(Object.keys(grists))('%s: the schema refuses a learner line over 600 characters', (kind) => {
    const { request, schema } = grists[kind](true);
    expect(validate({ ...request, learner: 'x'.repeat(601) }, readJson(schema) as Schema)).not.toEqual([]);
  });
});

describe('every instruction file says how the profile changes an answer', () => {
  const kinds = ['bible-talk', 'verse-ask', 'verse-read', 'tips'];

  it.each(kinds)('%s: names learner_profile and what age, pace, ways of learning and background do', (kind) => {
    const text = instructionsOf(kind);
    expect(text).toContain('`learner_profile`');
    for (const word of ['age', 'pace', 'ways', 'background']) expect(text, `${kind} says nothing of ${word}`).toMatch(new RegExp(`\\b${word}\\b`));
    for (const value of ['quick', 'slow', 'hearing', 'seeing', 'reading', 'doing']) expect(text, `${kind} does not say what ${value} changes`).toContain(`\`${value}\``);
    expect(text, `${kind} never says how age changes an answer`).toMatch(/age[^.]*(tone|wording|examples|words)/);
  });

  it.each(kinds)('%s: says never to build on grammar or words he has not met without saying so', (kind) => {
    const text = instructionsOf(kind);
    expect(text).toMatch(/not (yet )?met|has not met|have not met/);
  });

  it.each(['verse-read', 'tips'])('%s: names learner and learner_grammar and how to use them', (kind) => {
    const text = instructionsOf(kind);
    expect(text).toContain('`learner`');
    expect(text).toContain('`learner_grammar`');
  });
});

describe('one question, two contrasting profiles', () => {
  describe.each(['bible-talk', 'verse-ask'])('%s', (kind) => {
    const dir = `grinds/examples/${kind}`;
    const pair = readdirSync(dir)
      .filter((f) => f.startsWith('profile-'))
      .map((f) => ({ file: f, example: readJson(`${dir}/${f}`) as unknown as GrindExample }));

    it('has two scenarios with the same question and different profiles', () => {
      expect(pair.map((p) => p.file)).toHaveLength(2);
      const [a, b] = pair.map((p) => p.example.request as Record<string, unknown>);
      expect(a.question).toBe(b.question);
      expect(a.reference).toBe(b.reference);
      expect(a.learner_profile).toBeDefined();
      expect(b.learner_profile).toBeDefined();
      expect(a.learner_profile).not.toEqual(b.learner_profile);
      expect((a.learner_profile as { pace?: string }).pace).not.toBe((b.learner_profile as { pace?: string }).pace);
    });

    it('both carry where he is in words and grammar, and fit the input schema', () => {
      const schema = readJson(`grinds/${kind}.input.schema.json`) as Schema;
      for (const { example } of pair) {
        const request = example.request as Record<string, unknown>;
        expect(request.learner).toBeTypeOf('string');
        expect(request.learner_grammar).toBeTypeOf('object');
        expect(validate(request, schema)).toEqual([]);
      }
    });

    it('each asks for something of the answer the other does not', () => {
      const [a, b] = pair.map((p) => p.example.expect);
      expect(a).not.toEqual(b);
    });
  });
});
