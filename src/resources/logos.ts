// src/resources/logos.ts — I have Logos: 'Open in Logos: <lexicon>' for each lexicon of his library that he ticked in Settings, at the
// word's headword, and 'Bible Word Study in Logos' for the lemma alone. Every link is the Logos app's own
// scheme first (logosres: for a resource, logos4: for a guide) and carries the https ref.ly address as the fallback, opened only when the
// phone cannot open the scheme (src/resources/openApp.ts). docs/resources.md names the sources and what is UNVERIFIED.
import { entriesOf, type LexiconKey } from './catalogue';
import { verseLink } from './logosBible';
import { resourceLink, type LogosLink } from './logosRes';
import type { StudyLink, StudyResource, StudyWord } from './types';

/** The key a lexicon is filed under (catalogue.ts LexiconKey): the Greek lemma, a Strong's number or an English topic. docs/resources.md says where each lexicon's key comes from and what is UNVERIFIED. */
type Key = LexiconKey;

/** His Logos lexicons, in the order Logos' Bible Word Study shows them: a view over the catalogue's lexicons (catalogue.ts; docs/resources.md 'The catalogue'). `id` is kept in the settings store (never change it); `short` is its tile on the word sheet: the book's title in
 *  words that tell it from every other (two lines fit in half a row; the distinguishing word is never cut, and no two are alike); `resource` is the Resource ID Logos prints on the product's page (https://www.logos.com/product/<n>, 'Resource ID: LLS:...').
 *  Adding a lexicon is one entry in data/logos/catalogue-rules.json and `npm run logos:catalogue`: copy its Resource ID, never guess a short name (mw-5r3p30.64: the guessed 'ednt' opened nothing). */
export const LEXICONS: readonly { id: string; short: string; name: string; resource: string; key?: Key }[] = entriesOf('lexicon')
  .filter((e) => e.via === 'id' && e.id !== undefined)
  .map((e) => ({ id: e.id as string, short: e.short, name: e.title, resource: e.resource, ...(e.key ? { key: e.key } : {}) }));

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

/** Logos' own name for a Greek lemma is lbs/el/<lemma>, accents and capital kept; the slashes must be escaped or Logos rejects the value (a bare lemma opens a search
 *  'lemma.ιησουσ' that finds nothing). The link names the lemma alone, no ref= (the documented form has none; mw-5r3p30.67). docs/resources.md has the source. */
const study = (word: StudyWord): { path: string; fallbackPath: string } => {
  const guide = `Guide;t=${encodeURIComponent('Bible Word Study')};lemma=${encodeURIComponent(`lbs/el/${word.lemma.normalize('NFC')}`)}`;
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
  return `hw=${encodeURIComponent(word.lemma)}`;
};

export const logos: StudyResource = {
  id: 'logos',
  lang: 'both',
  name: 'Logos',
  kind: 'app',
  describe: 'Adds Open in Logos for each lexicon you tick, and Bible Word Study in Logos.',
  choices: {
    label: 'Logos lexicons',
    hint: 'Tick the lexicons of your Logos library to open. BDAG is ticked to start with.',
    items: LEXICONS.map(({ id, name }) => ({ id, name })),
    default: ['bdag'],
  },
  linksFor: (word, option) => {
    const ticked = (option ?? '').split(',');
    const lexicons: StudyLink[] = [];
    for (const l of LEXICONS.filter((x) => ticked.includes(x.id))) {
      const key = keyQuery(l.key ?? 'lemma', word);
      if (!key) continue;
      lexicons.push({
        label: `Open in Logos: ${l.name}`,
        tile: l.short,
        ...resourceLink(l.resource, key),
      });
    }
    const guide = study(word);
    return [...lexicons, { label: 'Bible Word Study in Logos', tile: 'Bible Word Study', url: guide.path, fallback: guide.fallbackPath }];
  },
  versesFor: (place, bible) => {
    const link = verseLink(place.book, place.chapter, place.verse, bible);
    return link ? [{ label: 'Open in Logos', tile: 'Logos', url: link.url, fallback: link.fallback }] : [];
  },
};
