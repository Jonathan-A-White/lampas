// Each Hebrew lexicon is opened by the key its book is filed under, or by a headword whose key is NOT checked (mw-5r3p30.1113): the Governor's Theological
// Lexicon of the OT (TLOT) opened a stale page, "Navigation failed", for מִזְמוֹר (Psalm 23:1, H4210). docs/resources.md 'His Hebrew lexicons' has the evidence.
import { describe, expect, it } from 'vitest';
import { LEXICONS, consonants, logosStudy } from '../../src/resources/logos';
import { resourceOf, type StudyWord } from '../../src/resources';

const logos = resourceOf('logos');
const HEBREW = LEXICONS.filter((l) => l.lang === 'he' || l.key === 'strongs');

const MIZMOR: StudyWord = { form: 'מִזְמוֹר', lemma: 'מִזְמוֹר', strongs: 'H4210', ref: { book: 'psa', chapter: 23, verse: 1 } };
const ELOHIM: StudyWord = { form: 'אֱלֹהִים', lemma: 'אֱלֹהִים', strongs: 'H430', ref: { book: 'gen', chapter: 1, verse: 1 } };
const DAVAR: StudyWord = { form: 'דָּבָר', lemma: 'דָּבָר', strongs: 'H1697', ref: { book: 'psa', chapter: 33, verse: 4 } };
const WORDS = [MIZMOR, ELOHIM, DAVAR];

/** How each Hebrew lexicon is reached, as his library export of 2026-10-08 (ReferenceSupersets) lets Lampas say it:
 *  'strongs': the book's ReferenceSupersets name `strongs+h` (DBL Hebrew, TWOT) or its product page says it is filed by Strong's number (the three dictionaries): `ref=HebrewStrongs.<n>`;
 *  'headword': the book names no reference type Lampas can use (BDB and the Abridged BDB are filed `bdb` by page, Gesenius `geslex` by page, TLOT and the two Lexham lexicons name none), so Lampas
 *  asks for the headword in consonants, and whether Logos finds the word under it is UNVERIFIED (the Governor's phone is the only check: ref.ly asks for a Logos sign-in). A new Hebrew lexicon is added here knowingly. */
const BASIS: Record<string, 'strongs' | 'headword'> = {
  nasbdict: 'strongs',
  newstrongs: 'strongs',
  concisedict: 'strongs',
  dblhebrew: 'strongs',
  twot: 'strongs',
  bdb: 'headword',
  abridgedbdb: 'headword',
  gesenius: 'headword',
  tlot: 'headword',
  lxhotlex: 'headword',
  lexhamanalyticalhebrew: 'headword',
};

const keyOf = (word: StudyWord, id: string): string | undefined => logos?.linksFor(word, id)[0]?.url.split(';')[1];

describe('the Hebrew lexicons and their keys', () => {
  it('are each named in the key basis, so a new one is a knowing choice', () => {
    expect(HEBREW.map((l) => l.id).sort()).toEqual(Object.keys(BASIS).sort());
  });

  it.each(WORDS)('open $form by the key their book is filed under, never by the pointed headword', (word) => {
    for (const l of HEBREW) {
      const key = keyOf(word, l.id);
      const n = word.strongs.slice(1);
      if (BASIS[l.id] === 'strongs') expect(key, l.id).toBe(`ref=HebrewStrongs.${n}`);
      else {
        expect(key, l.id).toBe(`hw=${encodeURIComponent(consonants(word.lemma))}`);
        expect(key, l.id).not.toBe(`hw=${encodeURIComponent(word.lemma)}`);
      }
    }
  });

  it('draw every lexicon of the sheet "All N lexicons" with the same key for מִזְמוֹר', () => {
    const study = logosStudy(MIZMOR, HEBREW.map((l) => l.id), []);
    expect(study.door?.count).toBe(HEBREW.length);
    for (const e of study.door?.entries ?? []) {
      const key = e.link.url.split(';')[1];
      expect(key, e.id).toBe(BASIS[e.id] === 'strongs' ? 'ref=HebrewStrongs.4210' : `hw=${encodeURIComponent('מזמור')}`);
    }
    const tlot = study.door?.entries.find((e) => e.id === 'tlot');
    expect(tlot?.link.url).toBe(`logosres:LLS:TLOT;hw=${encodeURIComponent('מזמור')}`);
  });
});
