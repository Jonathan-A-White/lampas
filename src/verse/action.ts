// src/verse/action.ts — which action the Verse view (src/VerseView.tsx) has chosen, kept on the phone so the next verse opens on it too
// (mw-5r3p30.79). Listen is the first and the gentlest, so it is where a new phone starts. Practise (mw-5r3p30.899) is the door to copywork, narration, dictation, summary and the quiz (src/practise/), the
// quiz (mw-5r3p30.74) being one of its doors: it opens the Talk sheet in quiz mode. Diagram (mw-souyao.3) draws the verse's sentence diagram (src/diagram/DiagramPane.tsx).
import { useCallback, useState } from 'react';
import type { SourceLanguage } from '../data/chapter';
import { useAiAllowed } from '../gate/licenceContext';
import { hebrewInterestSetting, hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import { useSetting } from '../settings/store';

export const VERSE_ACTIONS = [
  { id: 'listen', label: 'Listen' },
  { id: 'read', label: 'Read it aloud' },
  { id: 'ask', label: 'Ask the tutor' },
  { id: 'practise', label: 'Practise' },
  { id: 'diagram', label: 'Diagram' },
] as const;

export type VerseAction = (typeof VERSE_ACTIONS)[number]['id'];

/** The actions that are the AI's (mw-8m9dyu.2, mw-8m9dyu.5): they need a licence, so an unlicensed phone is not offered them. Read it aloud is one: his reading is
 * sent to the mill (the verse-read grist). */
const AI_ACTIONS: readonly VerseAction[] = ['read', 'ask', 'practise', 'diagram'];

/** Whether the quiz, a door of Practise, is offered on a verse of this source language: on every Greek verse; on an Old Testament ('hbo') verse once there is Hebrew to quiz on (mw-uqlxea.3, mw-gdcyf98.21):
 * the Talk sheet's quiz request carries the verse's `hebrew` and `hebrew_words` from the Hebrew dial's Curious up (src/services/talk.ts), so at Hebrew 0, where the talk holds the English alone, it is not offered.
 * The other actions (Listen, Read it aloud, Ask the tutor, Practise, Diagram) are offered on both: Diagram for Hebrew as for Greek (mw-5r3p30.887), and Practise's copywork in English and the verse's own script. */
export const quizOffered = (lang: SourceLanguage, hebrewOn: boolean): boolean => lang === 'grc' || hebrewOn;

/** The actions the Verse view offers: all of them with a licence, only Listen without; Diagram only when the view holds one verse (`oneVerse`, true by default: a sentence diagram is of one verse, mw-5r3p30.895). Read it aloud is offered in the Hebrew view of an Old Testament verse as in the English one (mw-gdcyf98.14: its reading check is scored in Hebrew). */
export const actionsFor = (ai: boolean, oneVerse = true): typeof VERSE_ACTIONS[number][] =>
  VERSE_ACTIONS.filter((a) => (ai || !AI_ACTIONS.includes(a.id)) && (oneVerse || a.id !== 'diagram'));

/** Whether the Hebrew dial is above 0 (some Hebrew is wanted): the tutor's quiz on an Old Testament verse is in its Hebrew from there. */
export const useHebrewOn = (): boolean => hebrewLevelOf(useSetting(hebrewInterestSetting)) >= 1;

const KEY = 'lampas.verseAction';

export function getVerseAction(): VerseAction {
  try {
    const saved = localStorage.getItem(KEY);
    // a phone left on Quiz me (before mw-5r3p30.899) opens on Practise, whose door holds the quiz
    if (saved === 'quiz') return 'practise';
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
  // Left on Read it aloud, Ask the tutor, Practise or Diagram by a licensed phone, an unlicensed one opens on Listen (what is kept stays, for when the licence is back).
  return [!ai && AI_ACTIONS.includes(action) ? 'listen' : action, choose];
}
