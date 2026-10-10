// Each Logos lexicon is opened by the key it is filed under (mw-5r3p30.131): the Greek lemma, a Strong's number in Logos' own
// GreekStrongs / HebrewStrongs reference form, or an English topic. docs/resources.md has the table and its sources.
import { describe, expect, it } from 'vitest';
import { resourceOf, type StudyWord } from '../../src/resources';

const logos = resourceOf('logos');
const links = (word: StudyWord, ids: string) => logos?.linksFor(word, ids) ?? [];
const urls = (word: StudyWord, ids: string) => links(word, ids).map((l) => l.url);

/** κατάκριμα, Romans 8:1, Strong's G2631; the lexicon's gloss 'condemnation' is its topic */
const KATAKRIMA: StudyWord = { form: 'κατάκριμα', lemma: 'κατάκριμα', strongs: 'G2631', topic: 'condemnation', ref: { book: 'rom', chapter: 8, verse: 1 } };
/** Ἀβραάμ, Hebrews 7:1, Strong's G11 (Hebrew H85 is a different entry; Hebrew and Greek numbers overlap, 539 is אָמַן) */
const ABRAHAM: StudyWord = { form: 'Ἀβραάμ', lemma: 'Ἀβραάμ', strongs: 'G11', topic: 'Abraham', ref: { book: 'heb', chapter: 7, verse: 1 } };
const LEMMA = encodeURIComponent('κατάκριμα');

describe('a Greek-lemma lexicon', () => {
  it('still carries the lemma as the headword (BDAG)', () => {
    expect(urls(KATAKRIMA, 'bdag')).toEqual([`logosres:LLS:46.30.18;hw=${LEMMA}`, expect.stringContaining('Bible%20Word%20Study')]);
    expect(links(KATAKRIMA, 'bdag')[0].fallback).toBe(`https://ref.ly/logosres/LLS%3A46.30.18?hw=${LEMMA}`);
    expect(urls(KATAKRIMA, 'tdnta')[0]).toBe(`logosres:LLS:46.10.1;hw=${LEMMA}`);
  });
});

describe('a topical wordbook (Lexham Theological Wordbook)', () => {
  it('is opened at its English topic, never at the Greek lemma', () => {
    const [lexham] = links(KATAKRIMA, 'lexhamtheolwordbk');
    expect(lexham.label).toBe('Open in Logos: Lexham Theological Wordbook');
    expect(lexham.url).toBe('logosres:LLS:LXTHEOWRDBK;hw=Condemnation');
    expect(lexham.fallback).toBe('https://ref.ly/logosres/LLS%3ALXTHEOWRDBK?hw=Condemnation');
    expect(lexham.url).not.toContain(LEMMA);
  });

  it('shows no tile for a word with no topic, rather than a wrong one', () => {
    const none = { ...KATAKRIMA, topic: undefined };
    expect(links(none, 'lexhamtheolwordbk').map((l) => l.label)).toEqual(['Bible Word Study in Logos']);
  });
});

describe('a lexicon filed by Strong\'s number', () => {
  it('carries Greek Strong\'s 11 in Logos\' GreekStrongs form for Ἀβραάμ, never a bare 11 or the lemma (NASB Dict., New Strong\'s, Concise Dict.)', () => {
    expect(urls(ABRAHAM, 'nasbdict')[0]).toBe('logosres:LLS:46.10.12;ref=GreekStrongs.11');
    expect(urls(ABRAHAM, 'newstrongs')[0]).toBe('logosres:LLS:46.10.6;ref=GreekStrongs.11');
    expect(urls(ABRAHAM, 'concisedict')[0]).toBe('logosres:LLS:STRNGDICHEBGRK;ref=GreekStrongs.11');
    expect(links(ABRAHAM, 'nasbdict')[0].fallback).toBe('https://ref.ly/logosres/LLS%3A46.10.12?ref=GreekStrongs.11');
    for (const id of ['nasbdict', 'newstrongs', 'concisedict']) {
      const url = urls(ABRAHAM, id)[0];
      expect(url, id).not.toContain('hw=');
      expect(url, id).not.toContain(encodeURIComponent('Ἀβραάμ'));
      expect(url, id).not.toMatch(/ref=\d/);
    }
  });

  it('carries a Hebrew word\'s number in the HebrewStrongs form', () => {
    const aman: StudyWord = { form: 'אָמַן', lemma: 'אָמַן', strongs: 'H539' };
    expect(urls(aman, 'nasbdict')[0]).toBe('logosres:LLS:46.10.12;ref=HebrewStrongs.539');
    expect(urls(aman, 'newstrongs')[0]).toBe('logosres:LLS:46.10.6;ref=HebrewStrongs.539');
  });

  it('shows no tile for a word with no Strong\'s number', () => {
    expect(links({ ...ABRAHAM, strongs: '' }, 'nasbdict,newstrongs').map((l) => l.label)).toEqual(['Bible Word Study in Logos']);
  });
});

