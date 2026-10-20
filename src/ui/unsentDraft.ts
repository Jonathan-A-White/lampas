// src/ui/unsentDraft.ts — the words typed or pasted into a question box and not yet sent, kept on the phone per place so that Back or Done does not lose
// them (docs/pwa-best-practices.md section 16: keep the draft; mw-5r3p30.495). localStorage, because it is synchronous: a write lands before the sheet unmounts.
// The Talk sheet keeps one per talk (its talkRef, src/data/repositories/talks.ts) and Ask the tutor one per verse or passage; sending clears it.

const PREFIX = 'lampas.draft.';

/** The key the Talk sheet's unsent words are kept under: one per conversation (a verse's, a chapter's, a screen's, a quiz's). */
export const talkDraftKey = (talkRef: string): string => `${PREFIX}talk.${talkRef}`;

/** The key Ask the tutor's unsent words are kept under: one per verse or passage (`unit` is unitId, '28' or '1-11'). */
export const askDraftKey = (book: string, chapter: number, unit: string): string => `${PREFIX}ask.${book}.${chapter}.${unit}`;

/** What was kept under `key`, or '' where nothing is kept or the phone refuses storage. */
export function readDraft(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Keeps `text` under `key`; empty words (sent, or cleared by hand) drop the draft. A phone that refuses storage loses the draft, as it was. */
export function writeDraft(key: string, text: string): void {
  try {
    if (text === '') window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, text);
  } catch {
    // the phone refuses storage: nothing to keep it in
  }
}
