// src/reader/sourceText.ts — how a chapter's own words are tagged and set (mw-5vvlay.1): Greek in the Greek face, left to right, or Hebrew in the app's Hebrew face (.script-he),
// right to left. The Reader's one 'source' view (ReaderView 'greek' in code) is the Greek of a Greek chapter and the Hebrew of an Old Testament one.
import type { SourceLanguage } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { GREEK_LANG, langOfSource } from '../script/greekLang';

/** How a Hebrew span is tagged: lang he, the ancient meaning in data-lang. */
export const HEBREW_LANG_ATTRS = { lang: 'he', 'data-lang': 'hbo' } as const;

/** The attributes of the words of a chapter in its own language. */
export const sourceAttrs = (source: SourceLanguage): typeof GREEK_LANG | typeof HEBREW_LANG_ATTRS => (source === 'hbo' ? HEBREW_LANG_ATTRS : GREEK_LANG);

/** The language of the speech that says the chapter's own words. */
export const sourceSpeech = (source: SourceLanguage): 'greek' | 'hebrew' => (source === 'hbo' ? 'hebrew' : 'greek');

/** The face and size of the chapter's own words: the Greek face at the Greek size, or the Hebrew face (src/index.css .reader-hebrew gives it the Greek size and the Reader's leading). */
export const sourceFace = (source: SourceLanguage): string => (source === 'hbo' ? 'script-he reader-hebrew' : 'font-greek text-[length:var(--lp-greek-size)]');

/** The attributes of a row of verse text: the source view is Hebrew right to left or Greek; the English view is English, and an Old Testament weave laid out in the Hebrew
 * word order (`ordered`) is a row that runs right to left too, its English chunks each isolated left to right (VerseText). */
export function rowAttrs(view: ReaderView, source: SourceLanguage, ordered = false): { lang: string; dir?: 'rtl'; 'data-lang'?: string } {
  if (view === 'greek') {
    // the face (className) is the caller's: textClass gives it
    const own = langOfSource(source);
    return { lang: own.lang, ...(own['data-lang'] ? { 'data-lang': own['data-lang'] } : {}), ...(own.dir ? { dir: own.dir } : {}) };
  }
  return source === 'hbo' && ordered ? { lang: 'en', dir: 'rtl' } : { lang: 'en' };
}

/** Whether a weave lays its verses out in a source order of its own (the Order setting's Greek, or Hebrew for an Old Testament chapter). */
export const isOrdered = (woven: readonly ({ order?: readonly number[] } | null)[] | null | undefined): boolean => woven?.some((w) => w?.order !== undefined) === true;
