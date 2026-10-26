// src/resources/logos.ts — I have Logos: 'Open in Logos: <lexicon>' for each lexicon of his library that he ticked in Settings, at the
// word's headword, and 'Bible Word Study in Logos' for the lemma alone. Every link is the Logos app's own
// scheme first (logosres: for a resource, logos4: for a guide) and carries the https ref.ly address as the fallback, opened only when the
// phone cannot open the scheme (src/resources/openApp.ts). docs/resources.md names the sources and what is UNVERIFIED.
import { entriesOf, type LexiconKey } from './catalogue';
import { verseLink } from './logosBible';
import { resourceLink, type LogosLink } from './logosRes';
import type { ResourceLang, StudyLink, StudyResource, StudyWord } from './types';

/** The key a lexicon is filed under (catalogue.ts LexiconKey): the Greek lemma, a Strong's number or an English topic. docs/resources.md says where each lexicon's key comes from and what is UNVERIFIED. */
type Key = LexiconKey;

/** His Logos lexicons, in the order Logos' Bible Word Study shows them: a view over the catalogue's lexicons (catalogue.ts; docs/resources.md 'The catalogue'). `id` is kept in the settings store (never change it); `short` is its tile on the word sheet: the book's title in
 *  words that tell it from every other (two lines fit in half a row; the distinguishing word is never cut, and no two are alike); `resource` is the Resource ID Logos prints on the product's page (https://www.logos.com/product/<n>, 'Resource ID: LLS:...').
 *  Adding a lexicon is one entry in data/logos/catalogue-rules.json and `npm run logos:catalogue`: copy its Resource ID, never guess a short name (mw-5r3p30.64: the guessed 'ednt' opened nothing). */
export const LEXICONS: readonly { id: string; short: string; name: string; resource: string; lang: ResourceLang; key?: Key }[] = entriesOf('lexicon')
  .filter((e) => e.via === 'id' && e.id !== undefined)
  .map((e) => ({ id: e.id as string, short: e.short, name: e.title, resource: e.resource, lang: e.lang, ...(e.key ? { key: e.key } : {}) }));

/** The language of a word's own text: Hebrew for an H number (or, with no number, a lemma written in Hebrew letters), else Greek. */
export const wordLanguage = (word: Pick<StudyWord, 'lemma' | 'strongs'>): 'grc' | 'hbo' =>
  word.strongs.startsWith('H') || (!/^G/.test(word.strongs) && /\p{Script=Hebrew}/u.test(word.lemma)) ? 'hbo' : 'grc';

/** Whether a lexicon is opened for a word of this language (mw-5vvlay.2): a Hebrew lexicon (`lang` 'he') for a Hebrew word only; a Greek one for a Greek word only, except a Strong's
 *  dictionary (`key` 'strongs', the three that cover both testaments: NASB Dictionaries, New Strong's, the Concise Dictionary), which is opened for either. */
const opensFor = (l: { lang: ResourceLang; key?: Key }, language: 'grc' | 'hbo'): boolean => (language === 'hbo' ? l.lang === 'he' || l.key === 'strongs' : l.lang !== 'he');

/** His English dictionary in Logos, for a tapped English word (mw-5r3p30.707): Webster's 1828, 'An American Dictionary of the English Language' (Book Info: LLS:AMDICTENLANG).
 *  `resource` is written as the story's links name it, without `LLS:`; if the Logos app does not open it, the full `LLS:AMDICTENLANG` is the form the lexicons above use.
 *  One constant and no setting yet: a choice comes when a second dictionary is known to open. docs/resources.md says what is UNVERIFIED. */
export const ENGLISH_DICTIONARY = { name: "Webster's 1828", resource: 'AMDICTENLANG' } as const;

/** The words of a tapped English chunk as headwords: each lowercased, the marks around it dropped (an apostrophe inside stays), once each, in order. No stemming; Logos finds the nearest headword. */
export const englishHeadwords = (text: string): string[] => {
  const words = text.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '').toLocaleLowerCase('en')).filter((w) => w !== '');
  return [...new Set(words)];
};

/** The link that opens `word` in his English dictionary in Logos (ref.ly as the fallback), or undefined when it has no letters. */
export const englishDictionaryLink = (word: string): LogosLink | undefined => {
  const [headword] = englishHeadwords(word);
  return headword === undefined ? undefined : resourceLink(ENGLISH_DICTIONARY.resource, `hw=${encodeURIComponent(headword)}`);
};

/** A Hebrew word with its vowel points and accent marks taken off: the consonants, as Logos' own example of a Hebrew lemma writes it (`lbs/he/חסד`, docs/resources.md). */
export const consonants = (word: string): string => word.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');

/** Logos' own name for a Greek lemma is lbs/el/<lemma>, accents and capital kept; the slashes must be escaped or Logos rejects the value (a bare lemma opens a search
 *  'lemma.ιησουσ' that finds nothing). A Hebrew lemma is lbs/he/<consonants> (mw-5vvlay.2). The link names the lemma alone, no ref= (the documented form has none; mw-5r3p30.67). docs/resources.md has the source. */
const study = (word: StudyWord): { path: string; fallbackPath: string } => {
  const lemma = wordLanguage(word) === 'hbo' ? `lbs/he/${consonants(word.lemma)}` : `lbs/el/${word.lemma.normalize('NFC')}`;
  const guide = `Guide;t=${encodeURIComponent('Bible Word Study')};lemma=${encodeURIComponent(lemma)}`;
  return { path: `logos4:${guide}`, fallbackPath: `https://ref.ly/logos4/${guide}` };
};

