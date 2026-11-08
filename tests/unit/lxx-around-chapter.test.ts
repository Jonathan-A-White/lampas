// tests/unit/lxx-around-chapter.test.ts — Lampas Septuagint R8 (mw-u2w5klk.18): the things around the Reader on a Septuagint chapter. Copy and Share name the edition and Lampas's reference; the chapters that share
// a Greek file (Psalms 9 and 10 are Greek 9) each hold only their own verses and Listen reads only those, in Greek; a Greek chapter that holds two Lampas chapters' verses (Psalm 116 is Greek 114 and 115) loads each
// chapter whole; the notice for an index that cannot be reached says offline when the browser does; the Preface has its paragraph on the Septuagint; and with the setting Off Hebrew and the New Testament are as before.
// The files are the fixtures of tests/fixtures/data-lxx (Greek Psalms 9, 22, 114 and 115, Genesis 1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { loadChapter, sourceLanguage } from '../../src/data/chapter';
import { COPY_DEFAULTS, copyReference, copyReferenceLine, copyText, copyUnitOf, sharePieces } from '../../src/copy/format';
import { septuagintNumber, septuagintTitle } from '../../src/reader/septuagint';
import { notReadyNotice } from '../../src/data/lxxChapter';
import { planOf } from '../../src/speech/readAloud';
import { PREFACE_PARAGRAPHS } from '../../src/preface';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch, type ChapterFetch } from '../support/chapter-fetch';
import index from '../fixtures/data-lxx/index.json' with { type: 'json' };
import type { LxxIndex } from '../../src/data/lxxChapter';

let fetched: ChapterFetch;
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  fetched = stubChapterFetch();
});
afterEach(() => vi.unstubAllGlobals());

const lxxRequests = (): string[] => fetched.requests.filter((url) => url.startsWith('/data-lxx/'));
const on = (): Promise<void> => setSetting(septuagintSetting, 'on');
const numbers = (verses: { n: number }[]): number[] => verses.map((v) => v.n);

describe('chapters that share a Greek file each hold only their own verses (Psalms 9 and 10 are Greek 9)', () => {
  beforeEach(on);

  it('Psalm 10 holds the verses whose Lampas chapter is 10, and Psalm 9 those of 9, from the one file', async () => {
    const ten = await loadChapter('psa', 10);
    const nine = await loadChapter('psa', 9);
    expect(numbers(ten.verses)).toEqual([22, 23]);
    expect(ten.verses.map((v) => (v.ref !== 'none' ? v.ref?.chapter : 0))).toEqual([10, 10]);
    expect(numbers(nine.verses)).toEqual([1, 2]);
    expect(ten).toMatchObject({ code: 'psa', chapter: 9, lang: 'grc', edition: 'swete' });
    expect(lxxRequests().filter((u) => u.startsWith('/data-lxx/psa/9.json'))).toHaveLength(2);
  });

  it('Listen reads only those verses, and in Greek', async () => {
    const ten = await loadChapter('psa', 10);
    const plan = planOf(ten.verses, 'greek', null, sourceLanguage(ten));
    expect(numbers(plan)).toEqual([22, 23]);
    expect(plan.flatMap((v) => v.runs.map((r) => r.language))).toEqual(['greek', 'greek']);
    const nine = await loadChapter('psa', 9);
    expect(numbers(planOf(nine.verses, 'greek', null, 'grc'))).toEqual([1, 2]);
  });

  it('a verse of Psalm 10 is shown as Lampas numbers it, the Greek address beside it', async () => {
    const ten = await loadChapter('psa', 10);
    expect(septuagintNumber(ten.verses[0], ten.chapter)).toEqual({ shown: 1, greek: '9:22' });
  });
});

describe('a Greek chapter pair that holds one Lampas chapter (Psalm 116 is Greek 114 and 115)', () => {
  beforeEach(on);

  it('loads both files and shows each verse as Lampas numbers it, the Greek address kept', async () => {
    const chapter = await loadChapter('psa', 116);
    expect(lxxRequests().filter((u) => /psa\/11[45]\.json/.test(u))).toHaveLength(2);
    expect(numbers(chapter.verses)).toEqual([1, 2, 10, 11]);
    expect(chapter.verses.map((v) => v.greek)).toEqual([
      { chapter: 114, verse: 1 },
      { chapter: 114, verse: 2 },
      { chapter: 115, verse: 1 },
      { chapter: 115, verse: 2 },
    ]);
    expect(chapter.verses[2].e[0].t).toMatch(/^I believed/);
    expect(chapter).toMatchObject({ code: 'psa', lang: 'grc', edition: 'swete' });
    expect(septuagintNumber(chapter.verses[2], chapter.chapter)).toEqual({ shown: 10, greek: '115:1' });
    expect(septuagintTitle('Psalms 116', 116, chapter)).toBe('Psalms 116 (Greek 114 and 115)');
  });

  it('a chapter with one file is as it was: no verse is renumbered and none has a Greek address of its own', async () => {
    const chapter = await loadChapter('psa', 23);
    expect(numbers(chapter.verses)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chapter.verses.some((v) => v.greek !== undefined)).toBe(false);
  });
});

