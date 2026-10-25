// src/verse/action.ts — which action the Verse view (src/VerseView.tsx) has chosen, kept on the phone so the next verse opens on it too
// (mw-5r3p30.79). Listen is the first and the gentlest, so it is where a new phone starts. Quiz me (mw-5r3p30.74) opens the Talk sheet in quiz mode. Diagram (mw-souyao.3) draws the verse's sentence diagram (src/diagram/DiagramPane.tsx).
import { useCallback, useState } from 'react';
import { useAiAllowed } from '../gate/licenceContext';

export const VERSE_ACTIONS = [
  { id: 'listen', label: 'Listen' },
  { id: 'read', label: 'Read it aloud' },
  { id: 'ask', label: 'Ask the tutor' },
  { id: 'quiz', label: 'Quiz me' },
  { id: 'diagram', label: 'Diagram' },
] as const;

export type VerseAction = (typeof VERSE_ACTIONS)[number]['id'];

/** The actions that are the AI's (mw-8m9dyu.2, mw-8m9dyu.5): they need a licence, so an unlicensed phone is not offered them. Read it aloud is one: his reading is
 * sent to the mill (the verse-read grist). */
const AI_ACTIONS: readonly VerseAction[] = ['read', 'ask', 'quiz', 'diagram'];

/** The actions the Verse view offers: all of them with a licence, only Listen without. */
export const actionsFor = (ai: boolean): typeof VERSE_ACTIONS[number][] => VERSE_ACTIONS.filter((a) => ai || !AI_ACTIONS.includes(a.id));

const KEY = 'lampas.verseAction';

export function getVerseAction(): VerseAction {
  try {
    const saved = localStorage.getItem(KEY);
    return VERSE_ACTIONS.some((a) => a.id === saved) ? (saved as VerseAction) : 'listen';
  } catch {
    return 'listen';
  }
}

/** Chooses the action the Verse view opens on next (the Reading ladder, opened from another screen, opens it on Read it aloud). */
export function setVerseAction(action: VerseAction): void {
  try {
    localStorage.setItem(KEY, action);
  } catch {
    // Storage refused: the next verse opens on Listen again.
  }
}

/** The chosen action and the way to choose another (kept on the phone). */
export function useVerseAction(): [VerseAction, (action: VerseAction) => void] {
  const [action, set] = useState<VerseAction>(getVerseAction);
  const ai = useAiAllowed();
  const choose = useCallback((next: VerseAction) => {
    setVerseAction(next);
    set(next);
  }, []);
  // Left on Read it aloud, Ask the tutor, Quiz me or Diagram by a licensed phone, an unlicensed one opens on Listen (what is kept stays, for when the licence is back).
  return [!ai && AI_ACTIONS.includes(action) ? 'listen' : action, choose];
}
