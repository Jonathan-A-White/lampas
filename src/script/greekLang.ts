// src/script/greekLang.ts — how a Greek span is tagged (mw-cwf538.3). Android's text to speech has a Greek voice under 'el' and none under 'grc', so TalkBack reads a
// span with lang="grc" in the phone's own language; lang="el" gets the Greek voice. The ancient-Greek meaning stays in data-lang="grc". Every Greek span spreads
// GREEK_LANG (or greekLang / langOf when it is Greek only sometimes); no span writes lang="grc" itself (tests/unit/greek-lang.test.ts).
import type { SourceLanguage } from '../data/chapter';

export const GREEK_LANG = { lang: 'el', 'data-lang': 'grc' } as const;

/** The attributes of a span that is Greek when `greek` is true, and carries no language otherwise. */
export const greekLang = (greek: boolean): { lang?: 'el'; 'data-lang'?: 'grc' } => (greek ? GREEK_LANG : {});

/** The attributes of text that is Greek or English. */
export const langOf = (greek: boolean): { lang: 'el' | 'en'; 'data-lang'?: 'grc' } => (greek ? GREEK_LANG : { lang: 'en' });

/** The attributes of text in a chapter's own language, or English (mw-gdcyf98.4): Hebrew ('hbo') is lang he, right to left, in the Hebrew face (`className` .script-he; the ancient meaning in data-lang),
 * Greek ('grc') the el ones, and 'en' English. A caller that sets its own className puts it after the spread and joins `className` in. */
export const langOfSource = (
  source: SourceLanguage | 'en',
): { lang: 'he' | 'el' | 'en'; 'data-lang'?: 'hbo' | 'grc'; dir?: 'rtl'; className?: 'script-he' } =>
  source === 'hbo' ? { lang: 'he', 'data-lang': 'hbo', dir: 'rtl', className: 'script-he' } : source === 'grc' ? GREEK_LANG : { lang: 'en' };

/**
 * How a word of the source text is drawn (mw-gdcyf98.19): the attributes and class of a Greek word (`greek`, after the Greek face) or a Hebrew one (`hebrew`, after .script-he: use hebrew-form for the
 * big word of a card, hebrew-choice for a choice or a row, which win over .script-he's own 1.25em; a plain size class would not). A word with no language is Greek.
 */
export const faceOf = (
  lang: SourceLanguage | undefined,
  { greek, hebrew }: { greek: string; hebrew: string },
  extra = '',
): { lang: 'he' | 'el'; 'data-lang': 'hbo' | 'grc'; dir?: 'rtl'; className: string } =>
  lang === 'hbo'
    ? { lang: 'he', 'data-lang': 'hbo', dir: 'rtl', className: `script-he ${hebrew} ${extra}`.trim() }
    : { ...GREEK_LANG, className: `font-greek ${greek} ${extra}`.trim() };
