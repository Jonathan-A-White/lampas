// src/verse/action.ts — which action the Verse view (src/VerseView.tsx) has chosen, kept on the phone so the next verse opens on it too
// (mw-5r3p30.79). Listen is the first and the gentlest, so it is where a new phone starts. Quiz me (mw-5r3p30.74) opens the Talk sheet in quiz mode. Diagram (mw-souyao.3) draws the verse's sentence diagram (src/diagram/DiagramPane.tsx).
import { useCallback, useState } from 'react';
import type { SourceLanguage } from '../data/chapter';
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

/** The actions that need the verse's source language taught (mw-uqlxea.3): Quiz me asks about the Greek and Diagram draws its words. An Old Testament ('hbo') verse is not offered them
 * (mw-5vvlay.3): Quiz me is the Talk sheet's quiz, written in the Greek ladder's terms, and the drill-items grind it would use takes Greek grammar ideas and Greek words (docs/hebrew.md says what a
 * Hebrew quiz would need). The others (Listen, Read it aloud, Ask the tutor) work on the English, and Ask the tutor also sends the Hebrew (src/services/hebrewWords.ts). */
const SOURCE_ACTIONS: readonly VerseAction[] = ['quiz', 'diagram'];

/** The actions the Verse view offers: all of them with a licence, only Listen without; the source language's own (Quiz me, Diagram) only for a chapter read in Greek, chosen by `lang`, not by the view.
 * Read it aloud is offered in the Hebrew view of an Old Testament verse as in the English one (mw-gdcyf98.14: its reading check is scored in Hebrew). */
export const actionsFor = (ai: boolean, lang: SourceLanguage = 'grc'): typeof VERSE_ACTIONS[number][] =>
  VERSE_ACTIONS.filter((a) => (ai || !AI_ACTIONS.includes(a.id)) && (lang === 'grc' || !SOURCE_ACTIONS.includes(a.id)));

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
export function useVerseAction(lang: SourceLanguage = 'grc'): [VerseAction, (action: VerseAction) => void] {
  const [action, set] = useState<VerseAction>(getVerseAction);
  const ai = useAiAllowed();
  const choose = useCallback((next: VerseAction) => {
    setVerseAction(next);
    set(next);
  }, []);
  // Left on Read it aloud, Ask the tutor, Quiz me or Diagram by a licensed phone, an unlicensed one opens on Listen (what is kept stays, for when the licence is back);
  // left on Quiz me or Diagram, an Old Testament verse opens on Listen too (the kept action is not changed, so the next verse opens on it).
  return [(!ai && AI_ACTIONS.includes(action)) || (lang !== 'grc' && SOURCE_ACTIONS.includes(action)) ? 'listen' : action, choose];
}
