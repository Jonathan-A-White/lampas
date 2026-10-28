// tests/unit/verse-action.test.ts — the Verse view's actions (src/verse/action.ts): Diagram is the fifth, after Quiz me, and it is the AI's (mw-souyao.3).
import { beforeEach, describe, expect, it } from 'vitest';
import { actionsFor, getVerseAction, setVerseAction, VERSE_ACTIONS } from '../../src/verse/action';

beforeEach(() => window.localStorage.clear());

describe('the Verse view actions', () => {
  it('lists Diagram after Quiz me', () => {
    expect(VERSE_ACTIONS.map((a) => a.label)).toEqual(['Listen', 'Read it aloud', 'Ask the tutor', 'Quiz me', 'Diagram']);
    expect(VERSE_ACTIONS[4]).toEqual({ id: 'diagram', label: 'Diagram' });
  });

  it('offers Diagram with a licence and only Listen without', () => {
    expect(actionsFor(true).map((a) => a.id)).toContain('diagram');
    expect(actionsFor(false).map((a) => a.id)).toEqual(['listen']);
  });

  it('keeps Diagram on the phone like the others', () => {
    setVerseAction('diagram');
    expect(getVerseAction()).toBe('diagram');
  });
});

describe('the Verse view actions of an Old Testament verse (mw-5vvlay.3)', () => {
  it('offers Quiz me on an hbo verse, and not Diagram: the diagram epic is Greek and English (mw-gdcyf98.21)', () => {
    expect(actionsFor(true, 'hbo').map((a) => a.id)).toEqual(['listen', 'read', 'ask', 'quiz']);
  });

  it('offers no Quiz me on an hbo verse at Hebrew 0: the talk then holds the English alone', () => {
    expect(actionsFor(true, 'hbo', false).map((a) => a.id)).toEqual(['listen', 'read', 'ask']);
  });

  it('offers a Greek verse every action whatever the Hebrew dial says', () => {
    expect(actionsFor(true, 'grc', false).map((a) => a.id)).toEqual(['listen', 'read', 'ask', 'quiz', 'diagram']);
  });

  it('offers an unlicensed phone only Listen on an hbo verse, as on a Greek one', () => {
    expect(actionsFor(false, 'hbo').map((a) => a.id)).toEqual(['listen']);
  });
});
