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
