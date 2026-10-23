// tests/unit/resources-for-level.test.ts — every study resource is marked Greek or English (mw-5r3p30.710) and one selector, src/resources/resourcesForLevel.ts,
// says what the 'How much Greek?' dial shows of a list: Just English hides the Greek ones, the steps between put the English ones first, All in changes nothing.
import { describe, expect, it } from 'vitest';
import type { StudyResources } from '../../src/data/repositories';
import { RESOURCES } from '../../src/resources';
import type { CatalogueEntry } from '../../src/resources/catalogue';
import { GRAMMAR_BOOKS, readMoreFor } from '../../src/resources/grammarBooks';
import { resourcesForLevel } from '../../src/resources/resourcesForLevel';
import { resourcesForTutor, verseChips, wordChips, workChip, worksForTutor } from '../../src/resources/tutorLinks';
import type { GrammarBook, ResourceLang, StudyResource } from '../../src/resources/types';
import { WORKS, type Work } from '../../src/resources/works';
import { orderResourceRows, rowOf, visibleRows, ROWS, type Values } from '../../src/settings/rows';
import { GREEK_LEVELS, type GreekLevel } from '../../src/settings/definitions/greekInterest';

const item = (id: string, lang: ResourceLang) => ({ id, lang });
const LIST = [item('g1', 'grc'), item('e1', 'en'), item('b1', 'both'), item('g2', 'grc'), item('e2', 'en')];
const ids = (list: readonly { id: string }[]): string[] => list.map((i) => i.id);
const on = (...names: string[]): StudyResources => ({ on: names, options: {} });

describe('resourcesForLevel', () => {
  it('at Just English keeps the English and the both ones, in their order, and hides the Greek', () => {
    expect(ids(resourcesForLevel(LIST, 0))).toEqual(['e1', 'b1', 'e2']);
  });

  it('at every step between puts the English and both ones first, then the Greek, each side in its own order', () => {
    for (const level of [1, 2, 3, 4] as GreekLevel[]) expect(ids(resourcesForLevel(LIST, level)), `level ${level}`).toEqual(['e1', 'b1', 'e2', 'g1', 'g2']);
  });

  it('at All in returns the list unchanged', () => {
    expect(ids(resourcesForLevel(LIST, 5))).toEqual(['g1', 'e1', 'b1', 'g2', 'e2']);
  });

  it('shows a both entry at every step, among the English ones', () => {
    for (const { level } of GREEK_LEVELS) expect(ids(resourcesForLevel([item('g', 'grc'), item('b', 'both')], level)), `level ${level}`).toContain('b');
  });

  it('gives nothing for an empty list, and a list of only Greek ones is empty at Just English', () => {
    for (const { level } of GREEK_LEVELS) expect(resourcesForLevel([], level)).toEqual([]);
    expect(resourcesForLevel([item('g', 'grc')], 0)).toEqual([]);
    expect(ids(resourcesForLevel([item('g', 'grc')], 3))).toEqual(['g']);
  });

  it('does not change the list it is given', () => {
    const copy = [...LIST];
    resourcesForLevel(copy, 0);
    resourcesForLevel(copy, 2);
    expect(copy).toEqual(LIST);
  });

  it('reads the language through a function when the list is not made of entries that carry it', () => {
    const rows = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    const lang = (r: { key: string }): ResourceLang => (r.key === 'b' ? 'en' : 'grc');
    expect(resourcesForLevel(rows, 0, lang).map((r) => r.key)).toEqual(['b']);
    expect(resourcesForLevel(rows, 2, lang).map((r) => r.key)).toEqual(['b', 'a', 'c']);
  });
});

describe('every entry says which language it is', () => {
  it('marks each of RESOURCES, WORKS and GRAMMAR_BOOKS grc, en or both', () => {
    for (const entry of [...RESOURCES, ...WORKS, ...GRAMMAR_BOOKS]) expect(['grc', 'en', 'both'], entry.id).toContain(entry.lang);
  });

  it("marks Strong's and Black grc, Calvin's works en, and the apps that open both Logos and Accordance both", () => {
    const lang = (list: readonly { id: string; lang: ResourceLang }[], id: string) => list.find((e) => e.id === id)?.lang;
    expect(lang(RESOURCES, 'strongs')).toBe('grc');
    expect(lang(RESOURCES, 'logos')).toBe('both');
    expect(lang(RESOURCES, 'accordance')).toBe('both');
    expect(lang(GRAMMAR_BOOKS, 'black')).toBe('grc');
    for (const work of WORKS) expect(work.lang, work.id).toBe('en');
  });

  it('is required by the type: an entry without it does not compile', () => {
    // @ts-expect-error a study resource with no lang
    const resource: StudyResource = { id: 'x', name: 'X', kind: 'app', describe: '', linksFor: () => [] };
    // @ts-expect-error a work with no lang
    const work: Work = { id: 'x', title: 'X', author: 'A', kind: 'book', source: '', volumes: [] };
    // @ts-expect-error a grammar book with no lang
    const book: GrammarBook = { id: 'x', short: 'X', name: 'X', resource: 'LLS:X', source: '', sections: [] };
    expect([resource, work, book]).toHaveLength(3);
  });
});

