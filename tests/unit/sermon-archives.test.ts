// His Logos sermon archives in the catalogue (mw-qtu3zvz.3, docs/resources.md 'The catalogue', docs/sermons.md 'In Logos'): the kind `sermons` taken by the types text.monograph.sermons and
// text.monograph.sermon-outlines, listed in the Library, offered by "In another book…" at a verse, and drawn as the 'In Logos' group of the Sermons sheet. Every link is UNVERIFIED on a device (mw-5r3p30.1072).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, loadRules } from '../../scripts/logos-catalogue';
import { inLogosGroups, inLogosRows } from '../../src/library/inLogos';
import { countLine, headerCount, infoOf, KIND_INFO } from '../../src/library/kinds';
import { readExport } from '../../src/library/parseExport';
import { CATALOGUE, entriesOf, KINDS, type CatalogueEntry } from '../../src/resources/catalogue';
import { worksForTutor } from '../../src/resources/tutorLinks';
import type { LibraryRow } from '../../src/data/db';
import type { ShelfState } from '../../src/data/repositories';
import { logosArchives } from '../../src/sermons/sources/logos';

const VAULT_EXPORT = process.env.LAMPAS_LOGOS_EXPORT ?? '/home/jwhite/millwright-vault/plans/lampas-logos-library-2026-10-08.csv';
const RULES = loadRules();

const archives = (): readonly CatalogueEntry[] => entriesOf('sermons');
const laurie = () => archives().find((e) => e.resource === 'LLS:GRGLRSRMNRCH')!;
const greear = () => archives().find((e) => e.resource === 'LLS:JDGRRSRMNRCHV')!;
const states = (entries: Record<string, ShelfState>): ReadonlyMap<string, ShelfState> => new Map(Object.entries(entries));

describe('the kind sermons', () => {
  it('is the ninth kind, after the devotionals, with its own file', () => {
    expect([...KINDS]).toEqual(['lexicon', 'grammar', 'greek-text', 'hebrew-text', 'interlinear', 'commentary', 'bible', 'devotional', 'sermons']);
    expect(KIND_INFO.map((i) => i.kind)).toEqual([...KINDS]);
  });

  it('is named for the Library and takes Off | On | Pinned like a commentary', () => {
    const info = infoOf('sermons');
    expect(info.plural).toBe('Sermons');
    expect(info.singular).toBe('Sermon archive');
    expect(info.steps).toBe('pin');
    expect(info.help.length).toBeGreaterThan(20);
  });

  it('counts its books on the shelf like another kind', () => {
    const shelf = states({ 'LLS:GRGLRSRMNRCH': 'pinned', 'LLS:JDGRRSRMNRCHV': 'on' });
    expect(countLine('sermons', shelf)).toBe('2 on · 1 pinned');
    expect(headerCount('sermons', shelf)).toBe('2 on');
    expect(countLine('sermons', states({}))).toBe('none on');
  });

  it('has a rule for each of the two Logos types, and a value line', () => {
    const rules = RULES.types.filter((t) => t.kind === 'sermons').map((t) => t.type);
    expect(rules).toEqual(['text.monograph.sermons', 'text.monograph.sermon-outlines']);
    expect(RULES.values.sermons?.trim()).toBeTruthy();
  });
});

describe.skipIf(!existsSync(VAULT_EXPORT))('the catalogue written from his whole export', () => {
  it('takes 61 sermon books and 17 outline books by type, each opening at a verse, none with a covers list', () => {
    const rows = readExport(readFileSync(VAULT_EXPORT, 'utf8'));
    const sermonRows = rows.filter((r) => r.type === 'text.monograph.sermons');
    const outlineRows = rows.filter((r) => r.type === 'text.monograph.sermon-outlines');
    expect(sermonRows).toHaveLength(61);
    expect(outlineRows).toHaveLength(17);
    const { files } = buildCatalogue(RULES, rows);
    const taken = files.sermons.entries;
    expect(taken).toHaveLength(78);
    expect(new Set(taken.map((e) => e.resource))).toEqual(new Set([...sermonRows, ...outlineRows].map((r) => r.resource)));
    for (const e of taken) {
      expect(e.kind).toBe('sermons');
      expect(e.opens).toBe('verse');
      expect(e.via).toBe('type');
      expect(e.covers).toBeUndefined();
      expect(e.value.length).toBeGreaterThan(10);
    }
  });

  it('is what is committed: 78 archives, Greg Laurie’s among them', () => {
    expect(archives()).toHaveLength(78);
    expect(laurie().title).toBe('Greg Laurie Sermon Archive');
    expect(CATALOGUE.filter((e) => e.kind === 'sermons')).toHaveLength(78);
  });
});

