// src/memorize/source.ts — the language a reference's own words are in (mw-gdcyf98.15): 'hbo' for the Old Testament, 'grc' for the New. The one place Memorize decides which dial and which script a verse follows.
import { useLiveQuery } from 'dexie-react-hooks';
import { chapterLanguage } from '../data/chapter';
import { listedOf } from '../lists/canonical';
import { passageOf } from '../lists/passageOf';
import { septuagintSetting } from '../settings/definitions/septuagint';
import type { InterestLang } from '../settings/definitions/interest';
import { useSetting } from '../settings/store';

/** 'hbo' for a reference of the Old Testament, 'grc' for any other (the New Testament, and a string that names no verse). */
export const sourceOf = (canonical: string): InterestLang => (listedOf(canonical)?.testament === 'ot' ? 'hbo' : 'grc');

/**
 * The language a reference's words are in now (mw-u2w5klk.15): sourceOf, except that an Old Testament verse is 'grc' while Settings > Old Testament in Greek (Septuagint) is On and its book is shipped there,
 * since the chapter Memorize learns it from (versesOf) is then Swete's Greek, learned by the Greek dial. A reference that names no verse is Greek, as sourceOf has it.
 */
export async function sourceNow(canonical: string): Promise<InterestLang> {
  const listed = listedOf(canonical);
  if (listed?.testament !== 'ot') return sourceOf(canonical);
  const { held } = passageOf(listed);
  return chapterLanguage(held.book, held.chapter);
}

/** sourceNow as a hook: sourceOf until it is known, and again when the setting changes. */
export function useSource(canonical: string): InterestLang {
  const septuagint = useSetting(septuagintSetting);
  return useLiveQuery(() => sourceNow(canonical), [canonical, septuagint]) ?? sourceOf(canonical);
}
