// tests/unit/old-testament-verse.test.ts — an Old Testament verse wherever a New Testament one goes, in English (mw-uqlxea.3): the Verse view's actions are chosen by the chapter's source
// language, the verse's Logos doors take the commentaries whose `covers` name the book, the links and the references written for the 39 books, and a canonical reference of any book names its verses.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { BookIndex } from '../../src/data/chapter';
import { DEFAULT_CHAPTER } from '../../src/data/readerChapter';
import { inLogosRows } from '../../src/library/inLogos';
import { versesOf } from '../../src/memorize/refs';
import { passageUrl, referenceUrl, resolveReference } from '../../src/nav/links';
import type { CatalogueEntry } from '../../src/resources/catalogue';
import { verseLink } from '../../src/resources/logosBible';
import { actionsFor } from '../../src/verse/action';
import { stubChapterFetch } from '../support/chapter-fetch';

const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;

describe('the actions of an Old Testament verse', () => {
  it('are Listen, Read it aloud and Ask the tutor: Quiz me and Diagram wait for the Hebrew epic', () => {
    expect(actionsFor(true, 'hbo').map((a) => a.label)).toEqual(['Listen', 'Read it aloud', 'Ask the tutor']);
    expect(actionsFor(true, 'grc').map((a) => a.label)).toEqual(['Listen', 'Read it aloud', 'Ask the tutor', 'Quiz me', 'Diagram']);
    expect(actionsFor(true).map((a) => a.id)).toContain('quiz');
  });

  it('are Listen alone without a licence, as the New Testament\'s are', () => {
    expect(actionsFor(false, 'hbo').map((a) => a.id)).toEqual(['listen']);
  });
});

describe('the Logos doors of Jonah 1:10', () => {
  const commentary = (resource: string, covers: string[]): CatalogueEntry => ({ resource, kind: 'commentary', title: resource, short: resource, lang: 'en', opens: 'verse', value: 'a test commentary', covers, via: 'id' });
  const entries = [commentary('LLS:ON.JONAH', ['jon']), commentary('LLS:ON.ROMANS', ['rom'])];
  const states = new Map(entries.map((e) => [e.resource, 'on' as const]));

  it('offer a commentary that covers jon and not one that covers rom', () => {
    const rows = inLogosRows(entries, states, { book: 'jon', chapter: 1, verse: 10 });
    expect(rows.map((r) => r.entry.resource)).toEqual(['LLS:ON.JONAH']);
    expect(rows[0].link.url).toContain('Bible.Jon1.10');
  });

  it('write the Bible link with the canon\'s Logos abbreviation and the verse appended', () => {
    expect(verseLink('jon', 1, 10, 'LLS:LGCYSTNDRDBBLSB')?.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.Jon1.10');
  });
});

describe('the links of the 39 books', () => {
  it('are written with the Old Testament\'s OSIS codes', () => {
    expect(referenceUrl('jon', 1, 10)).toBe('https://lampas.allmymind.org/#/?ref=Jonah.1.10');
    expect(referenceUrl('2ki', 14, 25)).toBe('https://lampas.allmymind.org/#/?ref=2Kgs.14.25');
    expect(passageUrl('psa', 23, 1, 3)).toBe('https://lampas.allmymind.org/#/?ref=Ps.23.1-3');
    expect(passageUrl('rom', 8, 1, 11)).toBe('https://lampas.allmymind.org/#/?ref=Rom.8.1-11');
  });

  it('open in the Reader, at the verse, with no notice', () => {
    expect(resolveReference('Jonah.1.10', index, DEFAULT_CHAPTER)).toEqual({ book: 'jon', chapter: 1, verse: 10, notice: null });
    expect(resolveReference('2Kgs.14.25', index, DEFAULT_CHAPTER)).toEqual({ book: '2ki', chapter: 14, verse: 25, notice: null });
    expect(resolveReference('Psalm 23', index, DEFAULT_CHAPTER)).toEqual({ book: 'psa', chapter: 23, verse: null, notice: null });
    expect(resolveReference('Gen 1:1-3', index, DEFAULT_CHAPTER)).toEqual({ book: 'gen', chapter: 1, verse: 1, to: 3, notice: null });
  });

  it('open the nearest place when the chapter or verse is past the end, and say so', () => {
    const jonah = index.books.find((b) => b.code === 'jon')!;
    expect(resolveReference('Jonah.9.1', index, DEFAULT_CHAPTER)).toMatchObject({ book: 'jon', chapter: jonah.chapters, verse: null, notice: expect.stringContaining('is not in Lampas;') });
    const opened = resolveReference('Jonah.1.99', index, DEFAULT_CHAPTER);
    expect(opened).toMatchObject({ book: 'jon', chapter: 1, verse: jonah.verses[0] });
    expect(opened.notice).toBe(`“Jonah 1:99” is not in Lampas; showing Jonah 1:${jonah.verses[0]}.`);
  });
});

describe('the verses of a canonical reference', () => {
  beforeEach(() => void stubChapterFetch());

  it('are the Old Testament\'s as well, each its own Verse of the chapter', async () => {
    const found = await versesOf('Jonah.1.10');
    if (!found) throw new Error('no verses');
    expect(found).toMatchObject({ book: 'jon', chapter: 1, heading: 'Jonah 1:10' });
    expect(found.verses.map((v) => v.n)).toEqual([10]);
    expect(found.source.lang).toBe('hbo');
    expect((await versesOf('Jonah.1.10-12'))?.verses.map((v) => v.n)).toEqual([10, 11, 12]);
  });

  it('name nothing for a chapter or verse a book lacks', async () => {
    expect(await versesOf('Jonah.9.1')).toBeNull();
    expect(await versesOf('Jonah.1.99')).toBeNull();
  });
});