describe('Copy and Share on a Septuagint chapter (Psalm 23:1 is Greek 22:1)', () => {
  it('name the edition and the Lampas reference, with the Greek chapter beside it', async () => {
    await on();
    const chapter = await loadChapter('psa', 23);
    const unit = copyUnitOf(chapter, { n: 1 });
    expect(unit.chapter).toBe(23);
    expect(copyReference(unit)).toBe('Psalms 23:1');
    const line = copyReferenceLine(unit);
    expect(line).toContain('Psalms 23:1');
    expect(line).toMatch(/Septuagint/);
    expect(line).toMatch(/Swete/);
    expect(line).toMatch(/Brenton/);
    expect(line).toContain('Greek 22:1');
    expect(line).not.toContain('MSB');
    const text = copyText(unit, COPY_DEFAULTS);
    expect(text).toContain(`— ${line}`);
    const [whole, , , reference] = sharePieces(unit, COPY_DEFAULTS);
    expect(whole.data.title).toBe(line);
    expect(whole.data.text).toContain(line);
    expect(reference.hand).toBe(line);
  });

  it('use the Lampas verse numbers in a passage of Psalm 10, which Greek 9 numbers 22 and 23', async () => {
    await on();
    const ten = await loadChapter('psa', 10);
    const unit = copyUnitOf(ten, { n: 22, to: 23 });
    expect(unit.chapter).toBe(10);
    expect(copyReference(unit)).toBe('Psalms 10');
    expect(unit.kind).toBe('chapter');
    expect(copyReferenceLine(unit)).toContain('Greek 9');
    const passage = copyUnitOf(await loadChapter('psa', 23), { n: 2, to: 3 });
    expect(copyReference(passage)).toBe('Psalms 23:2-3');
    expect(copyText(passage, { ...COPY_DEFAULTS, link: 'off' })).toMatch(/^2 .+ 3 .+\n— Psalms 23:2-3 \(Septuagint/);
  });

  it('give the Hebrew and the New Testament the lines they always had', async () => {
    const hebrew = await loadChapter('psa', 23);
    expect(copyReferenceLine(copyUnitOf(hebrew, { n: 1 }))).toBe('Psalms 23:1 (MSB)');
    const john = await loadChapter('jhn', 1);
    expect(copyReferenceLine(copyUnitOf(john, { n: 1 }))).toBe('John 1:1 (MSB)');
    expect(sharePieces(copyUnitOf(john, { n: 1 }), COPY_DEFAULTS)[0].data.title).toBe('John 1:1');
  });
});

describe('the notice for a Septuagint that is not here', () => {
  const from = index as unknown as LxxIndex;
  it('says not ready only when the index was reached and the book or chapter is not in it', () => {
    expect(notReadyNotice(from, true, 'isa', 1, 'Isaiah')).toBe('The Septuagint of Isaiah is not ready yet; this is the Hebrew.');
    expect(notReadyNotice(from, true, 'gen', 2, 'Genesis')).toBe('The Septuagint of Genesis 2 is not ready yet; this is the Hebrew.');
    expect(notReadyNotice(from, false, 'isa', 1, 'Isaiah')).toBe('The Septuagint of Isaiah is not ready yet; this is the Hebrew.');
  });
  it('says the phone is offline and a Septuagint chapter needs the network when the index could not be reached offline', () => {
    const line = notReadyNotice(null, false, 'gen', 1, 'Genesis');
    expect(line).toMatch(/offline/i);
    expect(line).toMatch(/needs the network/);
    expect(line).toMatch(/this is the Hebrew/);
    expect(line).not.toMatch(/not ready/);
  });
  it('says it could not be fetched, not not-ready, when the index could not be reached online', () => {
    const line = notReadyNotice(null, true, 'gen', 1, 'Genesis');
    expect(line).not.toMatch(/not ready/);
    expect(line).toMatch(/could not be fetched/);
  });
});

describe('the Preface speaks of the Septuagint', () => {
  it('has a paragraph on Swete’s Greek and Brenton’s English, public domain, and nothing of the app', () => {
    const paragraph = PREFACE_PARAGRAPHS.find((p) => p.includes('Septuagint') && p.includes('Swete'));
    expect(paragraph).toBeDefined();
    expect(paragraph).toContain('Brenton');
    expect(paragraph).toContain('public domain');
  });
});
