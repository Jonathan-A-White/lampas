// tests/unit/greek-edition.test.ts — mw-5r3p30.136: which Robinson-Pierpont edition the MSB tables' Greek follows.
// The first half tests scripts/greek-edition.ts on small verses; the second half reads docs/greek-edition.md (written by
// `npm run greek:edition`) and holds the Preface's edition line to its verdict.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compareVerse, decidingPlaces, editionVerdict, rpWords } from '../../scripts/greek-edition';
import { PREFACE_EDITION_LINE, PREFACE_LINKS, PREFACE_PARAGRAPHS } from '../../src/preface';

describe('rpWords: a verse of RP text cut into words and the marks beside them', () => {
  it('separates the punctuation from the word and keeps it', () => {
    expect(rpWords('Παῦλος, δοῦλος Ἰησοῦ·')).toEqual([
      { word: 'Παῦλος', marks: ',' },
      { word: 'δοῦλος', marks: '' },
      { word: 'Ἰησοῦ', marks: '·' },
    ]);
  });

  it('keeps an elision apostrophe in the word, whichever apostrophe it is', () => {
    expect(rpWords("κατ' ἐμοῦ")[0].word).toBe('κατ’');
    expect(rpWords('κατ’ ἐμοῦ')[0].word).toBe('κατ’');
  });

  it('reads the Greek question mark and the raised dot as punctuation, in NFC', () => {
    const words = rpWords('τί; ἐστιν·');
    expect(words.map((w) => w.word)).toEqual(['τί', 'ἐστιν']);
    expect(words.map((w) => w.marks)).toEqual([';', '·']);
    expect(rpWords('ἐ̓')[0].word).toBe('ἐ̓'.normalize('NFC'));
  });
});

describe('compareVerse: the differences between the MSB table and an edition, by kind', () => {
  it('finds none in the same verse', () => {
    expect(compareVerse('ἐν ἀρχῇ ἦν ὁ λόγος', 'ἐν ἀρχῇ ἦν ὁ λόγος')).toEqual([]);
  });

  it('calls a changed accent or breathing accent/breathing', () => {
    expect(compareVerse('ο προεπηγγείλατο', 'ὃ προεπηγγείλατο')).toEqual([{ kind: 'accent', msb: 'ο', rp: 'ὃ' }]);
    expect(compareVerse('εἰσιν', 'εισίν')).toEqual([{ kind: 'accent', msb: 'εἰσιν', rp: 'εισίν' }]);
  });

  it('calls a different letter spelling', () => {
    expect(compareVerse('ἐγερθήσεται δὲ', 'ἐγερθήσεται δὲ')).toEqual([]);
    expect(compareVerse('ἀποκτείνωσιν', 'ἀποκτέννωσιν')).toEqual([{ kind: 'spelling', msb: 'ἀποκτείνωσιν', rp: 'ἀποκτέννωσιν' }]);
  });

  it('calls a changed mark of punctuation punctuation, and counts RP marks the table lacks', () => {
    expect(compareVerse('Παῦλος δοῦλος', 'Παῦλος, δοῦλος')).toEqual([{ kind: 'punctuation', msb: 'Παῦλος', rp: 'Παῦλος,' }]);
    expect(compareVerse('Παῦλος, δοῦλος', 'Παῦλος, δοῦλος')).toEqual([]);
  });

  it('calls a changed capital letter capitals', () => {
    expect(compareVerse('Χριστοῦ', 'χριστοῦ')).toEqual([{ kind: 'capitals', msb: 'Χριστοῦ', rp: 'χριστοῦ' }]);
  });

  it('calls a word the table has and the edition lacks added, and the reverse missing', () => {
    expect(compareVerse('τοῦ θεοῦ ἡμῶν', 'τοῦ θεοῦ')).toEqual([{ kind: 'added', msb: 'ἡμῶν' }]);
    expect(compareVerse('τοῦ θεοῦ', 'τοῦ θεοῦ ἡμῶν')).toEqual([{ kind: 'missing', rp: 'ἡμῶν' }]);
  });

  it('lines the words up again after an added word, so the later words are not all reported', () => {
    const msb = 'ἐν ἀρχῇ ἦν ὁ λόγος καὶ ὁ λόγος ἦν πρὸς τὸν θεόν';
    const rp = 'ἐν ἀρχῇ ἦν ὁ λόγος καὶ λόγος ἦν πρὸς τὸν θεόν';
    expect(compareVerse(msb, rp)).toEqual([{ kind: 'added', msb: 'ὁ' }]);
  });

  it('pairs two unlike words as a spelling difference when both sides have one', () => {
    expect(compareVerse('ἐγὼ ἦλθον ἵνα', 'ἐγὼ ἔλαβον ἵνα')).toEqual([{ kind: 'spelling', msb: 'ἦλθον', rp: 'ἔλαβον' }]);
  });
});

