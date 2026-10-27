// src/memorize/target.ts — the text a verse is memorized in (docs/layout/memorize.md): a per-token {text, lang} sequence, in English, in Greek or in the weave
// of the moment. tokensOf is pure; memorizeTarget reads a canonical reference through refs.ts. The weave is never stored: it is wovenOf's, over his
// words and the Reader's Weave settings as they are when it is asked, so a verse that has moved toward Greek is judged against the Greek.
import { sourceLanguage, type SourceLanguage, type Verse } from '../data/chapter';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { wovenOf } from '../reader/useWoven';
import type { ReaderSettings } from '../reader/useReaderSettings';
import { versesOf } from './refs';

/** The text a verse is learned in: English, Greek, Hebrew, or the Reader's weave of the moment (of the verse's own language). */
export type TargetLang = 'en' | 'el' | 'he' | 'weave';

/** One word to be said. `chunk` is the verse's English chunk it belongs to (-1: a source word the translation gives no English); `word` is the source word's place in the verse's `g`, only on a Greek or Hebrew token. */
export interface Token {
  text: string;
  lang: 'en' | 'el' | 'he';
  chunk: number;
  word?: number;
}

/** A token with the number of the verse it is in. */
export type VerseToken = Token & { verse: number };

const wordsOf = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/** A source word as it is said: a Hebrew word the table glues a petuhah or setumah mark to (' פ', ' ס') is the word alone. */
const wordText = (text: string, source: SourceLanguage): string => (source === 'hbo' ? text.replace(/\s+[פס]$/u, '') : text);

/**
 * The words of one verse. 'en': every word of every English chunk, in English order. 'el' / 'he': every Greek (Hebrew) word in its order, the Hebrew pointed with its cantillation (the
 * display; the judge ignores both). 'weave': the chunks in the order the
 * weave draws them (`woven` is the verse's, from wovenOf; null or absent: nothing is woven, so English), a woven chunk's source words as 'el' (or, for a verse of `source` 'hbo', 'he') tokens, every other
 * chunk's English words as 'en' tokens, a sentence's moved closing mark where chunkText puts it. Tokens are the same words the reading check hears (src/services/reading.ts
 * wovenReading), split on white space.
 */
export function tokensOf(verse: Verse, lang: TargetLang, woven?: WovenVerse | null, source: SourceLanguage = lang === 'he' ? 'hbo' : 'grc'): Token[] {
  const own = source === 'hbo' ? 'he' : 'el';
  if (lang === 'el' || lang === 'he') return verse.g.map((w, i) => ({ text: wordText(w.t, source), lang: own, chunk: w.e ?? -1, word: i }));
  if (lang === 'en') return verse.e.flatMap((c, i) => wordsOf(c.t).map((text): Token => ({ text, lang: 'en', chunk: i })));
  return drawnOrder(verse, woven ?? null).flatMap((i): Token[] => {
    if (woven?.[i]) return verse.e[i].g.map((g) => ({ text: wordText(verse.g[g].t, source), lang: own, chunk: i, word: g }));
    return wordsOf(chunkText(verse, woven, i)).map((text): Token => ({ text, lang: 'en', chunk: i }));
  });
}

/** What a canonical reference is learned as: its heading and its words, verse after verse. */
export interface MemorizeTokens {
  heading: string;
  lang: TargetLang;
  tokens: VerseToken[];
}

export type MemorizeTarget = MemorizeTokens;

/**
 * The words of the verse or range a canonical reference names ('Rom.8.28', 'Rom.8.28-29'), each carrying its verse number. `weave` is the Reader's settings the weave
 * is made from (as wovenOf takes them: the view, the Weave, its grammar dial and order, his solid and learning lemmas); the caller reads them now, so the weave is the
 * weave of the moment. With the weave off, or no settings, the weave target is English. A verse is learned in its own language only (mw-gdcyf98.15): 'el' on an Old Testament verse and 'he' on a New
 * Testament one are its English. A string that names no verse gives null.
 */
export async function memorizeTarget(canonical: string, lang: TargetLang, weave?: Partial<ReaderSettings>): Promise<MemorizeTarget | null> {
  const found = await versesOf(canonical);
  if (!found) return null;
  // a verse is learned in its own language, English, or the weave of the two: Greek is never a language of an Old Testament verse, nor Hebrew of a New Testament one
  const source = sourceLanguage(found.source);
  const as: TargetLang = lang === (source === 'hbo' ? 'el' : 'he') ? 'en' : lang;
  const chapterWoven = as === 'weave' && weave ? wovenOf(found.source, weave) : null;
  const tokens = found.verses.flatMap((verse) => {
    const woven = chapterWoven?.[found.source.verses.indexOf(verse)] ?? null;
    return tokensOf(verse, as, woven, source).map((t): VerseToken => ({ ...t, verse: verse.n }));
  });
  return { heading: found.heading, lang: as, tokens };
}
