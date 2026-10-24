// src/memorize/target.ts — the text a verse is memorized in (docs/layout/memorize.md): a per-token {text, lang} sequence, in English, in Greek or in the weave
// of the moment. tokensOf is pure; memorizeTarget reads a canonical reference through refs.ts. The weave is never stored: it is wovenOf's, over his
// words and the Reader's Weave settings as they are when it is asked, so a verse that has moved toward Greek is judged against the Greek.
import type { Verse } from '../data/chapter';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { wovenOf } from '../reader/useWoven';
import type { ReaderSettings } from '../reader/useReaderSettings';
import { versesOf, type OtVerses } from './refs';

/** The text a verse is learned in: English, Greek, or the Reader's weave of the moment. */
export type TargetLang = 'en' | 'el' | 'weave';

/** One word to be said. `chunk` is the verse's English chunk it belongs to (-1: a Greek word the MSB gives no English); `word` is the Greek word's place in the verse's `g`, only on a Greek token. */
export interface Token {
  text: string;
  lang: 'en' | 'el';
  chunk: number;
  word?: number;
}

/** A token with the number of the verse it is in. */
export type VerseToken = Token & { verse: number };

const wordsOf = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/**
 * The words of one verse. 'en': every word of every English chunk, in English order. 'el': every Greek word in Greek order. 'weave': the chunks in the order the
 * weave draws them (`woven` is the verse's, from wovenOf; null or absent: nothing is woven, so English), a woven chunk's Greek words as 'el' tokens, every other
 * chunk's English words as 'en' tokens, a sentence's moved closing mark where chunkText puts it. Tokens are the same words the reading check hears (src/services/reading.ts
 * wovenReading), split on white space.
 */
export function tokensOf(verse: Verse, lang: TargetLang, woven?: WovenVerse | null): Token[] {
  if (lang === 'el') return verse.g.map((w, i) => ({ text: w.t, lang: 'el', chunk: w.e ?? -1, word: i }));
  if (lang === 'en') return verse.e.flatMap((c, i) => wordsOf(c.t).map((text): Token => ({ text, lang: 'en', chunk: i })));
  return drawnOrder(verse, woven ?? null).flatMap((i): Token[] => {
    if (woven?.[i]) return verse.e[i].g.map((g) => ({ text: verse.g[g].t, lang: 'el', chunk: i, word: g }));
    return wordsOf(chunkText(verse, woven, i)).map((text): Token => ({ text, lang: 'en', chunk: i }));
  });
}

/** What a canonical reference is learned as: its heading and its words, verse after verse. */
export interface MemorizeTokens {
  ot?: false;
  heading: string;
  lang: TargetLang;
  tokens: VerseToken[];
}

export type MemorizeTarget = MemorizeTokens | OtVerses;

/**
 * The words of the verse or range a canonical reference names ('Rom.8.28', 'Rom.8.28-29'), each carrying its verse number. `weave` is the Reader's settings the weave
 * is made from (as wovenOf takes them: the view, the Weave, its grammar dial and order, his solid and learning lemmas); the caller reads them now, so the weave is the
 * weave of the moment. With the weave off, or no settings, the weave target is English. An Old Testament reference gives `{ ot: true, heading }` (no text), a string
 * that names no verse gives null.
 */
export async function memorizeTarget(canonical: string, lang: TargetLang, weave?: Partial<ReaderSettings>): Promise<MemorizeTarget | null> {
  const found = await versesOf(canonical);
  if (!found || found.ot) return found;
  const chapterWoven = lang === 'weave' && weave ? wovenOf(found.source, weave) : null;
  const tokens = found.verses.flatMap((verse) => {
    const woven = chapterWoven?.[found.source.verses.indexOf(verse)] ?? null;
    return tokensOf(verse, lang, woven).map((t): VerseToken => ({ ...t, verse: verse.n }));
  });
  return { heading: found.heading, lang, tokens };
}
