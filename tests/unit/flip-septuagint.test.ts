// tests/unit/flip-septuagint.test.ts — a hold on the Reader header's Greek / Hebrew button flips the Septuagint setting from where he reads (mw-u2w5klk.293): which Lampas verse a Greek verse is and the other way
// round, what the flip does in a book that can and cannot flip, and the verse it carries across.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { getLastVerse, setLastVerse } from '../../src/data/readerChapter';
import { FLIP_TEXT, flipSeptuagint, greekVerseOf, lampasVerseOf } from '../../src/reader/flipSeptuagint';
import { septuagintSetting } from '../../src/settings/definitions';
import { getSetting, setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../support/chapter-fetch';

afterAll(() => db.close());
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  localStorage.clear();
  stubChapterFetch();
});

const verse = (n: number, ref: Verse['ref'], refs?: Verse['refs']): Verse => ({ n, ref, ...(refs ? { refs } : {}), g: [], e: [] });
const at = (chapter: number, v: number) => ({ book: 'psa', chapter, verse: v });
const shown = (edition?: 'swete', verses: Verse[] = []): Chapter => ({ book: 'Psalms', code: 'psa', chapter: 22, lang: edition ? 'grc' : 'hbo', edition, lex: {}, parse: {}, verses }) as unknown as Chapter;

// Greek Psalm 50 is Psalm 51: its title is the Greek verse 1 (Lampas has no verse for the title's own number, 'none'), and its verses are one number higher in the Greek than in the English
const PSALM_51 = { verses: [verse(1, 'none'), verse(2, at(51, 1)), verse(3, at(51, 2)), verse(4, at(51, 3))] };

describe('the Lampas verse of a Greek verse', () => {
  it('is its own ref in the chapter', () => {
    expect(lampasVerseOf(PSALM_51, 3, 51)).toBe(2);
    expect(lampasVerseOf({ verses: [verse(1, at(23, 1)), verse(2, at(23, 2))] }, 2, 23)).toBe(2);
  });

  it('is the next verse that has one for a Greek verse Lampas has none for (the title), else the last before', () => {
    expect(lampasVerseOf(PSALM_51, 1, 51)).toBe(1);
    expect(lampasVerseOf({ verses: [verse(1, at(5, 1)), verse(2, 'none')] }, 2, 5)).toBe(1);
  });

  it('counts only the verses of the Lampas chapter (Greek Psalm 9 holds Psalms 9 and 10)', () => {
    const nine = { verses: [verse(1, at(9, 1)), verse(2, at(9, 2)), verse(3, at(10, 1)), verse(4, at(10, 2))] };
    expect(lampasVerseOf(nine, 4, 10)).toBe(2);
    expect(lampasVerseOf(nine, 4, 9)).toBe(2);
    expect(lampasVerseOf(nine, 1, 10)).toBe(1);
  });

  it('is the first of several a Greek verse answers', () => {
    expect(lampasVerseOf({ verses: [verse(1, at(7, 3), [at(7, 3), at(7, 4)])] }, 1, 7)).toBe(3);
  });
});

describe('the Greek verse of a Lampas verse', () => {
  it('is the one that answers it (Psalm 51:2 is Greek verse 3)', () => {
    expect(greekVerseOf(PSALM_51, 2, 51)).toBe(3);
    expect(greekVerseOf(PSALM_51, 1, 51)).toBe(2);
  });

  it('is found in the second Lampas verse a Greek verse answers', () => {
    expect(greekVerseOf({ verses: [verse(1, at(7, 3), [at(7, 3), at(7, 4)])] }, 4, 7)).toBe(1);
  });

  it('is the nearest below when no verse answers it, else the first', () => {
    const gap = { verses: [verse(1, at(5, 1)), verse(2, at(5, 3))] };
    expect(greekVerseOf(gap, 2, 5)).toBe(1);
    expect(greekVerseOf(gap, 9, 5)).toBe(2);
    expect(greekVerseOf({ verses: [verse(1, at(5, 4))] }, 1, 5)).toBe(1);
  });

  it('is null when the Greek chapter holds no verse of the Lampas chapter', () => {
    expect(greekVerseOf({ verses: [verse(1, at(9, 1))] }, 1, 10)).toBeNull();
  });
});

