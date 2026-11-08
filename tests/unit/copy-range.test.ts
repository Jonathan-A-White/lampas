// tests/unit/copy-range.test.ts — the text the tutor's copy and share chips put on the clipboard (mw-5r3p30.1075): a reference the tutor wrote ('Heb.9.11-10.4',
// 'Hebrews 9:11-10:4') read as a range, and the text of that range across a chapter boundary in the format When you copy gives. Hebrews 9 and 10 are the committed files.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COPY_DEFAULTS, type CopyFormat } from '../../src/copy/format';
import { parseCopyRange, rangeCopy, UnreadableChapter } from '../../src/copy/rangeText';
import type { Chapter } from '../../src/data/chapter';

const load = async (book: string, n: number): Promise<Chapter> => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const english = (chapter: Chapter, n: number): string =>
  chapter.verses
    .find((v) => v.n === n)!
    .e.map((c) => c.t.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('parseCopyRange', () => {
  it('reads a verse, a range in one chapter, a range across chapters and a whole chapter, in the data’s form and as written', () => {
    expect(parseCopyRange('Heb.9.11')).toMatchObject({ book: 'heb', chapter: 9, verse: 11, toChapter: 9, to: 11, name: 'Hebrews 9:11' });
    expect(parseCopyRange('Heb.9.11-14')).toMatchObject({ chapter: 9, verse: 11, toChapter: 9, to: 14, name: 'Hebrews 9:11-14' });
    expect(parseCopyRange('Heb.9.11-10.4')).toMatchObject({ chapter: 9, verse: 11, toChapter: 10, to: 4, name: 'Hebrews 9:11-10:4' });
    expect(parseCopyRange('Hebrews 9:11-10:4')).toMatchObject({ chapter: 9, verse: 11, toChapter: 10, to: 4, name: 'Hebrews 9:11-10:4' });
    expect(parseCopyRange('Hebrews 9:11 – 10:4')).toMatchObject({ toChapter: 10, to: 4 });
    expect(parseCopyRange('Hebrews 9')).toMatchObject({ chapter: 9, toChapter: 9, name: 'Hebrews 9' });
    expect(parseCopyRange('Hebrews 9')?.verse).toBeUndefined();
    expect(parseCopyRange('Heb.9-10')).toMatchObject({ chapter: 9, toChapter: 10, name: 'Hebrews 9-10' });
    expect(parseCopyRange('Isaiah 53:4-6')).toMatchObject({ book: 'isa', chapter: 53, verse: 4, to: 6, name: 'Isaiah 53:4-6' });
  });

  it('is null for a book Lampas does not hold, a chapter the book lacks, a range that runs backwards, and what is not a reference', () => {
    expect(parseCopyRange('Wisdom of Solomon 3:1')).toBeNull();
    expect(parseCopyRange('Hebrews 40:1')).toBeNull();
    expect(parseCopyRange('Hebrews 10:4-9:11')).toBeNull();
    expect(parseCopyRange('Hebrews 9:11-8:2')).toBeNull();
    expect(parseCopyRange('Hebrews 9:14-11')).toBeNull();
    expect(parseCopyRange('Hebrews')).toBeNull();
    expect(parseCopyRange('every verse about faith')).toBeNull();
    expect(parseCopyRange('Hebrews 9:1-2-3')).toBeNull();
  });
});

describe('rangeCopy across a chapter boundary', () => {
  const rangeOf = (text: string) => parseCopyRange(text)!;

  it('numbers each verse, marks the first verse of the next chapter with its chapter, puts the reference after and the link to the first verse last', async () => {
    const [nine, ten] = [await load('heb', 9), await load('heb', 10)];
    const { text, name } = await rangeCopy(rangeOf('Heb.9.11-10.4'), COPY_DEFAULTS, { load });
    expect(name).toBe('Hebrews 9:11-10:4');
    const lines = text.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith(`11 ${english(nine, 11)} 12 ${english(nine, 12)} `)).toBe(true);
    expect(lines[0]).toContain(` 28 ${english(nine, 28)} 10:1 ${english(ten, 1)} 2 ${english(ten, 2)} `);
    expect(lines[0].endsWith(` 4 ${english(ten, 4)}`)).toBe(true);
    expect(lines[0]).not.toContain(english(ten, 5));
    expect(lines[0]).not.toContain(english(nine, 10));
    expect(lines[1]).toBe('— Hebrews 9:11-10:4 (MSB)');
    expect(lines[2]).toBe('https://lampas.allmymind.org/#/?ref=Heb.9.11');
  });

  it('follows the format: reference before, verse numbers off, no link', async () => {
    const format: CopyFormat = { reference: 'before', numbers: 'off', link: 'off' };
    const { text } = await rangeCopy(rangeOf('Hebrews 9:27-10:1'), format, { load });
    const [nine, ten] = [await load('heb', 9), await load('heb', 10)];
    expect(text).toBe(`Hebrews 9:27-10:1 (MSB)\n${english(nine, 27)} ${english(nine, 28)} ${english(ten, 1)}`);
  });

  it('gives the share its title, its words without the link, and the link as its url while Link is On', async () => {
    const on = await rangeCopy(rangeOf('Hebrews 9:27-10:1'), COPY_DEFAULTS, { load });
    expect(on.share.title).toBe('Hebrews 9:27-10:1');
    expect(on.share.url).toBe('https://lampas.allmymind.org/#/?ref=Heb.9.27');
    expect(on.share.text).not.toContain('https://');
    expect(on.share.text).toContain('— Hebrews 9:27-10:1 (MSB)');
    const off = await rangeCopy(rangeOf('Hebrews 9:27-10:1'), { ...COPY_DEFAULTS, link: 'off' }, { load });
    expect(off.share.url).toBeUndefined();
  });

  it('is the text a hold gives when the range is inside one chapter', async () => {
    const { text } = await rangeCopy(rangeOf('Hebrews 9:11-12'), COPY_DEFAULTS, { load });
    const nine = await load('heb', 9);
    expect(text).toBe(`11 ${english(nine, 11)} 12 ${english(nine, 12)}\n— Hebrews 9:11-12 (MSB)\nhttps://lampas.allmymind.org/#/?ref=Heb.9.11-12`);
  });

  it('reads two whole chapters as Hebrews 9-10, and the end of a chapter past its last verse as the chapter’s last', async () => {
    const whole = await rangeCopy(rangeOf('Hebrews 9-10'), COPY_DEFAULTS, { load });
    expect(whole.text.split('\n')[1]).toBe('— Hebrews 9-10 (MSB)');
    const past = await rangeCopy(rangeOf('Hebrews 9:27-99'), COPY_DEFAULTS, { load });
    expect(past.text).toContain(` 28 ${english(await load('heb', 9), 28)}\n`);
  });

  it('puts the chapters in the view the Reader is in: the Greek of the chapter in Greek', async () => {
    const { text } = await rangeCopy(rangeOf('Hebrews 9:28-10:1'), { ...COPY_DEFAULTS, link: 'off', reference: 'off' }, { load, read: () => ({ view: 'greek', woven: null }) });
    const nine = await load('heb', 9);
    const greek = nine.verses.find((v) => v.n === 28)!.g.map((w) => w.t).join(' ');
    expect(text.startsWith(`28 ${greek} 10:1 `)).toBe(true);
  });

  it('says which chapter it could not read, and gives nothing', async () => {
    const failing = async (book: string, n: number): Promise<Chapter> => {
      if (n === 10) throw new Error('offline');
      return load(book, n);
    };
    const error = await rangeCopy(rangeOf('Heb.9.11-10.4'), COPY_DEFAULTS, { load: failing }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnreadableChapter);
    expect((error as UnreadableChapter).chapter).toBe('Hebrews 10');
  });

  it('says so when the chapter has no verse in the range', async () => {
    const error = await rangeCopy(rangeOf('Hebrews 9:99'), COPY_DEFAULTS, { load }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnreadableChapter);
    expect((error as UnreadableChapter).chapter).toBe('Hebrews 9');
  });
});
