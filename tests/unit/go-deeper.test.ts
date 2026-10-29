// tests/unit/go-deeper.test.ts — the 'Go deeper' links of a variant card (mw-9ji6ek0.20, src/reader/goDeeper.ts): the apparatus file of the unit's book at the tag the data was built from, the 2005
// edition's scan, the lessons, and the place its Logos door opens at (the Greek texts only).
import { describe, expect, it } from 'vitest';
import { VARIANTS_FILES, VARIANTS_TAG } from '../../scripts/data/variants';
import { CATALOGUE } from '../../src/resources/catalogue';
import { LESSONS_PATH } from '../../src/nav/route';
import { APPARATUS_LABEL, EDITION_2005, GO_DEEPER_ENTRIES, LESSONS_LABEL, apparatusUrl, goDeeperPlace } from '../../src/reader/goDeeper';

describe('the apparatus link', () => {
  it('Revelation 3:2 links REV.csv of the with-variants directory at v3.3.2', () => {
    expect(apparatusUrl('rev')).toBe('https://github.com/byztxt/byzantine-majority-text/blob/v3.3.2/csv-unicode/ccat/with-variants/REV.csv');
  });

  it('Acts links ACT.csv, and 1 John, whose file is 1JO, links that', () => {
    expect(apparatusUrl('act')).toBe('https://github.com/byztxt/byzantine-majority-text/blob/v3.3.2/csv-unicode/ccat/with-variants/ACT.csv');
    expect(apparatusUrl('1jn')).toMatch(/\/with-variants\/1JO\.csv$/);
  });

  it('every book the data build reads has a link at the tag the build used, and a book it does not read has none', () => {
    for (const [code, file] of Object.entries(VARIANTS_FILES)) {
      expect(apparatusUrl(code)).toBe(`https://github.com/byztxt/byzantine-majority-text/blob/${VARIANTS_TAG}/csv-unicode/ccat/with-variants/${file}.csv`);
    }
    expect(apparatusUrl('gen')).toBeUndefined();
  });
});

describe('the rest of the card', () => {
  it('the labels are the ones the story names', () => {
    expect(APPARATUS_LABEL).toBe('The apparatus: Robinson-Pierpont 2018 (GitHub)');
    expect(LESSONS_LABEL).toBe('Lessons on variant readings ›');
    expect(EDITION_2005.label).toBe('The 2005 edition and its introduction');
    expect(EDITION_2005.url).toBe('https://archive.org/details/RP2005KoineGreekNTinByzantineTextform');
  });

  it('the Logos door is offered the Greek texts only, the SBLGNT apparatus among them', () => {
    expect(GO_DEEPER_ENTRIES.length).toBeGreaterThan(0);
    expect(GO_DEEPER_ENTRIES.every((e) => e.kind === 'greek-text')).toBe(true);
    expect(GO_DEEPER_ENTRIES.map((e) => e.short)).toContain('SBLGNT apparatus');
    expect(GO_DEEPER_ENTRIES).toEqual(CATALOGUE.filter((e) => e.kind === 'greek-text'));
  });

  it('the lessons are at the lessons list', () => {
    expect(LESSONS_PATH).toBe('#/lessons/variants');
  });

  it('the unit\'s place is its book, chapter and verse: Revelation 3:2 and Acts 1:5', () => {
    expect(goDeeperPlace('rev', 3, 2)).toEqual({ place: { book: 'rev', chapter: 3, verse: 2 }, name: 'Revelation 3:2' });
    expect(goDeeperPlace('act', 1, 5)).toEqual({ place: { book: 'act', chapter: 1, verse: 5 }, name: 'Acts 1:5' });
  });
});
