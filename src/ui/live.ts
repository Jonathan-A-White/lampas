// src/ui/live.ts — the one polite live region of the app (mw-cwf538.3): what happens on a screen without a change he can see or hear from a control (the tutor's answer
// has arrived, a Quick test answer is right or wrong, a reading has come back with words marked) is said to a screen reader (TalkBack) by announce(text). The
// region itself is LiveRegion (LiveRegion.tsx), mounted once in App; a screen announces when the thing happens (in an effect that runs once for it), never
// from a render, so a screen that draws again does not say it again. A screen reader speaks a change of the region's text: the same words twice in a row are
// told apart by a trailing no-break space, so the second is a change too.
import { useSyncExternalStore } from 'react';

const NO_BREAK_SPACE = String.fromCharCode(160);
let said = '';
const listeners = new Set<() => void>();

/** Says `text` to a screen reader, politely: after what it is saying now. Nothing is said for a blank text. */
export function announce(text: string): void {
  const next = text.replace(/\s+/g, ' ').trim();
  if (next === '') return;
  said = next === said.trimEnd() ? (said.endsWith(NO_BREAK_SPACE) ? next : next + NO_BREAK_SPACE) : next;
  listeners.forEach((l) => l());
}

/** What the region says now. */
export const useAnnouncement = (): string =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => said,
    () => '',
  );

/** A Markdown answer as the words a screen reader should hear: no marks, a link as its text. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