describe('the lists the app draws go through the selector', () => {
  it('Read more: a Greek book is not offered at Just English, and an English one comes before it at the steps between', () => {
    const book = (id: string, lang: ResourceLang): GrammarBook => ({ id, lang, short: id, name: id, resource: `LLS:${id}`, source: 'test', sections: [{ title: 'One', ref: 'Page.p_1', ideas: ['noun'] }] });
    const books = [book('greek', 'grc'), book('english', 'en')];
    expect(readMoreFor('noun', ['greek', 'english'], books, 0).map((l) => l.book.id)).toEqual(['english']);
    expect(readMoreFor('noun', ['greek', 'english'], books, 2).map((l) => l.book.id)).toEqual(['english', 'greek']);
    expect(readMoreFor('noun', ['greek', 'english'], books, 5).map((l) => l.book.id)).toEqual(['greek', 'english']);
    expect(readMoreFor('noun', ['greek', 'english'], books).map((l) => l.book.id)).toEqual(['greek', 'english']);
  });

  it("the tutor is told Strong's at every step but Just English, and Logos and Accordance always, English ones first", () => {
    const all = on('strongs', 'logos', 'accordance');
    expect(resourcesForTutor(all, 0).map((r) => r.id)).toEqual(['logos', 'accordance']);
    expect(resourcesForTutor(all, 2).map((r) => r.id)).toEqual(['logos', 'accordance', 'strongs']);
    expect(resourcesForTutor(all, 5).map((r) => r.id)).toEqual(['strongs', 'logos', 'accordance']);
  });

  it('the tutor’s word and verse chips leave out a Greek resource at Just English and keep the rest', () => {
    const all = on('strongs', 'logos', 'accordance');
    expect(wordChips('ἀγάπη', 'G26', all, 0).map((c) => c.resource.id)).toEqual(['logos', 'accordance']);
    expect(wordChips('ἀγάπη', 'G26', all, 3).map((c) => c.resource.id)).toEqual(['logos', 'accordance', 'strongs']);
    expect(wordChips('ἀγάπη', 'G26', all).map((c) => c.resource.id)).toEqual(['strongs', 'logos', 'accordance']);
    const place = { book: 'rom', chapter: 8, verse: 31 };
    expect(verseChips(place, 'Romans 8:31', all, 'LLS:LGCYSTNDRDBBLSB', 0).map((c) => c.resource.id)).toEqual(verseChips(place, 'Romans 8:31', all, 'LLS:LGCYSTNDRDBBLSB').map((c) => c.resource.id));
  });

  it('the tutor’s digest of his shelf and the work chip follow the dial through the selector, and a hidden work keeps its tick', () => {
    const ticked = WORKS.map((w) => w.id);
    const greek: CatalogueEntry = { resource: 'LLS:GRCCOM', kind: 'commentary', title: 'A Greek commentary', short: 'Greek commentary', lang: 'grc', opens: 'verse', value: 'v', via: 'id', covers: ['rom'] };
    const english: CatalogueEntry = { ...greek, resource: 'LLS:ENGCOM', title: 'An English commentary', short: 'English commentary', lang: 'en' };
    const shelf = [greek, english].map((e, i) => ({ id: e.resource, kind: e.kind, state: 'on' as const, since: i }));
    const place = { book: 'rom', chapter: 8 };
    const told = (level: GreekLevel) => worksForTutor(shelf, place, '', level, [greek, english]).flatMap((w) => ('id' in w ? [w.id] : []));
    expect(told(0)).toEqual(['LLS:ENGCOM']);
    expect(told(5).sort()).toEqual(['LLS:ENGCOM', 'LLS:GRCCOM']);
    expect(workChip('calvin-institutes-lcc', undefined, ticked, undefined, 0)).not.toBeNull();
    expect(ticked).toEqual(WORKS.map((w) => w.id));
  });
});

describe('the Study resources rows follow the dial', () => {
  const switches = (rows: readonly { key: string }[]): string[] => rows.filter((r) => r.key.startsWith('resource.')).map((r) => r.key);
  const at = (level: GreekLevel): Values => ({ greekInterest: String(level), 'resource.logos': 'on' });

  it("hides Strong's at Just English and draws it from Curious up, through the selector", () => {
    expect(switches(visibleRows(at(0), ''))).toEqual(['resource.logos', 'resource.accordance']);
    expect(switches(visibleRows(at(1), ''))).toEqual(['resource.strongs', 'resource.logos', 'resource.accordance']);
  });

  it('orders the switches English first between, and leaves them as they were at All in', () => {
    const rows = ROWS.filter((r) => r.section === 'resources');
    expect(switches(orderResourceRows(rows, 2))).toEqual(['resource.logos', 'resource.accordance', 'resource.strongs']);
    expect(switches(orderResourceRows(rows, 5))).toEqual(['resource.strongs', 'resource.logos', 'resource.accordance']);
    expect(orderResourceRows(rows, 2)).toHaveLength(rows.length);
    // a switch a link forces into view at Just English is ordered, not dropped
    expect(switches(orderResourceRows(rows, 0))).toHaveLength(3);
    expect(rowOf('library')).toBeDefined();
  });
});
