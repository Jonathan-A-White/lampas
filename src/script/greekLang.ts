// src/script/greekLang.ts — how a Greek span is tagged (mw-cwf538.3). Android's text to speech has a Greek voice under 'el' and none under 'grc', so TalkBack reads a
// span with lang="grc" in the phone's own language; lang="el" gets the Greek voice. The ancient-Greek meaning stays in data-lang="grc". Every Greek span spreads
// GREEK_LANG (or greekLang / langOf when it is Greek only sometimes); no span writes lang="grc" itself (tests/unit/greek-lang.test.ts).
export const GREEK_LANG = { lang: 'el', 'data-lang': 'grc' } as const;

/** The attributes of a span that is Greek when `greek` is true, and carries no language otherwise. */
export const greekLang = (greek: boolean): { lang?: 'el'; 'data-lang'?: 'grc' } => (greek ? GREEK_LANG : {});

/** The attributes of text that is Greek or English. */
export const langOf = (greek: boolean): { lang: 'el' | 'en'; 'data-lang'?: 'grc' } => (greek ? GREEK_LANG : { lang: 'en' });
