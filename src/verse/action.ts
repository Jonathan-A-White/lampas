// src/verse/action.ts — which action the Verse view (src/VerseView.tsx) has chosen, kept on the phone so the next verse opens on it too
// (mw-5r3p30.79). Listen is the first and the gentlest, so it is where a new phone starts. Quiz me (mw-5r3p30.74) opens the Talk sheet in quiz mode. Diagram (mw-souyao.3) draws the verse's sentence diagram (src/diagram/DiagramPane.tsx).
import { useCallback, useState } from 'react';
import type { SourceLanguage } from '../data/chapter';
import { useAiAllowed } from '../gate/licenceContext';
import { hebrewInterestSetting, hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import { useSetting } from '../settings/store';

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

/** The actions an Old Testament ('hbo') verse is offered on a condition (mw-uqlxea.3, mw-gdcyf98.21). Diagram is offered for Hebrew as for Greek (mw-5r3p30.887: the diagram epic, src/diagram/, draws the Hebrew
 * words in pieces, right to left). Quiz me is, once there is Hebrew to quiz on: it opens the Talk sheet's quiz, whose request carries the verse's `hebrew` and `hebrew_words` from the Hebrew dial's Curious up (src/services/talk.ts), so at
 * Hebrew 0, where the talk holds the English alone, it is not offered. The others (Listen, Read it aloud, Ask the tutor) work on the English, and Ask the tutor also sends the Hebrew (src/services/hebrewWords.ts). */
const SOURCE_ACTIONS: readonly VerseAction[] = ['quiz'];

/** Whether an action is offered on a verse of this source language: every action on a Greek verse; on an Old Testament verse every action, Quiz me only with some Hebrew (`hebrewOn`). */
const offered = (id: VerseAction, lang: SourceLanguage, hebrewOn: boolean): boolean => lang === 'grc' || !SOURCE_ACTIONS.includes(id) || (id === 'quiz' && hebrewOn);

/** The actions the Verse view offers: all of them with a licence, only Listen without; Quiz me for an Old Testament chapter only
 * with the Hebrew dial above 0 (`hebrewOn`, true by default). Read it aloud is offered in the Hebrew view of an Old Testament verse as in the English one (mw-gdcyf98.14: its reading check is scored in Hebrew). */
export const actionsFor = (ai: boolean, lang: SourceLanguage = 'grc', hebrewOn = true): typeof VERSE_ACTIONS[number][] =>
  VERSE_ACTIONS.filter((a) => (ai || !AI_ACTIONS.includes(a.id)) && offered(a.id, lang, hebrewOn));

/** Whether the Hebrew dial is above 0 (some Hebrew is wanted): the tutor's quiz on an Old Testament verse is in its Hebrew from there. */
export const useHebrewOn = (): boolean => hebrewLevelOf(useSetting(hebrewInterestSetting)) >= 1;

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
  const hebrewOn = useHebrewOn();
  const choose = useCallback((next: VerseAction) => {
    setVerseAction(next);
    set(next);
  }, []);
  // Left on Read it aloud, Ask the tutor, Quiz me or Diagram by a licensed phone, an unlicensed one opens on Listen (what is kept stays, for when the licence is back);
  // left on Quiz me at Hebrew 0, an Old Testament verse opens on Listen too (the kept action is not changed, so the next verse opens on it).
  return [(!ai && AI_ACTIONS.includes(action)) || !offered(action, lang, hebrewOn) ? 'listen' : action, choose];
}
