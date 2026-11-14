// His Logos sermon archives in the catalogue (mw-qtu3zvz.3, docs/resources.md 'The catalogue', docs/sermons.md 'In Logos'): the kind `sermons` taken by the types text.monograph.sermons and
// text.monograph.sermon-outlines, listed in the Library, offered by "In another book…" at a verse, and drawn as the 'In Logos' group of the Sermons sheet. Every link is UNVERIFIED on a device (mw-5r3p30.1072).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalogue, loadRules } from '../../scripts/logos-catalogue';
import { inLogosGroups, inLogosRows, sermonBookRows } from '../../src/library/inLogos';
import { countLine, headerCount, infoOf, KIND_INFO } from '../../src/library/kinds';
import { readExport } from '../../src/library/parseExport';
import { CATALOGUE, entriesOf, KINDS, type CatalogueEntry } from '../../src/resources/catalogue';
import { worksForTutor } from '../../src/resources/tutorLinks';
import type { LibraryRow } from '../../src/data/db';
import type { ShelfState } from '../../src/data/repositories';
import { logosArchives } from '../../src/sermons/sources/logos';
import { EVERY_BOOK } from '../support/logos-import';

const VAULT_EXPORT = process.env.LAMPAS_LOGOS_EXPORT ?? '/home/jwhite/millwright-vault/plans/lampas-logos-library-2026-10-08.csv';
const RULES = loadRules();

const archives = (): readonly CatalogueEntry[] => entriesOf('sermons');
const laurie = () => archives().find((e) => e.resource === 'LLS:GRGLRSRMNRCH')!;
const greear = () => archives().find((e) => e.resource === 'LLS:JDGRRSRMNRCHV')!;
const states = (entries: Record<string, ShelfState>): ReadonlyMap<string, ShelfState> => new Map(Object.entries(entries));

