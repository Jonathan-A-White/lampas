// src/resources/logos.ts — I have Logos: 'Open in Logos: <lexicon>' for each lexicon of his library that he ticked in Settings, at the
// word's headword, and 'Bible Word Study in Logos' for the lemma alone. Every link is the Logos app's own
// scheme first (logosres: for a resource, logos4: for a guide) and carries the https ref.ly address as the fallback, opened only when the
// phone cannot open the scheme (src/resources/openApp.ts). docs/resources.md names the sources and what is UNVERIFIED.
import { verseLink } from './logosBible';
import type { StudyLink, StudyResource, StudyWord } from './types';

/** His Logos lexicons, in the order Logos' Bible Word Study shows them. `id` is kept in the settings store (never change it); `short` is its tile on the word sheet (it must
 *  not wrap in half a 360 px row); `resource` is the Resource ID Logos prints on the product's page (https://www.logos.com/product/<n>, 'Resource ID: LLS:...'; the table is in
 *  docs/resources.md). Adding a lexicon is one line here: copy its Resource ID, never guess a short name (mw-5r3p30.64: the guessed 'ednt' opened nothing). */
const LEXICONS = [
  { id: 'bdag', short: 'BDAG', name: 'BDAG', resource: 'LLS:46.30.18' },
  { id: 'louwnida', short: 'Louw-Nida', name: 'Louw-Nida', resource: 'LLS:46.30.4' },
  { id: 'lexhamtheolwordbk', short: 'Lexham', name: 'Lexham Theological Wordbook', resource: 'LLS:LXTHEOWRDBK' },
  { id: 'dbl', short: 'DBL Greek', name: 'DBL Greek', resource: 'LLS:46.30.9' },
  { id: 'ednt', short: 'EDNT', name: 'EDNT', resource: 'LLS:46.10.26' },
  { id: 'nasbdict', short: 'NASB Dict.', name: 'NASB Dictionaries', resource: 'LLS:46.10.12' },
  { id: 'leh', short: 'LEH LXX', name: 'LEH LXX Lexicon', resource: 'LLS:46.30.22' },
  { id: 'intermediategel', short: 'Intermediate', name: 'An Intermediate Greek-English Lexicon', resource: 'LLS:46.30.1' },
  { id: 'lxgrcanlex', short: 'LXGRCANLEX', name: 'LXGRCANLEX', resource: 'LLS:LXGRCANLEX' },
  { id: 'newstrongs', short: "New Strong's", name: 'The New Strong\'s Dictionary of Hebrew and Greek Words', resource: 'LLS:46.10.6' },
  { id: 'tdnta', short: 'TDNTA', name: 'TDNTA', resource: 'LLS:46.10.1' },
  { id: 'vocab3', short: 'Vocab 3', name: 'Building Your New Testament Greek Vocabulary 3rd Edition', resource: 'LLS:NTGRKVOCAB' },
  { id: 'lxgntlex', short: 'LXGNTLEX', name: 'LXGNTLEX', resource: 'LLS:FBGNTLEX' },
  { id: 'lxlxxlex', short: 'LXLXXLEX', name: 'LXLXXLEX', resource: 'LLS:FBLXXLEX' },
  { id: 'gelnt', short: 'Greek-English NT', name: 'A Greek and English Lexicon to the New Testament', resource: 'LLS:GRKENGLXCNNTBLMSFIELD' },
  { id: 'biblicotheolexicon', short: 'Cremer', name: 'Biblico-Theological Lexicon of New Testament Greek', resource: 'LLS:LEXNTGRKCREMER' },
  { id: 'lexhamanalyticallxx', short: 'Lexham LXX', name: 'The Lexham Analytical Lexicon of the Septuagint', resource: 'LLS:LXGRKOTANLEX' },
  { id: 'manualgreeklex', short: 'Abbott-Smith', name: 'A Manual Greek Lexicon of the New Testament', resource: 'LLS:MNLGRKLXABBOTSMITH' },
  { id: 'pocketlex', short: 'Pocket Lexicon', name: 'A Pocket Lexicon to the Greek New Testament', resource: 'LLS:PCKTLXCNGRKNWTS' },
  { id: 'concisedict', short: 'Concise Dict.', name: 'A Concise Dictionary of the Words in the Greek Testament and The Hebrew Bible', resource: 'LLS:STRNGDICHEBGRK' },
  { id: 'gelntthayer', short: 'Thayer', name: 'A Greek-English Lexicon of the New Testament', resource: 'LLS:THAYERGELEXNT' },
] as const;

/** Logos' own name for a Greek lemma is lbs/el/<lemma>, accents and capital kept; the slashes must be escaped or Logos rejects the value (a bare lemma opens a search
 *  'lemma.ιησουσ' that finds nothing). The link names the lemma alone, no ref= (the documented form has none; mw-5r3p30.67). docs/resources.md has the source. */
const study = (word: StudyWord): { path: string; fallbackPath: string } => {
  const guide = `Guide;t=${encodeURIComponent('Bible Word Study')};lemma=${encodeURIComponent(`lbs/el/${word.lemma.normalize('NFC')}`)}`;
  return { path: `logos4:${guide}`, fallbackPath: `https://ref.ly/logos4/${guide}` };
};

export const logos: StudyResource = {
  id: 'logos',
  name: 'Logos',
  kind: 'app',
  probe: 'logos4:Guide;t=Bible%20Word%20Study',
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
      fallback: `https://ref.ly/logosres/${encodeURIComponent(l.resource)}?hw=${lemma}`,
    }));
    const guide = study(word);
    return [...lexicons, { label: 'Bible Word Study in Logos', tile: 'Word Study', url: guide.path, fallback: guide.fallbackPath }];
  },
  versesFor: (place, bible) => {
    const link = verseLink(place.book, place.chapter, place.verse, bible);
    return link ? [{ label: 'Open in Logos', tile: 'Logos', url: link.url, fallback: link.fallback }] : [];
  },
};
