// tests/unit/hebrew-texts.test.ts — the eighth kind of the Logos catalogue (mw-5r3p30.1115): the Hebrew Bibles Logos sells, which an Old Testament verse opens in as a Greek text does for the
// New Testament. The Resource IDs are Logos's own (its topic page of Hebrew Bible text resources, topics.logos.com/?id=10693); the Lexham Hebrew Bible stays among the Bibles, where one is chosen.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inLogosGroups, inLogosRows } from '../../src/library/inLogos';
import { isListed, matchExport } from '../../src/library/matchExport';
import type { ExportRow } from '../../src/library/parseExport';
import { infoOf, pinRefusal } from '../../src/library/kinds';
import { usableKind } from '../../src/library/usableRows';
import { entriesOf, KINDS } from '../../src/resources/catalogue';
import { bibleRef } from '../../src/resources/logosBible';

const hebrew = entriesOf('hebrew-text');
const on = new Map(hebrew.map((e) => [e.resource, 'on' as const]));

describe('the hebrew-text kind', () => {
  it('is a kind of its own, with the plural Hebrew texts and a pin', () => {
    expect(KINDS).toContain('hebrew-text');
    expect(infoOf('hebrew-text')).toMatchObject({ plural: 'Hebrew texts', singular: 'Hebrew text', steps: 'pin' });
  });

  it('holds at least three Hebrew Bibles, each Hebrew, opening at a verse, with a Logos Resource ID and the Old Testament alone', () => {
    expect(hebrew.length).toBeGreaterThanOrEqual(3);
    for (const e of hebrew) {
      expect(e.lang, e.resource).toBe('he');
      expect(e.opens, e.resource).toBe('verse');
      expect(e.resource, e.resource).toMatch(/^LLS:/);
      expect(e.parts, e.resource).toEqual(['ot']);
    }
    expect(hebrew.map((e) => e.resource)).toEqual(expect.arrayContaining(['LLS:BHSSESB', 'LLS:BHW418']));
  });

  it('names a refused pin by the kind', () => {
    expect(pinRefusal(hebrew[0])).toBe('Three pinned already: unpin one first');
  });
});

describe('the Hebrew texts group of the chooser', () => {
  it('is drawn at Genesis 1:1 with a link to the verse in each Hebrew text that is On', () => {
    const place = { book: 'gen', chapter: 1, verse: 1 };
    const rows = inLogosRows(hebrew, on, place);
    expect(rows).toHaveLength(hebrew.length);
    const group = inLogosGroups(rows, place).find((g) => g.key === 'hebrew-text');
    expect(group?.title).toBe(`Hebrew texts (${hebrew.length})`);
    for (const r of rows) expect(r.link.url).toBe(`logosres:${r.entry.resource};ref=${bibleRef('gen', 1, 1)}`);
  });

  it('is not drawn at Romans 8:1', () => {
    expect(inLogosRows(hebrew, on, { book: 'rom', chapter: 8, verse: 1 })).toEqual([]);
  });

  it('puts a pinned one first, in the Pinned group, at Psalm 23:1 with the Psalms’ own link', () => {
    const place = { book: 'psa', chapter: 23, verse: 1 };
    const states = new Map(hebrew.map((e, i) => [e.resource, i === 1 ? ('pinned' as const) : ('on' as const)]));
    const groups = inLogosGroups(inLogosRows(hebrew, states, place), place);
    expect(groups[0].key).toBe('pinned');
    expect(groups[0].rows[0].link.url).toBe(`logosres:${hebrew[1].resource};ref=Bible.Ps23.1`);
  });
});

describe('importing a Logos list that holds a Hebrew text', () => {
  const row = (resource: string): ExportRow => ({ resource, type: 'text.monograph.bible', abbreviated: '', title: 'Biblia Hebraica Stuttgartensia: SESB 2.0 Version', series: '', languages: 'he', supersets: 'bible.1.1.1-39.4.6' });

  it('matches it by its Resource ID as a Hebrew text, listed, so the import turns it on', () => {
    const [m] = matchExport([row('LLS:BHSSESB')]).matched;
    expect(m).toMatchObject({ by: 'id', kind: 'hebrew-text' });
    expect(isListed(m)).toBe(true);
  });

  it('reads a Hebrew Bible of a list the catalogue does not hold as a Hebrew text worth asking the makers about', () => {
    expect(usableKind({ resource: 'LLS:SOMEOTHERHEBREWBIBLE', type: 'text.monograph.bible', title: 'A Hebrew Bible', series: '', languages: 'he', refs: 'bible.1.1.1-39.4.6' })).toBe('hebrew-text');
  });

  it('still reads a Greek Bible as a Greek text', () => {
    expect(usableKind({ resource: 'LLS:X', type: 'text.monograph.bible', title: 'A Greek Bible', series: '', languages: 'el', refs: 'bible.40.1.1-66.22.21' })).toBe('greek-text');
  });
});

describe('the committed file', () => {
  it('is the rules’ entries for the ids they name', () => {
    const file = JSON.parse(readFileSync('src/resources/catalogue/hebrew-text.json', 'utf8')) as { kind: string };
    expect(file.kind).toBe('hebrew-text');
  });
});
