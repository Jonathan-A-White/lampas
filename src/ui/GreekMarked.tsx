// src/ui/GreekMarked.tsx — a stretch of English prose with its Greek marked (lang el), so the Greek font and the Greek voice find it, drawn in the
// app's Greek type (Gentium Plus at --lp-greek-size) as everywhere else. The essay (src/Essay.tsx) and the idea sheet's teaching use it. markedFor(lang) is the
// marking of the ladder in hand (mw-gdcyf98.10): Greek marked as above, Hebrew marked lang he, right to left, in the bundled Hebrew face (.script-he).
import type { ReactNode } from 'react';
import type { LadderLang } from '../data/grammar/ladders';
import { GREEK_LANG } from '../script/greekLang';
import { HEBREW_LANG_ATTRS } from '../reader/sourceText';

// a hyphen right before Greek is part of it: '-ου' is an ending
const GREEK = /(-?[Ͱ-Ͽἀ-῿][Ͱ-Ͽἀ-῿ ,-]*[Ͱ-Ͽἀ-῿]|-?[Ͱ-Ͽἀ-῿])/;

/** `greekClass` is how the Greek is drawn: the reading size by default; a table passes the Greek face alone, at the size around it. */
export function greekMarked(text: string, greekClass = 'font-greek text-[length:var(--lp-greek-size)]'): ReactNode {
  return text.split(GREEK).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} {...GREEK_LANG} className={greekClass}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// a run of Hebrew letters, points and marks (a space joins the words of a phrase); the maqaf and the sof pasuq are punctuation of the script
const HEBREW = /([\u0590-\u05FF][\u0590-\u05FF ]*[\u0590-\u05FF]|[\u0590-\u05FF])/;

/** A stretch of English prose with its Hebrew marked (lang he, dir rtl, data-lang hbo), so the Hebrew font and the Hebrew voice find it. `hebrewClass` is how the Hebrew is drawn. */
export function hebrewMarked(text: string, hebrewClass = 'script-he'): ReactNode {
  return text.split(HEBREW).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} {...HEBREW_LANG_ATTRS} dir="rtl" className={hebrewClass}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** The text of a ladder with its own script marked: Greek for the Greek ladder, Hebrew for the Hebrew one. */
export const markedFor = (lang: LadderLang, text: string): ReactNode => (lang === 'hbo' ? hebrewMarked(text) : greekMarked(text));
