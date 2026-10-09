// The Old Testament books and the Logos chapter link (mw-5r3p30.71): 39 books in canon order, Logos's own abbreviation for each,
// and the link that opens a chapter in the Bible he chose (logosres: first, ref.ly as the fallback).
import { describe, expect, it } from 'vitest';
import { OT_BOOKS, otBookOf } from '../../src/data/otBooks';
import { DEFAULT_LOGOS_BIBLE, COMMON_BIBLES, isResourceId, chapterLink } from '../../src/resources/logosBible';

describe('the Old Testament books', () => {
  it('are the 39 in canon order, Genesis to Malachi, with distinct codes that never meet an NT code', async () => {
    expect(OT_BOOKS).toHaveLength(39);
    expect(OT_BOOKS[0].name).toBe('Genesis');
    expect(OT_BOOKS[38].name).toBe('Malachi');
    expect(OT_BOOKS.map((b) => b.name).slice(8, 12)).toEqual(['1 Samuel', '2 Samuel', '1 Kings', '2 Kings']);
    expect(new Set(OT_BOOKS.map((b) => b.code)).size).toBe(39);
    const nt = (await import('../../src/data/books')).BOOKS.map((b) => b.code);
    expect(OT_BOOKS.filter((b) => nt.includes(b.code))).toEqual([]);
  });

  it('count 929 chapters between them', () => {
    expect(OT_BOOKS.reduce((n, b) => n + b.chapters, 0)).toBe(929);
    expect(otBookOf('psa')?.chapters).toBe(150);
    expect(otBookOf('mal')?.chapters).toBe(4);
    expect(otBookOf('mat')).toBeUndefined();
  });

  it('use the abbreviations of Logos\'s own list (https://www.logos.com/bible-book-abbreviations), each distinct', () => {
    expect(OT_BOOKS.map((b) => b.logos)).toEqual([
      'Ge', 'Ex', 'Le', 'Nu', 'De', 'Jos', 'Jdg', 'Ru', '1Sa', '2Sa', '1Ki', '2Ki', '1Ch', '2Ch', 'Ezr', 'Ne', 'Es', 'Job', 'Ps', 'Pr',
      'Ec', 'So', 'Isa', 'Jer', 'La', 'Eze', 'Da', 'Ho', 'Joel', 'Am', 'Ob', 'Jon', 'Mic', 'Na', 'Hab', 'Zep', 'Hag', 'Zec', 'Mal',
    ]);
  });
});

describe('the link to a chapter in Logos', () => {
  it('Genesis 1 in the default Bible (LSB) is logosres:lgcystndrdbblsb;ref=Bible.Ge1, with its ref.ly fallback', () => {
    expect(DEFAULT_LOGOS_BIBLE).toBe('LLS:LGCYSTNDRDBBLSB');
    expect(chapterLink('gen', 1, DEFAULT_LOGOS_BIBLE)).toEqual({
      url: 'logosres:lgcystndrdbblsb;ref=Bible.Ge1',
      fallback: 'https://ref.ly/logosres/lgcystndrdbblsb?ref=Bible.Ge1',
    });
  });

  it('Psalms 23 and Malachi 4 name the book by its Logos abbreviation', () => {
    expect(chapterLink('psa', 23, DEFAULT_LOGOS_BIBLE)?.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.Ps23');
    expect(chapterLink('mal', 4, DEFAULT_LOGOS_BIBLE)?.url).toBe('logosres:lgcystndrdbblsb;ref=Bible.Mal4');
  });

  it('follows the Bible he chose, and has no link for a book or chapter that does not exist', () => {
    expect(chapterLink('isa', 53, 'LLS:NASB95')?.url).toBe('logosres:nasb95;ref=Bible.Isa53');
    expect(chapterLink('mat', 1, DEFAULT_LOGOS_BIBLE)).toBeUndefined();
    expect(chapterLink('gen', 51, DEFAULT_LOGOS_BIBLE)).toBeUndefined();
    expect(chapterLink('gen', 0, DEFAULT_LOGOS_BIBLE)).toBeUndefined();
  });

  it('has one link for each of the 929 chapters', () => {
    const urls = OT_BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => chapterLink(b.code, i + 1, DEFAULT_LOGOS_BIBLE)?.url));
    expect(urls.filter((u) => u === undefined)).toEqual([]);
    expect(new Set(urls).size).toBe(929);
  });
});

describe('the Bibles he can pick', () => {
  it('lists LSB first with its Resource ID, and every entry is a well-formed Resource ID', () => {
    expect(COMMON_BIBLES[0]).toEqual({ id: 'LLS:LGCYSTNDRDBBLSB', name: 'LSB (Legacy Standard Bible)' });
    expect(COMMON_BIBLES.length).toBeGreaterThanOrEqual(6);
    for (const b of COMMON_BIBLES) expect(isResourceId(b.id)).toBe(true);
    expect(new Set(COMMON_BIBLES.map((b) => b.id)).size).toBe(COMMON_BIBLES.length);
  });

  it('takes a typed Resource ID of the LLS:… form and nothing else', () => {
    expect(isResourceId('LLS:1.0.710')).toBe(true);
    expect(isResourceId(' LLS:NIV2011 ')).toBe(true);
    expect(isResourceId('')).toBe(false);
    expect(isResourceId('esv')).toBe(false);
    expect(isResourceId('LLS:')).toBe(false);
    expect(isResourceId('LLS:a b')).toBe(false);
    expect(isResourceId('LLS:x;y')).toBe(false);
  });
});