/** A Strong's number as Logos writes it in a reference: 'G11' is `GreekStrongs.11`, 'H539' is `HebrewStrongs.539`; nothing for a number it cannot read. */
const strongsRef = (strongs: string): string | undefined => {
  const m = /^([GH])0*(\d+)[A-Za-z]?$/.exec(strongs);
  return m ? `${m[1] === 'G' ? 'GreekStrongs' : 'HebrewStrongs'}.${m[2]}` : undefined;
};

/** A proper name: its lemma opens with a capital (Ἀβραάμ, Μελχισεδέκ, Παῦλος); a common word's never does. A gentilic (Ἰουδαῖος) counts too, which only costs a tile. */
const isProperName = (lemma: string): boolean => {
  const first = lemma.normalize('NFC').charAt(0);
  return first !== first.toLocaleLowerCase('el');
};

/** The query part of a lexicon link for the key it is filed under, or undefined when Lampas has no such key for the word (the tile is then left out, never a guess). */
const keyQuery = (key: Key, word: StudyWord): string | undefined => {
  if (key === 'strongs') {
    const ref = strongsRef(word.strongs);
    return ref && `ref=${ref}`;
  }
  if (key === 'topic') {
    const topic = word.topic?.trim();
    return topic && `hw=${encodeURIComponent(topic.charAt(0).toLocaleUpperCase('en') + topic.slice(1))}`;
  }
  if (key === 'commonLemma' && isProperName(word.lemma)) return undefined;
  return `hw=${encodeURIComponent(wordLanguage(word) === 'hbo' ? consonants(word.lemma) : word.lemma)}`;
};

/** One lexicon of his library and its link for a word. */
export interface LexiconEntry {
  /** LEXICONS' id */
  id: string;
  /** the lexicon's whole title, for the sheet that lists them all */
  name: string;
  link: StudyLink;
}

/** The links of the lexicons named in `ids`, in that order, for `word`; a lexicon Lampas has no key for (a proper name in a book of common words, a topic the word has none of) or that is
 *  in the other language (a Hebrew lexicon for a Greek word, mw-5vvlay.2) is left out, never guessed. */
export const lexiconLinks = (word: StudyWord, ids: readonly string[]): LexiconEntry[] => {
  const entries: LexiconEntry[] = [];
  const language = wordLanguage(word);
  for (const id of new Set(ids)) {
    const l = LEXICONS.find((x) => x.id === id);
    const key = l && opensFor(l, language) ? keyQuery(l.key ?? 'lemma', word) : undefined;
    if (l && key) entries.push({ id: l.id, name: l.name, link: { label: `Open in Logos: ${l.name}`, tile: l.short, ...resourceLink(l.resource, key) } });
  }
  return entries;
};

const bibleWordStudy = (guide: { path: string; fallbackPath: string }): StudyLink => ({ label: 'Bible Word Study in Logos', tile: 'Bible Word Study', url: guide.path, fallback: guide.fallbackPath });

/** His ticked lexicons (`option`: ids joined by commas) with the pinned ones first (each group in the ticked order, which is the library's): the order the word's links and the tutor's chip follow. A pinned lexicon that is not ticked is left out. */
export const pinnedFirst = (option: string, pinned: readonly string[] | undefined): string => {
  const ticked = option.split(',');
  const pins = ticked.filter((id) => pinned?.includes(id));
  return [...pins, ...ticked.filter((id) => !pins.includes(id))].join(',');
};

/** With more lexicons than this On, the word sheet draws the pinned ones and a door to the rest; with this many or fewer it draws them all and has no door (docs/design/library-at-scale.md 3.5). */
export const LEXICON_FOLD = 3;

/** What the Study row's Logos group holds for a word: the tiles to draw, and, when there are more lexicons than it draws, the door to the sheet that lists every one. */
export interface LogosStudy {
  links: StudyLink[];
  door?: { count: number; entries: (LexiconEntry & { pinned: boolean })[] };
}

/** The Logos group of the word sheet: the lexicons he pinned, then Bible Word Study, then 'All N lexicons' when more than LEXICON_FOLD are On; else every one On and Bible Word Study.
 *  `ticked` is the ids On, `pinned` the ids Pinned. N counts the lexicons that have an entry for this word. */
export const logosStudy = (word: StudyWord, ticked: readonly string[], pinned: readonly string[]): LogosStudy => {
  const guide = bibleWordStudy(study(word));
  const entries = lexiconLinks(word, pinnedFirst(ticked.join(','), pinned).split(',')).map((e) => ({ ...e, pinned: pinned.includes(e.id) }));
  if (entries.length <= LEXICON_FOLD) return { links: [...entries.map((e) => e.link), guide] };
  return { links: [...entries.filter((e) => e.pinned).map((e) => e.link), guide], door: { count: entries.length, entries } };
};

export const logos: StudyResource = {
  id: 'logos',
  lang: 'both',
  name: 'Logos',
  kind: 'app',
  describe: 'Adds Open in Logos for each lexicon in Your Logos library, and Bible Word Study.',
  choices: {
    label: 'Logos lexicons',
    hint: 'Tick the lexicons of your Logos library to open. BDAG is ticked to start with.',
    items: LEXICONS.map(({ id, name }) => ({ id, name })),
    default: ['bdag'],
  },
  linksFor: (word, option) => {
    const guide = study(word);
    return [...lexiconLinks(word, (option ?? '').split(',')).map((e) => e.link), bibleWordStudy(guide)];
  },
  versesFor: (place, bible) => {
    const link = verseLink(place.book, place.chapter, place.verse, bible);
    return link ? [{ label: 'Open in Logos', tile: 'Logos', url: link.url, fallback: link.fallback }] : [];
  },
};
