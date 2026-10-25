// tests/unit/logos-fit.test.ts — npm run logos:fit (scripts/logos-fit.ts, mw-rfjjzd.2): the rows of an export the catalogue does not take, by kind, each with its data types.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readExport, type Rules } from '../../scripts/logos-catalogue';
import { dataTypesOf, fitReport, formatFit, guessKind } from '../../scripts/logos-fit';

const root = join(__dirname, '../..');
const RULES = JSON.parse(readFileSync(join(root, 'data/logos/catalogue-rules.json'), 'utf8')) as Rules;
const FIXTURE = readFileSync(join(root, 'tests/fixtures/logos-export-head.csv'), 'utf8');

describe('logos:fit', () => {
  it('reads the data types of a ReferenceSupersets cell: its names, with no numbers', () => {
    expect(dataTypesOf('bible.61.1.1-87.22.21')).toEqual(['bible']);
    expect(dataTypesOf('dayofyear.1.1.1-12.31.2\tbible.1.1.1-39.4.6')).toEqual(['dayofyear', 'bible']);
    expect(dataTypesOf('bible+esv.61-87')).toEqual(['bible+esv']);
    expect(dataTypesOf('ltrntg.1-187')).toEqual(['ltrntg']);
    expect(dataTypesOf('')).toEqual([]);
  });

  it('guesses the kind a row would be, from its Logos type', () => {
    expect(guessKind({ type: 'text.monograph.lexicon', languages: 'en' })).toBe('lexicon');
    expect(guessKind({ type: 'text.monograph.grammar', languages: 'en' })).toBe('grammar');
    expect(guessKind({ type: 'text.monograph.commentary.bible', languages: 'en' })).toBe('commentary');
    expect(guessKind({ type: 'text.monograph.bible', languages: 'el' })).toBe('greek-text');
    expect(guessKind({ type: 'text.monograph.bible', languages: 'en' })).toBe('bible');
    expect(guessKind({ type: 'lbx.reverse-interlinear', languages: 'en' })).toBe('interlinear');
    expect(guessKind({ type: 'lbx.calendar-devotional', languages: 'en' })).toBe('devotional');
    expect(guessKind({ type: 'lbx.interactive', languages: 'en' })).toBe('other');
  });

  it('on the fixture: 60 rows, the 22 calendar devotionals taken, the other 38 left and counted by type', () => {
    const report = fitReport(RULES, readExport(FIXTURE));
    expect(report.rows).toBe(60);
    expect(report.matched).toBe(22);
    expect(report.unmatched).toBe(38);
    expect(Object.fromEntries(report.byKind.map((k) => [k.kind, k.rows.length]))).toEqual({ lexicon: 0, grammar: 0, 'greek-text': 0, interlinear: 0, commentary: 0, bible: 0, devotional: 0, other: 38 });
    expect(report.byKind.find((k) => k.kind === 'other')?.types).toEqual({
      'lbx.interactive': 22, 'lbx.crossreferences': 3, 'lbx.biblecrossreferences': 1, 'lbx.biblicalevents': 1, 'lbx.biblicalpeople': 1, 'lbx.biblicalpeoplediagrams': 1,
      'lbx.biblicalplaces': 1, 'lbx.biblicalplacesmaps': 1, 'lbx.biblicalreferents': 1, 'lbx.biblicalthings': 1, 'lbx.biographies': 1, 'lbx.churchhistoryontology': 1,
      'lbx.counselingthemes': 1, 'lbx.excerpts': 1, 'lbx.fbmedia': 1,
    });
  });

  it('lists an unmatched row under its kind with its type, its title and its data types', () => {
    const extra = [
      'LLS:NEWGRAM,text.monograph.grammar,,A Greek Grammar We Do Not Name,,en,newg.1-200',
      'LLS:NEWBIBLE,text.monograph.bible,,"A Bible, Plain",,en,bible+nb.1-87',
      'LLS:OTCOMM,text.monograph.commentary.bible,,Genesis,Some Series,en,bible.1.1.1-1.50.26',
    ].join('\r\n');
    const report = fitReport(RULES, readExport(`${FIXTURE}${extra}\r\n`));
    const kinds = Object.fromEntries(report.byKind.map((k) => [k.kind, k.rows.map((r) => r.resource)]));
    expect(kinds.grammar).toEqual(['LLS:NEWGRAM']);
    expect(kinds.commentary).toEqual(['LLS:OTCOMM']);
    // an English Bible of the whole Bible is a type rule's: taken, not unmatched
    expect(kinds.bible).toEqual([]);
    expect(report.matched).toBe(23);
    const text = formatFit(report);
    expect(text).toContain('grammar (1)');
    expect(text).toContain('LLS:NEWGRAM  text.monograph.grammar  A Greek Grammar We Do Not Name  [newg]');
    expect(text).toContain('LLS:OTCOMM  text.monograph.commentary.bible  Genesis  [bible]  (Old Testament)');
    expect(text).toContain('other (38): lbx.interactive 22');
  });

  it('names each rule of the catalogue that matches no row of the export it is given', () => {
    const report = fitReport(RULES, readExport(FIXTURE));
    expect(report.unmatchedRules).toEqual(expect.arrayContaining(['type lbx.reverse-interlinear', 'series Pillar New Testament Commentary', 'id LLS:46.30.18']));
    expect(report.unmatchedRules).not.toContain('type lbx.calendar-devotional');
    expect(formatFit(report)).toMatch(/rules that match no row \(\d+\): .*series Pillar New Testament Commentary/);
    const row = 'LLS:PNTCX,text.monograph.commentary.bible,,Romans,Pillar New Testament Commentary,en,bible.66.1.1-66.16.27';
    const withPillar = fitReport(RULES, readExport(`${FIXTURE}${row}\r\n`));
    expect(withPillar.unmatchedRules).not.toContain('series Pillar New Testament Commentary');
  });

  it('runs from the command line on the fixture', () => {
    const out = execFileSync(process.execPath, ['--import', 'tsx', join(root, 'scripts/logos-fit.ts'), join(root, 'tests/fixtures/logos-export-head.csv')], { cwd: root, encoding: 'utf8' });
    expect(out).toContain('60 rows: 22 taken by the catalogue, 38 not');
    expect(out).toContain('other (38)');
  }, 60_000);
});
