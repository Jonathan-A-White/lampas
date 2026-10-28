// mw-5r3p30.681: a smoke run had the tutor, in a quiz with his goal already kept, answer with quiz_goal_offer set to that same goal. The instructions say plainly that a kept
// goal is never offered, and the app drops an offer that is the goal he has (or the one he chose Just this time for) so a slip cannot ask him to set it again.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { quizGoalOfferOf } from '../../src/talk/quizGoalOffer';
import { isTalkAnswer } from '../../src/services/talk';
import { instructionsOf } from '../../scripts/grind-parts';

describe('the instructions on his quiz goal', () => {
  const all = instructionsOf('bible-talk');
  const part = all.slice(all.indexOf('### His quiz goal'), all.indexOf('### Pitching the quiz at him')).replace(/\s+/g, ' ');

  it('says quiz_goal_offer is absent in every turn when quiz_goal holds a goal', () => {
    expect(part).toMatch(/When `quiz_goal` holds a goal[^.]*`quiz_goal_offer` is absent in every turn/);
  });

  it('gives the offer only for a goal not yet kept', () => {
    const offerLine = part.slice(part.indexOf('- Only when `quiz_goal` is null'));
    expect(offerLine).toMatch(/only when `quiz_goal` is null and `quiz_goal_once` is missing/i);
  });
});

describe('the quiz goal offer the app keeps', () => {
  it('keeps an offer when no goal is kept', () => {
    expect(quizGoalOfferOf('understanding what the passage says', { kept: '' })).toBe('understanding what the passage says');
  });

  it('drops an offer that is the kept goal, however it is cased or spaced', () => {
    expect(quizGoalOfferOf('understanding what the passage says', { kept: 'understanding what the passage says' })).toBeUndefined();
    expect(quizGoalOfferOf(' Understanding  what the passage says ', { kept: 'understanding what the passage says' })).toBeUndefined();
  });

  it('drops an offer that is the goal he chose Just this time for', () => {
    expect(quizGoalOfferOf('learning Greek', { kept: '', once: 'learning Greek' })).toBeUndefined();
  });

  it('keeps an offer that differs from the kept goal (he asked to change it)', () => {
    expect(quizGoalOfferOf('learning Greek', { kept: 'understanding what the passage says' })).toBe('learning Greek');
  });

  it('has nothing when the answer offered nothing', () => {
    expect(quizGoalOfferOf(undefined, { kept: 'learning Greek' })).toBeUndefined();
  });
});

describe('a quiz_goal_state of kept or once (mw-gdcyf98.32)', () => {
  it('drops an offer written beside kept or once, whatever its words', () => {
    expect(quizGoalOfferOf('learning Hebrew', { kept: 'something else' }, 'kept')).toBeUndefined();
    expect(quizGoalOfferOf('learning Hebrew', { kept: '' }, 'once')).toBeUndefined();
  });

  it('keeps an offer written beside none', () => {
    expect(quizGoalOfferOf('learning Hebrew', { kept: '' }, 'none')).toBe('learning Hebrew');
  });
});

describe('the answer schema holds a slip of the model (mw-gdcyf98.32)', () => {
  const schema = JSON.parse(readFileSync('grinds/bible-talk.answer.schema.json', 'utf8'));

  it('allows quiz_goal_offer only with a quiz_goal_state of none', () => {
    expect(schema.if).toEqual({ required: ['quiz_goal_offer'] });
    expect(schema.then.required).toEqual(['quiz_goal_state']);
    expect(schema.then.properties.quiz_goal_state).toEqual({ const: 'none' });
    expect(schema.properties.quiz_goal_state.enum).toEqual(['kept', 'once', 'none']);
  });

  it('puts quiz_goal_state before quiz_goal_offer, so the model writes it first', () => {
    const keys = Object.keys(schema.properties);
    expect(keys.indexOf('quiz_goal_state')).toBe(keys.indexOf('quiz_goal_offer') - 1);
  });

  it('is a key the app accepts and checks', () => {
    expect(isTalkAnswer({ answer: 'a', question: 'q', words: [], quiz_goal_state: 'kept' })).toBe(true);
    expect(isTalkAnswer({ answer: 'a', question: 'q', words: [], quiz_goal_state: 'sometimes' })).toBe(false);
  });
});
