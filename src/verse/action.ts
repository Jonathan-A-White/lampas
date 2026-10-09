// src/verse/action.ts — which action the Verse view (src/VerseView.tsx) has chosen, kept on the phone so the next verse opens on it too
// (mw-5r3p30.79). Listen is the first and the gentlest, so it is where a new phone starts. 'Quiz me' joins when mw-5r3p30.74 wires it.
import { useCallback, useState } from 'react';

export const VERSE_ACTIONS = [
  { id: 'listen', label: 'Listen' },
  { id: 'read', label: 'Read it aloud' },
  { id: 'ask', label: 'Ask the tutor' },
] as const;

export type VerseAction = (typeof VERSE_ACTIONS)[number]['id'];

const KEY = 'lampas.verseAction';

export function getVerseAction(): VerseAction {
  try {
    const saved = localStorage.getItem(KEY);
    return VERSE_ACTIONS.some((a) => a.id === saved) ? (saved as VerseAction) : 'listen';
  } catch {
    return 'listen';
  }
}

function keepVerseAction(action: VerseAction): void {
  try {
    localStorage.setItem(KEY, action);
  } catch {
    // Storage refused: the next verse opens on Listen again.
  }
}

/** The chosen action and the way to choose another (kept on the phone). */
export function useVerseAction(): [VerseAction, (action: VerseAction) => void] {
  const [action, set] = useState<VerseAction>(getVerseAction);
  const choose = useCallback((next: VerseAction) => {
    keepVerseAction(next);
    set(next);
  }, []);
  return [action, choose];
}