describe('"In another book…" at a verse', () => {
  const shelf = states({ 'LLS:GRGLRSRMNRCH': 'on', 'LLS:JDGRRSRMNRCHV': 'pinned' });

  it('lists the On and Pinned archives at a New Testament verse, each linked at the Bible reference with the ref.ly fallback', () => {
    const rows = inLogosRows(archives(), shelf, { book: 'rom', chapter: 5, verse: 8 });
    const ids = rows.map((r) => r.entry.resource);
    expect(ids.sort()).toEqual(['LLS:GRGLRSRMNRCH', 'LLS:JDGRRSRMNRCHV']);
    const row = rows.find((r) => r.entry.resource === 'LLS:GRGLRSRMNRCH')!;
    expect(row.link.url).toBe('logosres:LLS:GRGLRSRMNRCH;ref=Bible.Ro5.8');
    expect(row.link.fallback).toBe('https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH?ref=Bible.Ro5.8');
  });

  it('lists them at an Old Testament verse too: an archive is indexed by passage, whichever Testament it preaches from', () => {
    const rows = inLogosRows(archives(), shelf, { book: 'jon', chapter: 1, verse: 1 });
    expect(rows.map((r) => r.entry.resource).sort()).toEqual(['LLS:GRGLRSRMNRCH', 'LLS:JDGRRSRMNRCHV']);
    expect(rows[0].link.url).toMatch(/;ref=Bible\.Jon1\.1$/);
  });

  it('leaves out an archive that is Off or not on the shelf', () => {
    expect(inLogosRows(archives(), states({ 'LLS:GRGLRSRMNRCH': 'off' }), { book: 'rom', chapter: 5, verse: 8 })).toEqual([]);
    expect(inLogosRows(archives(), states({}), { book: 'rom', chapter: 5, verse: 8 })).toEqual([]);
  });

  it('groups them as Pinned first and then Sermon archives', () => {
    const rows = inLogosRows(archives(), shelf, { book: 'rom', chapter: 5, verse: 8 });
    const groups = inLogosGroups(rows, { book: 'rom', chapter: 5, verse: 8 });
    expect(groups.map((g) => g.title)).toEqual(['Pinned', 'Sermon archives (1)']);
    expect(groups[0].rows[0].entry.resource).toBe('LLS:JDGRRSRMNRCHV');
  });
});

describe('the tutor’s digest of the shelf', () => {
  it('leaves the sermon archives out for now: the tutor is not told of them and cannot link one', () => {
    const shelf: LibraryRow[] = archives().map((e) => ({ id: e.resource, kind: e.kind, state: 'pinned' as const, since: 1 }));
    const works = worksForTutor(shelf, { book: 'rom', chapter: 5, verse: 8 }, 'what do the sermons say');
    expect(JSON.stringify(works)).not.toContain('GRGLRSRMNRCH');
    expect(JSON.stringify(works)).not.toContain('Sermon Archive');
  });
});

describe('logosArchives: the rows of the sheet’s In Logos group', () => {
  const place = { book: 'rom', chapter: 5, from: 8, to: 8 };

  it('is one row for each Pinned or On archive, the Pinned first, each a link at the verse', () => {
    const rows = logosArchives(place, states({ 'LLS:GRGLRSRMNRCH': 'on', 'LLS:JDGRRSRMNRCHV': 'pinned' }));
    expect(rows.map((r) => r.title)).toEqual(['J. D. Greear Sermon Archive', 'Greg Laurie Sermon Archive']);
    expect(rows[0].open).toEqual({ url: 'logosres:LLS:JDGRRSRMNRCHV;ref=Bible.Ro5.8', fallback: 'https://ref.ly/logosres/LLS%3AJDGRRSRMNRCHV?ref=Bible.Ro5.8' });
    expect(rows.every((r) => r.opensIn === 'logos')).toBe(true);
  });

  it('opens a passage at its first verse and a whole chapter at the chapter', () => {
    const shelf = states({ 'LLS:GRGLRSRMNRCH': 'on' });
    expect(logosArchives({ book: 'rom', chapter: 5, from: 1, to: 11 }, shelf)[0].open.url).toBe('logosres:LLS:GRGLRSRMNRCH;ref=Bible.Ro5.1');
    expect(logosArchives({ book: 'rom', chapter: 5 }, shelf)[0].open.url).toBe('logosres:LLS:GRGLRSRMNRCH;ref=Bible.Ro5');
  });

  it('is none for an archive that is Off, or a book that is not a sermon archive', () => {
    expect(logosArchives(place, states({ 'LLS:GRGLRSRMNRCH': 'off' }))).toEqual([]);
    expect(logosArchives(place, states({ 'LLS:CALCOM66RO': 'on' }))).toEqual([]);
    expect(logosArchives(place, states({}))).toEqual([]);
  });

  it('keeps the archive’s catalogue entry for the credit line', () => {
    expect(greear().title).toBe('J. D. Greear Sermon Archive');
  });
});
