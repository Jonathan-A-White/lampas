// tests/unit/verse-action.test.ts — the Verse view's actions (src/verse/action.ts): Practise (mw-5r3p30.899) is the fourth, where Quiz me was, and Diagram is the fifth; both are the AI's (mw-souyao.3).
import { beforeEach, describe, expect, it } from 'vitest';
import { actionsFor, getVerseAction, quizOffered, setVerseAction, VERSE_ACTIONS } from '../../src/verse/action';

beforeEach(() => window.localStorage.clear());

describe('the Verse view actions', () => {
  it('lists Practise after Read it aloud and Diagram after Practise: the quiz is a door of Practise, not an action', () => {
    expect(VERSE_ACTIONS.map((a) => a.label)).toEqual(['Listen', 'Read it aloud', 'Practise', 'Diagram']);
    expect(VERSE_ACTIONS[3]).toEqual({ id: 'diagram', label: 'Diagram' });
  });

  it('offers Diagram with a licence and only Listen without', () => {
    expect(actionsFor(true).map((a) => a.id)).toContain('diagram');
    expect(actionsFor(false).map((a) => a.id)).toEqual(['listen']);
  });

  it('opens a phone left on Quiz me (before Practise) on Practise', () => {
    window.localStorage.setItem('lampas.verseAction', 'quiz');
    expect(getVerseAction()).toBe('practise');
  });

  it('keeps Diagram on the phone like the others', () => {
    setVerseAction('diagram');
    expect(getVerseAction()).toBe('diagram');
  });
});

describe('the Verse view actions of an Old Testament verse (mw-5vvlay.3)', () => {
  it('offers every action on any verse: Practise holds copywork in the verse\'s own script, and the Diagram is drawn for Hebrew as for Greek (mw-5r3p30.887)', () => {
    expect(actionsFor(true).map((a) => a.id)).toEqual(['listen', 'read', 'practise', 'diagram']);
  });

  it('leaves Diagram out of a passage and keeps Practise', () => {
    expect(actionsFor(true, false).map((a) => a.id)).toEqual(['listen', 'read', 'practise']);
  });

  it('offers the quiz door on a Greek verse always, and on an hbo verse only with some Hebrew: the talk then holds the English alone', () => {
    expect([quizOffered('grc', false), quizOffered('grc', true)]).toEqual([true, true]);
    expect([quizOffered('hbo', false), quizOffered('hbo', true)]).toEqual([false, true]);
  });

  it('offers an unlicensed phone only Listen', () => {
    expect(actionsFor(false).map((a) => a.id)).toEqual(['listen']);
  });
});
