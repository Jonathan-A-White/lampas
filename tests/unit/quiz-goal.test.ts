// Quiz goal (mw-5r3p30.185): why he wants the quiz is kept in the settings store ('quizGoal', text), goes in every quiz request as `quiz_goal` (null when
// none is kept), a goal he chose Just this time for rides as `quiz_goal_once`, and the answer may offer one in `quiz_goal_offer`.
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { getQuizGoal, QUIZ_GOAL_MAX, setQuizGoal } from '../../src/data/repositories';
import { applyChanges } from '../../src/settings/registry';
import { buildTalkRequest, isTalkAnswer, MAX_REQUEST_BYTES } from '../../src/services/talk';
import { validate, type Schema } from '../support/schema-validate';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
});

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const input = JSON.parse(readFileSync('grinds/bible-talk.input.schema.json', 'utf8')) as Schema & { required: string[] };
const answerSchema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8')) as Schema & { properties: Record<string, unknown>; required: string[] };
const quiz = { title: 'Romans 8', chapter, verse: chapter.verses[10], quiz: true };
const build = (goal: { kept: string; once?: string }, scope = quiz) => buildTalkRequest(scope, 'Quiz me.', [], [], {}, undefined, undefined, undefined, [], [], 0, goal);

describe('the kept goal', () => {
  it('is empty until kept, and keeps what he wrote trimmed and cut to the limit', async () => {
    expect(await getQuizGoal()).toBe('');
    await setQuizGoal('  learning Greek ');
    expect(await getQuizGoal()).toBe('learning Greek');
    await setQuizGoal('x'.repeat(QUIZ_GOAL_MAX + 20));
    expect((await getQuizGoal()).length).toBe(QUIZ_GOAL_MAX);
    await setQuizGoal('');
    expect(await getQuizGoal()).toBe('');
  });

  it('is a setting the tutor may change outside a quiz, and clear with an empty value', async () => {
    const set = await applyChanges([{ key: 'quizGoal', value: 'learning English' }]);
    expect(set.applied.map((c) => c.shown)).toEqual(['Quiz goal: learning English']);
    expect(await getQuizGoal()).toBe('learning English');
    await applyChanges([{ key: 'quizGoal', value: '' }]);
    expect(await getQuizGoal()).toBe('');
    expect((await applyChanges([{ key: 'quizGoal', value: 'x'.repeat(QUIZ_GOAL_MAX + 1) }])).refused).toHaveLength(1);
  });
});

describe('the request', () => {
  it('says quiz_goal null when none is kept, and the goal when one is', () => {
    expect(build({ kept: '' }).quiz_goal).toBeNull();
    expect(build({ kept: 'understanding the passage' }).quiz_goal).toBe('understanding the passage');
  });

  it('carries quiz_goal_once only with no goal kept', () => {
    expect(build({ kept: '', once: 'learning Greek' }).quiz_goal_once).toBe('learning Greek');
    expect('quiz_goal_once' in build({ kept: '' })).toBe(false);
    expect('quiz_goal_once' in build({ kept: 'learning English', once: 'learning Greek' })).toBe(false);
  });

  it('has neither outside a quiz', () => {
    const r = build({ kept: 'learning Greek', once: 'x' }, { ...quiz, quiz: false });
    expect('quiz_goal' in r).toBe(false);
    expect('quiz_goal_once' in r).toBe(false);
  });

  it('is described by the input schema: optional, a short string or null', () => {
    expect(input.required).not.toContain('quiz_goal');
    expect(validate(build({ kept: '' }), input)).toEqual([]);
    expect(validate(build({ kept: 'understanding the passage' }), input)).toEqual([]);
    expect(validate(build({ kept: '', once: 'learning Greek' }), input)).toEqual([]);
    expect(validate({ ...build({ kept: '' }), quiz_goal: 'x'.repeat(QUIZ_GOAL_MAX + 1) }, input)).not.toEqual([]);
    expect(validate({ ...build({ kept: '' }), quiz_goal: 3 }, input)).not.toEqual([]);
    expect(new TextEncoder().encode(JSON.stringify(build({ kept: 'x'.repeat(QUIZ_GOAL_MAX) }))).length).toBeLessThan(MAX_REQUEST_BYTES);
  });
});

describe('the answer', () => {
  const base = { answer: 'Is this how you want me to quiz you from now on?', question: 'What does it say?', words: [] };

  it('may carry a short quiz_goal_offer and no other long or empty one', () => {
    expect(isTalkAnswer({ ...base, quiz_goal_offer: 'understanding the passage' })).toBe(true);
    expect(isTalkAnswer({ ...base, quiz_goal_offer: '' })).toBe(false);
    expect(isTalkAnswer({ ...base, quiz_goal_offer: 'x'.repeat(QUIZ_GOAL_MAX + 1) })).toBe(false);
    expect(isTalkAnswer({ ...base, quiz_goal_offer: 3 })).toBe(false);
  });

  it('is described by the answer schema as optional', () => {
    expect(answerSchema.properties.quiz_goal_offer).toBeDefined();
    expect(answerSchema.required).not.toContain('quiz_goal_offer');
    expect(validate({ ...base, quiz_goal_offer: 'learning Greek', quiz_goal_state: 'none' }, answerSchema)).toEqual([]);
    expect(validate({ ...base, quiz_goal_offer: 'x'.repeat(QUIZ_GOAL_MAX + 1) }, answerSchema)).not.toEqual([]);
  });
});
