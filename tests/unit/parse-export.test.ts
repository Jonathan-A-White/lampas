// tests/unit/parse-export.test.ts — src/library/parseExport.ts (mw-rfjjzd.6, docs/design/library-at-scale.md 5.1 and 5.2): the head of his Logos export (tests/fixtures/logos-export-head.csv:
// CRLF line ends, quoted commas, raw tabs inside the last cell, no BOM) reads into 60 rows of 7 fields with and without a BOM, readExport names the columns, and a file that is not a Logos
// list is refused with one plain line.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coversNewTestament, coversOfSupersets, NOT_A_LIST, parseCsv, readExport } from '../../src/library/parseExport';

const BOM = String.fromCharCode(0xfeff);
const FIXTURE = readFileSync('tests/fixtures/logos-export-head.csv', 'utf8');

describe('parseCsv on the head of his export', () => {
  it('has CRLF line ends, no BOM, a quoted comma and a raw tab, so the fixture tests what it says', () => {
    expect(FIXTURE.charCodeAt(0)).not.toBe(0xfeff);
    expect(FIXTURE).toContain('\r\n');
    expect(FIXTURE).toMatch(/"[^"\r\n]*,[^"\r\n]*"/);
    expect(FIXTURE).toContain('\t');
  });

  it('reads the header and 60 rows of 7 fields each', () => {
    const rows = parseCsv(FIXTURE);
    expect(rows).toHaveLength(61);
    expect(rows[0]).toEqual(['ResourceId', 'Type', 'AbbreviatedTitle', 'Title', 'Series', 'Languages', 'ReferenceSupersets']);
    for (const row of rows) expect(row, row[0]).toHaveLength(7);
  });

  it('reads the same rows with a BOM in front', () => {
    expect(parseCsv(`${BOM}${FIXTURE}`)).toEqual(parseCsv(FIXTURE));
  });

  it('keeps a raw tab inside the last cell, and a quoted comma and doubled quotes inside a title', () => {
    expect(parseCsv('a,b,c\r\n1,"x, ""y""",p\tq\r\n')).toEqual([['a', 'b', 'c'], ['1', 'x, "y"', 'p\tq']]);
    const withTab = parseCsv(FIXTURE).find((r) => r[6].includes('\t'));
    expect(withTab?.[6].split('\t').length).toBeGreaterThan(1);
  });

  it('reads LF line ends and a last line with no line end', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('readExport', () => {
  it('reads 60 rows by the header, with and without a BOM', () => {
    const rows = readExport(FIXTURE);
    expect(rows).toHaveLength(60);
    expect(readExport(`${BOM}${FIXTURE}`)).toEqual(rows);
    expect(rows[0]).toEqual({ resource: 'DB:BIBLE-XREFS', type: 'lbx.biblecrossreferences', abbreviated: '', title: 'Important Passages', series: '', languages: 'en', supersets: '' });
    expect(rows.every((r) => r.resource !== '')).toBe(true);
  });

  it('reads columns in any order and an empty cell as empty', () => {
    expect(readExport('Title,ResourceId\r\nBDAG,LLS:46.30.18\r\n')).toEqual([{ resource: 'LLS:46.30.18', type: '', abbreviated: '', title: 'BDAG', series: '', languages: '', supersets: '' }]);
  });

  it('refuses a file whose header lacks ResourceId with one plain line', () => {
    for (const text of ['Id,Name\r\nA,B\r\n', '', 'just some words\r\n']) {
      let message = '';
      try {
        readExport(text);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe(NOT_A_LIST);
      expect(message).toContain('ResourceId');
      expect(message).not.toMatch(/[\r\n]/);
    }
  });
});

describe('coversOfSupersets', () => {
  it('reads the books of the Bible the bible tokens cover, Old Testament too (mw-eup64h)', () => {
    expect(coversOfSupersets('bible.75.1.1-77.3.15')).toEqual(['1ti', '2ti', 'tit']);
    expect(coversOfSupersets('bible.32.1-32.4.11')).toEqual(['jon']);
    expect(coversOfSupersets('bible.28.1.1-33.7.20')).toEqual(['hos', 'jol', 'amo', 'oba', 'jon', 'mic']);
    expect(coversOfSupersets('bible.1.1.1-39.4.6')).toHaveLength(39);
    expect(coversOfSupersets('bible.1.1.1-39.4.6\tbible.61.1.1-87.22.21')).toHaveLength(66);
    expect(coversOfSupersets('bible.40-60')).toEqual([]);
    expect(coversOfSupersets('dayofyear.1.1-12.31')).toEqual([]);
  });

  it('reads the New Testament books alone with coversNewTestament', () => {
    expect(coversNewTestament('bible.75.1.1-77.3.15')).toEqual(['1ti', '2ti', 'tit']);
    expect(coversNewTestament('bible.1.1.1-39.4.6')).toEqual([]);
    expect(coversNewTestament('bible.1.1.1-39.4.6\tbible.61.1.1-87.22.21')).toHaveLength(27);
  });
});
