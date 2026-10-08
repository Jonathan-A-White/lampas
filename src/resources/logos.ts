// src/resources/logos.ts — I have Logos: 'Open in Logos: <lexicon>' for each lexicon of his library that he ticked in Settings, at the
// word's headword, and 'Bible Word Study in Logos' for the lemma (at the verse when the sheet knows it). Every link is the Logos app's own
// scheme first (logosres: for a resource, logos4: for a guide) and carries the https ref.ly address as the fallback, opened only when the
// phone cannot open the scheme (src/resources/openApp.ts). docs/resources.md names the sources and what is UNVERIFIED.
import type { StudyLink, StudyResource, StudyWord } from './types';

/** His Logos lexicons, in the order Logos' Bible Word Study shows them. `id` is kept in the settings store (never change it); `short` is its tile on the word sheet (it must
 *  not wrap in half a 360 px row); `resource` is the Logos resource id the link names. Adding a lexicon is one line here. All resource ids are UNVERIFIED (docs/resources.md). */
const LEXICONS = [
  { id: 'bdag', short: 'BDAG', name: 'BDAG', resource: 'bdag' },
  { id: 'louwnida', short: 'Louw-Nida', name: 'Louw-Nida', resource: 'louwnida' },
  { id: 'lexhamtheolwordbk', short: 'Lexham', name: 'Lexham Theological Wordbook', resource: 'lexhamtheolwordbk' },
  { id: 'dbl', short: 'DBL Greek', name: 'DBL Greek', resource: 'dblgreek' },
  { id: 'ednt', short: 'EDNT', name: 'EDNT', resource: 'ednt' },
  { id: 'nasbdict', short: 'NASB Dict.', name: 'NASB Dictionaries', resource: 'nasbdictionaries' },
  { id: 'leh', short: 'LEH LXX', name: 'LEH LXX Lexicon', resource: 'lehlxx' },
  { id: 'intermediategel', short: 'Intermediate', name: 'An Intermediate Greek-English Lexicon', resource: 'liddellscott' },
  { id: 'lxgrcanlex', short: 'LXGRCANLEX', name: 'LXGRCANLEX', resource: 'lxgrcanlex' },
  { id: 'newstrongs', short: "New Strong's", name: 'The New Strong\'s Dictionary of Hebrew and Greek Words', resource: 'newstrongsdict' },
  { id: 'tdnta', short: 'TDNTA', name: 'TDNTA', resource: 'tdnta' },
  { id: 'vocab3', short: 'Vocab 3', name: 'Building Your New Testament Greek Vocabulary 3rd Edition', resource: 'buildingntvocab3' },
  { id: 'lxgntlex', short: 'LXGNTLEX', name: 'LXGNTLEX', resource: 'lxgntlex' },
  { id: 'lxlxxlex', short: 'LXLXXLEX', name: 'LXLXXLEX', resource: 'lxlxxlex' },
  { id: 'gelnt', short: 'Greek-English NT', name: 'A Greek and English Lexicon to the New Testament', resource: 'greekenglishlexnt' },
  { id: 'biblicotheolexicon', short: 'Cremer', name: 'Biblico-Theological Lexicon of New Testament Greek', resource: 'cremerlexicon' },
  { id: 'lexhamanalyticallxx', short: 'Lexham LXX', name: 'The Lexham Analytical Lexicon of the Septuagint', resource: 'lexhamanalyticallxx' },
  { id: 'manualgreeklex', short: 'Abbott-Smith', name: 'A Manual Greek Lexicon of the New Testament', resource: 'abbottsmithmanual' },
  { id: 'pocketlex', short: 'Pocket Lexicon', name: 'A Pocket Lexicon to the Greek New Testament', resource: 'pocketlexgnt' },
  { id: 'concisedict', short: 'Concise Dict.', name: 'A Concise Dictionary of the Words in the Greek Testament and The Hebrew Bible', resource: 'concisedict' },
  { id: 'gelntthayer', short: 'Thayer', name: 'A Greek-English Lexicon of the New Testament', resource: 'thayerlexicon' },
] as const;

/** The Logos reference abbreviation of each New Testament book, by the data's book code ('act' -> 'Ac'). */
const BOOKS: Record<string, string> = {
  mat: 'Mt', mrk: 'Mk', luk: 'Lk', jhn: 'Jn', act: 'Ac', rom: 'Ro', '1co': '1Co', '2co': '2Co', gal: 'Ga', eph: 'Eph', php: 'Php',
  col: 'Col', '1th': '1Th', '2th': '2Th', '1ti': '1Ti', '2ti': '2Ti', tit: 'Tit', phm: 'Phm', heb: 'Heb', jas: 'Jas', '1pe': '1Pe',
  '2pe': '2Pe', '1jn': '1Jn', '2jn': '2Jn', '3jn': '3Jn', jud: 'Jud', rev: 'Re',
};

/** Logos' own name for a Greek lemma is lbs/el/<lemma>; the slashes must be escaped or Logos rejects the value (a bare lemma opens a search
 *  'lemma.ιησουσ' that finds nothing). docs/resources.md has the source. */
const study = (word: StudyWord): { path: string; fallbackPath: string } => {
  const logosRef = word.ref && BOOKS[word.ref.book] ? `;ref=Bible.${BOOKS[word.ref.book]}${word.ref.chapter}.${word.ref.verse}` : '';
  const guide = `Guide;t=${encodeURIComponent('Bible Word Study')};lemma=${encodeURIComponent(`lbs/el/${word.lemma.normalize('NFC')}`)}${logosRef}`;
  return { path: `logos4:${guide}`, fallbackPath: `https://ref.ly/logos4/${guide}` };
};

export const logos: StudyResource = {
  id: 'logos',
  name: 'Logos',
  kind: 'app',
  describe: 'Adds Open in Logos for each lexicon you tick, and Bible Word Study in Logos, in the Logos app.',
  choices: {
    label: 'Logos lexicons',
    hint: 'Tick the lexicons of your Logos library to open. BDAG is ticked to start with.',
    items: LEXICONS.map(({ id, name }) => ({ id, name })),
    default: ['bdag'],
  },
  linksFor: (word, option) => {
    const ticked = (option ?? '').split(',');
    const lemma = encodeURIComponent(word.lemma);
    const lexicons: StudyLink[] = LEXICONS.filter((l) => ticked.includes(l.id)).map((l) => ({
      label: `Open in Logos: ${l.name}`,
      tile: l.short,
      url: `logosres:${l.resource};hw=${lemma}`,
      fallback: `https://ref.ly/logosres/${l.resource}?hw=${lemma}`,
    }));
    const guide = study(word);
    return [...lexicons, { label: 'Bible Word Study in Logos', tile: 'Word Study', url: guide.path, fallback: guide.fallbackPath }];
  },
};
