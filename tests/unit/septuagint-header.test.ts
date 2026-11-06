// tests/unit/septuagint-header.test.ts — the header line under a Septuagint chapter's title and the sheet a tap on it opens (mw-u2w5klk.276): the line says in plain words whose texts these are,
// and the sheet's text comes from src/tutor/credits.ts alone (one source, no second copy).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEPTUAGINT_SUBTITLE, SEPTUAGINT_SHEET_TITLE } from '../../src/reader/septuagint';
import { SEPTUAGINT_SOURCES } from '../../src/tutor/credits';

const read = (path: string): string => readFileSync(path, 'utf8');

describe('the Septuagint header line', () => {
  it("reads exactly \"Greek: Swete's edition · English: Brenton's translation\"", () => {
    expect(SEPTUAGINT_SUBTITLE).toBe("Greek: Swete's edition · English: Brenton's translation");
  });

  it("opens a sheet titled 'Whose texts these are'", () => {
    expect(SEPTUAGINT_SHEET_TITLE).toBe('Whose texts these are');
  });
});

describe('the sheet text, from src/tutor/credits.ts', () => {
  const all = SEPTUAGINT_SOURCES.map((s) => `${s.label}: ${s.text}`).join('\n');

  it('names the Greek, the English, the words and the versification, in that order', () => {
    expect(SEPTUAGINT_SOURCES.map((s) => s.label)).toEqual(['Greek', 'English', "The words' lemma and parsing", 'Versification']);
  });

  it("credits Swete's edition, following Codex Vaticanus, public domain", () => {
    expect(all).toContain('Henry Barclay Swete, The Old Testament in Greek (Cambridge, 1887 to 1894; the 1909 to 1912 printing), following Codex Vaticanus, public domain');
  });

  it("credits Brenton's 1844 translation in eBible's 2012 edition, public domain", () => {
    expect(all).toContain("Sir Lancelot Brenton's 1844 translation of the Septuagint, in eBible's 2012 edition with modernised spelling (eng-lxx2012), public domain");
  });

  it("says the lemma and parsing are Lampas's own and links the method", () => {
    const words = SEPTUAGINT_SOURCES.find((s) => s.label === "The words' lemma and parsing");
    expect(words?.text).toContain("Lampas's own");
    expect(words?.link?.href).toBe('https://github.com/Jonathan-A-White/lampas/blob/main/docs/lxx-derivation.md');
  });

  it('credits the versification: STEPBible TVTMS, CC BY 4.0', () => {
    expect(all).toContain('STEPBible TVTMS, CC BY 4.0');
  });

  it('is not copied into the Reader or its sheet: they draw SEPTUAGINT_SOURCES', () => {
    for (const file of ['src/Reader.tsx', 'src/reader/septuagint.ts', 'src/reader/SeptuagintSources.tsx']) {
      const text = read(file);
      expect(text, file).not.toContain('Henry Barclay Swete');
      expect(text, file).not.toContain('Lancelot Brenton');
      expect(text, file).not.toContain('TVTMS');
    }
    expect(read('src/reader/SeptuagintSources.tsx')).toContain('SEPTUAGINT_SOURCES');
  });
});

describe('the other screens that print Swete or LXX2012', () => {
  it('print neither code name bare in what a reader sees', () => {
    // The settings row and help say "Swete’s Greek with Brenton’s English" in plain words; LXX2012 is only a data name in code comments and the credit.
    for (const file of ['src/settings/definitions/septuagint.ts', 'src/reader/ChapterText.tsx', 'src/reader/VerseText.tsx']) {
      const shown = read(file)
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l) && !/\/\*\*/.test(l));
      expect(shown.join('\n'), file).not.toContain('LXX2012');
    }
  });
});