describe('decidingPlaces: where RP2005 and RP2018 differ, and which the table agrees with', () => {
  it('finds a place the two editions differ and the table follows 2018', () => {
    const places = decidingPlaces('ὁ λόγος ἦν', 'ὁ λόγος ἢν', 'ὁ λόγος ἦν');
    expect(places).toEqual([{ follows: '2018', msb: 'ἦν', rp2005: 'ἢν', rp2018: 'ἦν' }]);
  });

  it('finds a place the table follows 2005', () => {
    const places = decidingPlaces('ἐν τῷ οἴκῳ', 'ἐν τῷ οἴκῳ', 'ἐν τῷ οἰκῷ');
    expect(places).toEqual([{ follows: '2005', msb: 'οἴκῳ', rp2005: 'οἴκῳ', rp2018: 'οἰκῷ' }]);
  });

  it('finds a place the table follows neither', () => {
    const places = decidingPlaces('ὁ λόγος ἦν', 'ὁ λόγος ἢν', 'ὁ λόγος ἣν');
    expect(places).toEqual([{ follows: 'neither', msb: 'ἦν', rp2005: 'ἢν', rp2018: 'ἣν' }]);
  });

  it('does not count a difference of punctuation alone: the table has almost none', () => {
    expect(decidingPlaces('ὁ λόγος', 'ὁ λόγος,', 'ὁ λόγος·')).toEqual([]);
  });

  it('finds a word one edition has and the other lacks', () => {
    expect(decidingPlaces('τοῦ θεοῦ ἡμῶν', 'τοῦ θεοῦ ἡμῶν', 'τοῦ θεοῦ')).toEqual([
      { follows: '2005', msb: 'ἡμῶν', rp2005: 'ἡμῶν', rp2018: '' },
    ]);
    expect(decidingPlaces('τοῦ θεοῦ', 'τοῦ θεοῦ ἡμῶν', 'τοῦ θεοῦ')).toEqual([
      { follows: '2018', msb: '', rp2005: 'ἡμῶν', rp2018: '' },
    ]);
  });
});

describe('editionVerdict', () => {
  it('names the edition the table agrees with at more of the deciding places', () => {
    expect(editionVerdict({ '2005': 3, '2018': 40, neither: 2 })).toBe('2018');
    expect(editionVerdict({ '2005': 40, '2018': 3, neither: 2 })).toBe('2005');
  });
  it('says undecided when there are no places or they are level', () => {
    expect(editionVerdict({ '2005': 0, '2018': 0, neither: 5 })).toBe('undecided');
    expect(editionVerdict({ '2005': 7, '2018': 7, neither: 0 })).toBe('undecided');
  });
});

describe('docs/greek-edition.md and the Preface', () => {
  const doc = readFileSync('docs/greek-edition.md', 'utf8');
  const verdict = /^Edition: (2005|2018)$/m.exec(doc)?.[1];

  it('has a verdict, names the command that makes it, and gives counts by kind with examples and verses', () => {
    expect(verdict, 'a line "Edition: 2005" or "Edition: 2018"').toBeDefined();
    expect(doc).toContain('npm run greek:edition');
    for (const heading of ['accent/breathing', 'punctuation', 'spelling', 'capitals', 'word added', 'word missing']) {
      expect(doc).toContain(heading);
    }
    expect(doc).toMatch(/\b(Matthew|Mark|Luke|John|Acts|Romans|Revelation) \d+:\d+/);
    expect(doc).toContain('Where RP2005 and RP2018 differ');
  });

  it('is what the Preface edition line says, with a link to that edition', () => {
    const line = PREFACE_EDITION_LINE;
    expect(PREFACE_PARAGRAPHS).toContain(line);
    expect(line).toContain(`${verdict} edition`);
    expect(line).toContain('public domain');
    const other = verdict === '2018' ? '2005' : '2018';
    expect(line).not.toMatch(new RegExp(`published in ${other}\\b`));
    const links = PREFACE_LINKS.filter((l) => l.name.includes(verdict ?? '?'));
    expect(links.length).toBeGreaterThan(0);
    expect(links.map((l) => l.url).some((u) => /archive\.org|github\.com\/byztxt/.test(u))).toBe(true);
  });
});