/** Μελχισεδέκ, Hebrews 7:1, G3198 (the lemma as the text's data spells it); the Governor typed Μελχισέδεκ */
const MELCHIZEDEK: StudyWord = { form: 'Μελχισεδέκ', lemma: 'Μελχισεδέκ', strongs: 'G3198', topic: 'Melchizedek', ref: { book: 'heb', chapter: 7, verse: 1 } };
const LOGOS: StudyWord = { form: 'λόγος', lemma: 'λόγος', strongs: 'G3056', topic: 'word', ref: { book: 'jhn', chapter: 1, verse: 1 } };
const LABELS = { leh: 'Open in Logos: LEH LXX Lexicon', intermediategel: 'Open in Logos: An Intermediate Greek-English Lexicon', gelnt: 'Open in Logos: A Greek and English Lexicon to the New Testament' };

// LEH leaves proper nouns out; the Intermediate Liddell-Scott is classical Greek with no biblical names; Bloomfield excludes all proper names (docs/resources.md)
describe.each([
  ['leh', 'LLS:46.30.22'],
  ['intermediategel', 'LLS:46.30.1'],
  ['gelnt', 'LLS:GRKENGLXCNNTBLMSFIELD'],
] as const)('a headword lexicon with no proper names: %s', (id, resource) => {
  it('carries a common word under its Greek headword', () => {
    const [tile] = links(LOGOS, id);
    expect(tile.label).toBe(LABELS[id]);
    expect(tile.url).toBe(`logosres:${resource};hw=${encodeURIComponent('λόγος')}`);
    expect(tile.fallback).toBe(`https://ref.ly/logosres/${encodeURIComponent(resource)}?hw=${encodeURIComponent('λόγος')}`);
  });

  it('shows no tile for Μελχισεδέκ, rather than one that opens a stale page', () => {
    for (const lemma of ['Μελχισεδέκ', 'Μελχισέδεκ']) {
      expect(links({ ...MELCHIZEDEK, form: lemma, lemma }, id).map((l) => l.label)).toEqual(['Bible Word Study in Logos']);
    }
  });

  it('shows no tile for a declined name either (Παῦλος) or an indeclinable one (Ἀβραάμ)', () => {
    expect(links({ ...MELCHIZEDEK, form: 'Παῦλος', lemma: 'Παῦλος', strongs: 'G3972' }, id)).toHaveLength(1);
    expect(links(ABRAHAM, id)).toHaveLength(1);
  });
});

describe('a name is still looked up where the book has names', () => {
  it('BDAG, Louw-Nida and LXGRCANLEX keep their tile for Μελχισεδέκ', () => {
    const ids = 'bdag,louwnida,lxgrcanlex';
    expect(links(MELCHIZEDEK, ids).map((l) => l.url).slice(0, 3)).toEqual([
      `logosres:LLS:46.30.18;hw=${encodeURIComponent('Μελχισεδέκ')}`,
      `logosres:LLS:46.30.4;hw=${encodeURIComponent('Μελχισεδέκ')}`,
      `logosres:LLS:LXGRCANLEX;hw=${encodeURIComponent('Μελχισεδέκ')}`,
    ]);
  });
});

describe('the topic a gloss can stand for', () => {
  it('takes a plain noun-like gloss and leaves a verb, a pair and a slash alone', async () => {
    const { topicOf } = await import('../../src/resources/topic');
    expect(topicOf('condemnation')).toBe('condemnation');
    expect(topicOf('early morning')).toBe('early morning');
    expect(topicOf('to preach')).toBeUndefined();
    expect(topicOf('implanted/ingrafted')).toBeUndefined();
    expect(topicOf('')).toBeUndefined();
  });
});
