// The rows of his list that Lampas could use (src/library/usableRows.ts): what 'Ask the makers about these' attaches as library.csv
// (docs/design/library-at-scale.md 6.2): commentaries on the New Testament, Greek grammars and lexicons, Greek texts, interlinears and
// devotionals; never a manuscript, a Bible in English, an Old Testament book or a tool.
import { describe, expect, it } from 'vitest';
import { countsByType, libraryCsv, MAX_LIBRARY_CSV_BYTES, usableKind, usableRows, type ListedRow } from '../../src/library/usableRows';
import { parseCsv } from '../../src/library/parseExport';

const row = (type: string, over: Partial<ListedRow> = {}): ListedRow => ({ resource: `LLS:${type}`, type, title: `A ${type}`, series: '', languages: 'en', refs: '', ...over });
const NT = 'bible.61.1.1-87.22.21';
const OT = 'bible.1.1.1-39.4.6';

describe('usableKind', () => {
  it.each<[string, ListedRow, string | undefined]>([
    ['a commentary on the New Testament', row('text.monograph.commentary.bible', { refs: NT }), 'commentary'],
    ['a commentary on Romans only', row('text.monograph.commentary.bible', { refs: 'bible.66.1.1-66.16.27' }), 'commentary'],
    ['a commentary on the Old Testament', row('text.monograph.commentary.bible', { refs: OT }), undefined],
    ['a commentary with no verses', row('text.monograph.commentary'), undefined],
    ['a Greek lexicon', row('text.monograph.lexicon', { languages: 'el,en' }), 'lexicon'],
    ['a lexicon whose languages are not named', row('text.monograph.lexicon', { languages: '' }), 'lexicon'],
    ['a Hebrew lexicon', row('text.monograph.lexicon', { languages: 'he,en' }), undefined],
    ['a Latin grammar', row('text.monograph.grammar', { languages: 'la' }), undefined],
    ['a grammar of Greek', row('text.monograph.grammar', { languages: 'en,el' }), 'grammar'],
    ['a Greek text', row('text.monograph.bible', { languages: 'el' }), 'greek-text'],
    ['a critical apparatus', row('text.monograph.critical-apparatus.bible', { languages: 'el' }), 'greek-text'],
    ['a Bible in English', row('text.monograph.bible', { languages: 'en' }), undefined],
    ['an interlinear of the New Testament', row('lbx.reverse-interlinear', { refs: NT }), 'interlinear'],
    ['an interlinear of the Old Testament', row('lbx.reverse-interlinear', { refs: OT }), undefined],
    ['a devotional', row('lbx.calendar-devotional', { refs: 'dayofyear.1.1-12.31' }), 'devotional'],
    ['an ancient manuscript', row('text.monograph.ancient-manuscript', { languages: 'el', refs: NT }), undefined],
    ['a dataset', row('lbx.biblicalpeople'), undefined],
    ['a pronunciation tool', row('lbx.pronunciations'), undefined],
  ])('reads %s', (_, r, kind) => {
    expect(usableKind(r)).toBe(kind);
  });
});

describe('usableRows and countsByType', () => {
  const rows = [row('text.monograph.ancient-manuscript'), row('text.monograph.ancient-manuscript'), row('lbx.calendar-devotional'), row('lbx.calendar-devotional'), row('lbx.calendar-devotional')];

  it('keeps the usable rows in the order of the list', () => {
    expect(usableRows(rows).map((r) => r.type)).toEqual(['lbx.calendar-devotional', 'lbx.calendar-devotional', 'lbx.calendar-devotional']);
  });

  it('counts every row by its Logos type, the most first', () => {
    expect(countsByType(rows)).toEqual({ 'lbx.calendar-devotional': 3, 'text.monograph.ancient-manuscript': 2 });
    expect(Object.keys(countsByType(rows))[0]).toBe('lbx.calendar-devotional');
  });

  it('names at most 40 types', () => {
    const many = Array.from({ length: 60 }, (_, i) => row(`lbx.kind${i}`));
    expect(Object.keys(countsByType(many))).toHaveLength(40);
  });
});

describe('libraryCsv', () => {
  it('has the header ResourceId, Type, Title, Series, ReferenceSupersets and one line for each row, quoted where it must be', () => {
    const csv = libraryCsv([row('lbx.calendar-devotional', { resource: 'LLS:1', title: 'Morning, and "Evening"', series: 'S', refs: 'dayofyear.1.1-12.31' })]);
    const [header, ...rest] = parseCsv(csv);
    expect(header).toEqual(['ResourceId', 'Type', 'Title', 'Series', 'ReferenceSupersets']);
    expect(rest).toEqual([['LLS:1', 'lbx.calendar-devotional', 'Morning, and "Evening"', 'S', 'dayofyear.1.1-12.31']]);
  });

  it('keeps the tabs of a ReferenceSupersets cell, as Logos wrote them', () => {
    const [, one] = parseCsv(libraryCsv([row('x', { refs: 'bible.61.1-87.22\tdayofyear.1-12' })]));
    expect(one[4]).toBe('bible.61.1-87.22\tdayofyear.1-12');
  });

  it('stays under 200 KB however long the list: the references give way first, then the last rows', () => {
    const refs = Array.from({ length: 200 }, (_, i) => `bible.${61 + (i % 27)}.${i}.1-87.22.21`).join('\t');
    const big = Array.from({ length: 3000 }, (_, i) => row('text.monograph.commentary.bible', { resource: `LLS:BIG${i}`, title: `Volume ${i} of a very long series of commentaries`, refs }));
    const csv = libraryCsv(big);
    expect(new TextEncoder().encode(csv).length).toBeLessThanOrEqual(MAX_LIBRARY_CSV_BYTES);
    expect(MAX_LIBRARY_CSV_BYTES).toBe(200 * 1024);
    const [, ...lines] = parseCsv(csv);
    expect(lines.length).toBeGreaterThan(100);
    expect(lines[0][0]).toBe('LLS:BIG0');
  });
});