describe('the kind sermons', () => {
  it('is the ninth kind of the catalogue, after the devotionals, with its own file, and no kind of the Library (mw-qtu3zvz.92)', () => {
    expect(KINDS[KINDS.length - 1]).toBe('sermons');
    expect(existsSync('src/resources/catalogue/sermons.json')).toBe(true);
    expect(KIND_INFO.map((i) => i.kind)).not.toContain('sermons');
  });

  it('is named a sermon book and takes Off | On, with no Pin', () => {
    expect(infoOf('sermons')).toMatchObject({ plural: 'Sermon books', singular: 'Sermon book', steps: 'on' });
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
  it('takes the 61 sermon books and 17 outline books by type but seven, each opening at a verse, none with a covers list (two books about preaching are left out and five volumes of Chrysostom are commentaries, mw-qtu3zvz.108)', () => {
    const rows = readExport(readFileSync(VAULT_EXPORT, 'utf8'));
    const sermonRows = rows.filter((r) => r.type === 'text.monograph.sermons');
    const outlineRows = rows.filter((r) => r.type === 'text.monograph.sermon-outlines');
    expect(sermonRows).toHaveLength(61);
    expect(outlineRows).toHaveLength(17);
    const { files } = buildCatalogue(RULES, rows);
    const taken = files.sermons.entries;
    const notArchives = new Set(['LLS:HWRTNARSRM', 'LLS:TRNSFRMTNLPRCHN', 'LLS:6.60.10', 'LLS:6.60.11', 'LLS:6.60.12', 'LLS:6.60.13', 'LLS:6.60.14']);
    expect(taken).toHaveLength(78 - notArchives.size);
    expect(new Set(taken.map((e) => e.resource))).toEqual(new Set([...sermonRows, ...outlineRows].map((r) => r.resource).filter((r) => !notArchives.has(r))));
    for (const e of taken) {
      expect(e.kind).toBe('sermons');
      expect(e.opens).toBe('verse');
      expect(e.via).toBe('type');
      expect(e.covers).toBeUndefined();
      expect(e.value.length).toBeGreaterThan(10);
    }
  });

  it('is what is committed: 71 archives, Greg Laurie’s among them', () => {
    expect(archives()).toHaveLength(71);
    expect(laurie().title).toBe('Greg Laurie Sermon Archive');
    expect(CATALOGUE.filter((e) => e.kind === 'sermons')).toHaveLength(71);
  });
});

describe('"In another book…" at a verse', () => {

  it('lists no sermon book at a New Testament verse; the Sermons door has each linked at the Bible reference with the ref.ly fallback', () => {
    const on = states({ 'LLS:GRGLRSRMNRCH': 'on', 'LLS:JDGRRSRMNRCHV': 'pinned' });
    expect(inLogosRows(archives(), on, { book: 'rom', chapter: 5, verse: 8 }, EVERY_BOOK)).toEqual([]);
    const rows = sermonBookRows(archives(), on, { book: 'rom', chapter: 5, verse: 8 });
    expect(rows.map((r) => r.entry.resource).sort()).toEqual(['LLS:GRGLRSRMNRCH', 'LLS:JDGRRSRMNRCHV']);
    expect(rows.find((r) => r.entry === laurie())!.link).toMatchObject({ url: 'logosres:LLS:GRGLRSRMNRCH;ref=Bible.Ro5.8', fallback: 'https://ref.ly/logosres/LLS%3AGRGLRSRMNRCH?ref=Bible.Ro5.8' });
  });

  it('has them at an Old Testament verse too: a sermon book is indexed by passage, whichever Testament it preaches from', () => {
    const on = states({ 'LLS:GRGLRSRMNRCH': 'on', 'LLS:JDGRRSRMNRCHV': 'pinned' });
    expect(inLogosRows(archives(), on, { book: 'jon', chapter: 1, verse: 1 }, EVERY_BOOK)).toEqual([]);
    expect(sermonBookRows(archives(), on, { book: 'jon', chapter: 1, verse: 1 }).map((r) => r.link.url).sort()).toEqual(['logosres:LLS:GRGLRSRMNRCH;ref=Bible.Jon1.1', 'logosres:LLS:JDGRRSRMNRCHV;ref=Bible.Jon1.1']);
  });

  it('leaves out an archive that is Off or not on the shelf', () => {
    expect(inLogosRows(archives(), states({ 'LLS:GRGLRSRMNRCH': 'off' }), { book: 'rom', chapter: 5, verse: 8 }, EVERY_BOOK)).toEqual([]);
    expect(inLogosRows(archives(), states({}), { book: 'rom', chapter: 5, verse: 8 }, EVERY_BOOK)).toEqual([]);
  });

  it('has no group of sermon books behind In another book…, Pinned or not', () => {
    const on = states({ 'LLS:GRGLRSRMNRCH': 'on', 'LLS:JDGRRSRMNRCHV': 'pinned' });
    const place = { book: 'rom', chapter: 5, verse: 8 };
    expect(inLogosGroups(inLogosRows(archives(), on, place, EVERY_BOOK), place)).toEqual([]);
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

  it('is one row for each sermon book that is On (one once Pinned reads as On), by name, each a link at the verse', () => {
    const rows = logosArchives(place, states({ 'LLS:PRINCESERMON': 'pinned', 'LLS:FRESHSERMS': 'on' }));
    expect(rows.map((r) => r.title)).toEqual(['Fresh Sermons', 'Princeton Sermons']);
    expect(rows[1].open).toEqual({ url: 'logosres:LLS:PRINCESERMON;ref=Bible.Ro5.8', fallback: 'https://ref.ly/logosres/LLS%3APRINCESERMON?ref=Bible.Ro5.8' });
    expect(rows.every((r) => r.opensIn === 'logos')).toBe(true);
  });

  it('opens a passage at its first verse and a whole chapter at the chapter', () => {
    const shelf = states({ 'LLS:PRINCESERMON': 'on' });
    expect(logosArchives({ book: 'rom', chapter: 5, from: 1, to: 11 }, shelf)[0].open.url).toBe('logosres:LLS:PRINCESERMON;ref=Bible.Ro5.1');
    expect(logosArchives({ book: 'rom', chapter: 5 }, shelf)[0].open.url).toBe('logosres:LLS:PRINCESERMON;ref=Bible.Ro5');
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