describe('the flip', () => {
  it('turns the setting on in a shipped Old Testament book, from the Hebrew, and says so', async () => {
    expect(await flipSeptuagint({ book: 'gen', chapter: 1, shown: shown(), top: null })).toBe(FLIP_TEXT.on);
    expect(await getSetting(septuagintSetting)).toBe('on');
  });

  it('turns the setting off from the Septuagint, and says the Hebrew is on', async () => {
    await setSetting(septuagintSetting, 'on');
    expect(await flipSeptuagint({ book: 'gen', chapter: 1, shown: shown('swete'), top: null })).toBe(FLIP_TEXT.off);
    expect(await getSetting(septuagintSetting)).toBe('off');
  });

  it('keeps Genesis 1:5 as the verse the chapter comes back to, both ways', async () => {
    await flipSeptuagint({ book: 'gen', chapter: 1, shown: shown(), top: 5 });
    expect(getLastVerse('gen', 1)).toBe(5);
    const gen = shown('swete', Array.from({ length: 31 }, (_, i) => verse(i + 1, { book: 'gen', chapter: 1, verse: i + 1 })));
    await flipSeptuagint({ book: 'gen', chapter: 1, shown: gen, top: 5 });
    expect(getLastVerse('gen', 1)).toBe(5);
  });

  it('maps the verse where the numbering differs: Hebrew Psalm 23 verse 2 is Greek Psalm 22 verse 2, and back', async () => {
    const fixture = (await import('node:fs')).readFileSync('tests/fixtures/data-lxx/psa/22.json', 'utf8');
    const greek = JSON.parse(fixture) as Chapter;
    const target = greek.verses.find((v) => v.ref && v.ref !== 'none' && v.ref.chapter === 23 && v.ref.verse === 3);
    expect(target).toBeDefined();
    await flipSeptuagint({ book: 'psa', chapter: 23, shown: shown(), top: 3 });
    expect(getLastVerse('psa', 23)).toBe(target?.n);
    await flipSeptuagint({ book: 'psa', chapter: 23, shown: greek, top: target?.n ?? null });
    expect(getLastVerse('psa', 23)).toBe(3);
  });

  it('forgets a remembered verse when the chapter is at its top', async () => {
    setLastVerse('gen', 1, 9);
    await flipSeptuagint({ book: 'gen', chapter: 1, shown: shown(), top: null });
    expect(getLastVerse('gen', 1)).toBeUndefined();
  });

  it('changes nothing in the New Testament and says only an Old Testament book has one', async () => {
    expect(await flipSeptuagint({ book: 'mat', chapter: 1, shown: shown(), top: null })).toBe(FLIP_TEXT.notOldTestament);
    expect(await getSetting(septuagintSetting)).toBe('off');
  });

  it('changes nothing in a book that is not one of Lampas\'s (a Septuagint-only book such as Sirach)', async () => {
    expect(await flipSeptuagint({ book: 'sir', chapter: 1, shown: shown('swete'), top: null })).toBe(FLIP_TEXT.notOldTestament);
    expect(await getSetting(septuagintSetting)).toBe('off');
  });

  it('changes nothing in an Old Testament book with no Septuagint shipped, and names the book', async () => {
    expect(await flipSeptuagint({ book: 'isa', chapter: 1, shown: shown(), top: null })).toBe('The Septuagint of Isaiah is not ready yet');
    expect(await getSetting(septuagintSetting)).toBe('off');
  });

  it('changes nothing in a chapter of a shipped book that has no Greek chapter yet', async () => {
    expect(await flipSeptuagint({ book: 'psa', chapter: 1, shown: shown(), top: null })).toBe('The Septuagint of Psalms is not ready yet');
    expect(await getSetting(septuagintSetting)).toBe('off');
  });

  it('waits for the chapter: with none on screen it changes nothing', async () => {
    expect(await flipSeptuagint({ book: 'gen', chapter: 1, shown: null, top: null })).toBe(FLIP_TEXT.loading);
    expect(await getSetting(septuagintSetting)).toBe('off');
  });
});
