// Logos for a Hebrew word (mw-5vvlay.2): Strong's Hebrew through the three dictionaries that cover both testaments, the Bible Word Study guide at lbs/he/<consonants>, and
// his Hebrew lexicons (data/logos/catalogue-rules.json, lang 'he') — each offered on an H word and none on a G word. docs/resources.md has the sources.
import { describe, expect, it } from 'vitest';
import { entriesOf } from '../../src/resources/catalogue';
import { consonants, LEXICONS, lexiconLinks, logosStudy, wordLanguage } from '../../src/resources/logos';
import { resourceOf, type StudyWord } from '../../src/resources';

const logos = resourceOf('logos');
const links = (word: StudyWord, ids: string) => logos?.linksFor(word, ids) ?? [];

/** בְּרֵאשִׁית's lemma, Genesis 1:1: H7225 */
const REISHIT: StudyWord = { form: 'בְּרֵאשִׁ֖ית', lemma: 'רֵאשִׁית', strongs: 'H7225', ref: { book: 'gen', chapter: 1, verse: 1 } };
/** νόμος, a Greek word with a G number */
const NOMOS: StudyWord = { form: 'νόμου', lemma: 'νόμος', strongs: 'G3551' };

const HEBREW_IDS = LEXICONS.filter((l) => l.lang === 'he').map((l) => l.id);

describe('which language a word is', () => {
  it('is Hebrew for an H number, or with none for a lemma in Hebrew letters; Greek otherwise', () => {
    expect(wordLanguage(REISHIT)).toBe('hbo');
    expect(wordLanguage({ lemma: 'רֵאשִׁית', strongs: '' })).toBe('hbo');
    expect(wordLanguage(NOMOS)).toBe('grc');
    expect(wordLanguage({ lemma: 'νόμος', strongs: '' })).toBe('grc');
  });

  it('takes the vowel points and accent marks off a Hebrew word for Logos', () => {
    expect(consonants('רֵאשִׁית')).toBe('ראשית');
    expect(consonants('בְּרֵאשִׁ֖ית')).toBe('בראשית');
  });
});

describe('Strong\'s Hebrew', () => {
  it('opens New Strong\'s, the NASB Dictionaries and the Concise Dictionary at HebrewStrongs.7225', () => {
    expect(links(REISHIT, 'newstrongs')[0].url).toBe('logosres:LLS:46.10.6;ref=HebrewStrongs.7225');
    expect(links(REISHIT, 'nasbdict')[0].url).toBe('logosres:LLS:46.10.12;ref=HebrewStrongs.7225');
    expect(links(REISHIT, 'concisedict')[0].url).toBe('logosres:LLS:STRNGDICHEBGRK;ref=HebrewStrongs.7225');
    expect(links(REISHIT, 'newstrongs')[0].fallback).toBe('https://ref.ly/logosres/LLS%3A46.10.6?ref=HebrewStrongs.7225');
  });
});

describe('Bible Word Study for a Hebrew word', () => {
  it('names the lemma lbs/he/<consonants>, the slashes escaped, in Logos\' own documented form', () => {
    const [guide] = links(REISHIT, '');
    expect(guide.label).toBe('Bible Word Study in Logos');
    expect(guide.url).toBe(`logos4:Guide;t=Bible%20Word%20Study;lemma=${encodeURIComponent('lbs/he/ראשית')}`);
    expect(decodeURIComponent(guide.url.split('lemma=')[1])).toBe('lbs/he/ראשית');
    expect(guide.fallback).toBe(`https://ref.ly/logos4/Guide;t=Bible%20Word%20Study;lemma=${encodeURIComponent('lbs/he/ראשית')}`);
  });

  it('is still lbs/el/<lemma> for a Greek word', () => {
    expect(decodeURIComponent(links(NOMOS, '')[0].url.split('lemma=')[1])).toBe('lbs/el/νόμος');
  });
});

describe('his Hebrew lexicons', () => {
  it('are the eight Hebrew lexicons of the library, all lang he, each in the catalogue by Resource ID', () => {
    expect(HEBREW_IDS).toEqual(['bdb', 'dblhebrew', 'twot', 'gesenius', 'abridgedbdb', 'tlot', 'lxhotlex', 'lexhamanalyticalhebrew']);
    const resources = entriesOf('lexicon').filter((e) => e.lang === 'he').map((e) => e.resource);
    expect(resources).toEqual(['LLS:46.30.16', 'LLS:46.30.10', 'LLS:46.50.3', 'LLS:46.30.24', 'LLS:46.30.7', 'LLS:TLOT', 'LLS:FBHOTLEX', 'LLS:LXHEBANLEX']);
  });

  it('open a Hebrew word: BDB by its consonants as the headword, DBL Hebrew and TWOT by the HebrewStrongs number', () => {
    expect(links(REISHIT, 'bdb')[0]).toMatchObject({ label: 'Open in Logos: Enhanced Brown-Driver-Briggs Hebrew and English Lexicon', tile: 'BDB' });
    expect(links(REISHIT, 'bdb')[0].url).toBe(`logosres:LLS:46.30.16;hw=${encodeURIComponent('ראשית')}`);
    expect(links(REISHIT, 'dblhebrew')[0].url).toBe('logosres:LLS:46.30.10;ref=HebrewStrongs.7225');
    expect(links(REISHIT, 'twot')[0].url).toBe('logosres:LLS:46.50.3;ref=HebrewStrongs.7225');
  });

  it('are offered for no Greek word, whatever its number: a Hebrew lexicon has no Greek headword', () => {
    for (const id of HEBREW_IDS) expect(links(NOMOS, id).map((l) => l.label), id).toEqual(['Bible Word Study in Logos']);
    expect(lexiconLinks(NOMOS, HEBREW_IDS)).toEqual([]);
  });

  it('leave out the Greek lexicons on a Hebrew word, except the three Strong\'s dictionaries', () => {
    const greek = LEXICONS.filter((l) => l.lang !== 'he').map((l) => l.id);
    expect(lexiconLinks(REISHIT, greek).map((e) => e.id)).toEqual(['nasbdict', 'newstrongs', 'concisedict']);
  });

  it('draw on the word sheet as the Greek ones do: pinned first, Bible Word Study, and a door to the rest once more than three are On', () => {
    const study = logosStudy(REISHIT, [...HEBREW_IDS, 'newstrongs'], ['bdb']);
    expect(study.links.map((l) => l.tile)).toEqual(['BDB', 'Bible Word Study']);
    expect(study.door?.count).toBe(HEBREW_IDS.length + 1);
    expect(study.door?.entries.map((e) => e.id)[0]).toBe('bdb');
  });
});
