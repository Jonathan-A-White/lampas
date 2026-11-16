// mw-5r3p30.1165: a verse of poetry in the Hebrew tab is broken into lines at its major accents (docs/data.md 'Poetry lines'), and the Weave draws a poetry verse in the English lines.
import { cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { fillChapter, type Chapter, type Verse } from '../../src/data/chapter';
import { hebrewLinesOf } from '../../src/data/poetry';
import { weaveVerse, type WovenVerse } from '../../src/data/weave';
import { linesShown } from '../../src/reader/poetryText';
import { VerseText } from '../../src/reader/VerseText';
import type { Lookup } from '../../src/WordSheet';

afterEach(cleanup);
const chapterOf = (path: string): Chapter => fillChapter(JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as Chapter);
const verseOf = (path: string, n: number): Verse => chapterOf(path).verses.find((v) => v.n === n)!;
/** the consonants of a line, its points and accents off (a maqqef stays as '־'), the words one space apart: what a reader checks a break against */
const bare = (text: string): string => text.replace(/[֑-ֽֿ-ׇ]/g, '').replace(/\s+/g, ' ').trim();
const linesOf = (path: string, n: number): string[] | undefined => hebrewLinesOf(verseOf(path, n))?.map((l) => bare(l.text));
const none = (): void => undefined;

describe('the Hebrew lines of a verse of poetry', () => {
  it('breaks Psalm 1:1 at its oleh-weyored and its atnach', () => {
    expect(linesOf('psa/1', 1)).toEqual([
      'אשרי־ האיש אשר לא הלך בעצת רשעים', // oleh-weyored on רְשָׁ֫עִ֥ים
      'ובדרך חטאים לא עמד', // atnach on עָמָ֑ד
      'ובמושב לצים לא ישב',
    ]);
  });

  it('breaks Psalm 23:1-4 at its atnach (a title and a clause on the one atnach, a verse with an atnach and none else)', () => {
    expect(linesOf('psa/23', 1)).toEqual(['מזמור לדוד', 'יהוה רעי לא אחסר']);
    expect(linesOf('psa/23', 2)).toEqual(['בנאות דשא ירביצני', 'על־ מי מנחות ינהלני']);
    expect(linesOf('psa/23', 3)).toEqual(['נפשי ישובב', 'ינחני במעגלי־ צדק למען שמו']);
    expect(linesOf('psa/23', 4)).toEqual(['גם כי־ אלך בגיא צלמות לא־ אירא רע כי־ אתה עמדי', 'שבטך ומשענתך המה ינחמני']);
  });

  it("takes the oleh's yored from the next word when the oleh stands on a word that leans on it (Psalm 1:3 פַּלְגֵ֫י מָ֥יִם)", () => {
    expect(linesOf('psa/1', 3)?.[0]).toBe('והיה כעץ שתול על־ פלגי מים');
  });

  it('breaks a long half of a verse in Isaiah at its zaqef, a short half it leaves whole', () => {
    expect(linesOf('isa/40', 2)).toEqual([
      'דברו על־ לב ירושלם וקראו אליה',
      'כי מלאה צבאה',
      'כי נרצה עונה',
      'כי לקחה מיד יהוה כפלים בכל־ חטאתיהס',
    ]);
    expect(linesOf('isa/40', 1)).toEqual(['נחמו נחמו עמי', 'יאמר אלהיכם']);
    expect(linesOf('isa/40', 3)).toEqual(['קול קורא במדבר פנו דרך יהוה', 'ישרו בערבה מסלה לאלהינו']);
  });

  it('leaves prose as one run: Genesis 1:1 has no lines, and a verse of poetry with no major accent is one run too', () => {
    expect(hebrewLinesOf(verseOf('gen/1', 1))).toBeNull();
    const oneAccent: Verse = { ...verseOf('psa/23', 1), g: verseOf('psa/23', 1).g.slice(2, 4), hl: undefined };
    expect(hebrewLinesOf(oneAccent)).toBeNull();
  });

  it('gives the lines the words of the verse, in order, none twice and none left out', () => {
    for (const [path, n] of [['psa/1', 1], ['psa/23', 4], ['isa/40', 2], ['job/3', 3]] as const) {
      const verse = verseOf(path, n);
      const spans = hebrewLinesOf(verse)!;
      expect(spans[0].from).toBe(0);
      expect(spans.at(-1)!.to).toBe(verse.g.length);
      spans.slice(1).forEach((s, k) => expect(s.from).toBe(spans[k].to));
    }
  });

  it('is carried by a chapter as it loads: a verse of a Hebrew chapter that has English lines has Hebrew ones, a Greek one has none', () => {
    expect(verseOf('psa/1', 1).hl).toEqual([0, 7, 11]);
    expect(verseOf('gen/1', 1).hl).toBeUndefined();
    expect(verseOf('jhn/1', 1).hl).toBeUndefined();
  });
});

describe('VerseText with Hebrew lines', () => {
  const verse = verseOf('psa/1', 1);

  it('draws the Hebrew view as one block a line, each line hung, the words the same taps', () => {
    const looks: Lookup[] = [];
    const { container } = render(<VerseText verse={verse} view="greek" source="hbo" woven={null} onLook={(l) => looks.push(l)} poetry />);
    const lines = [...container.querySelectorAll<HTMLElement>('[data-line]')];
    expect(lines.map((l) => bare(l.textContent ?? ''))).toEqual(['אשרי־ האיש אשר לא הלך בעצת רשעים', 'ובדרך חטאים לא עמד', 'ובמושב לצים לא ישב']);
    expect(lines.map((l) => l.getAttribute('data-indent'))).toEqual(['1', '1', '1']);
    expect(container.querySelectorAll('[data-word]')).toHaveLength(verse.g.length);
    fireEvent.click(container.querySelector('[data-word="1"]')!);
    expect(looks).toHaveLength(1);
    expect(looks[0].words[0].t).toBe(verse.g[1].t);
  });

  it('puts the lead and the trail in the first and the last Hebrew line', () => {
    const { container } = render(<VerseText verse={verse} view="greek" source="hbo" woven={null} onLook={none} poetry lead={<b data-lead>1</b>} trail={<i data-trail>play</i>} />);
    const lines = [...container.querySelectorAll('[data-line]')];
    expect(lines[0].querySelector('[data-lead]')).not.toBeNull();
    expect(lines[2].querySelector('[data-trail]')).not.toBeNull();
  });

  it('is running text where it is not asked for lines, on a card, and for a verse of prose', () => {
    for (const props of [{ poetry: false }, { still: true }]) {
      const { container } = render(<VerseText verse={verse} view="greek" source="hbo" woven={null} onLook={none} poetry {...props} />);
      expect(container.querySelectorAll('[data-line]'), JSON.stringify(props)).toHaveLength(0);
      cleanup();
    }
    const { container } = render(<VerseText verse={verseOf('gen/1', 1)} view="greek" source="hbo" woven={null} onLook={none} poetry />);
    expect(container.querySelectorAll('[data-line]')).toHaveLength(0);
  });
});

describe('VerseText in the Weave', () => {
  const verse = verseOf('psa/1', 1);
  const woven = (): WovenVerse => weaveVerse(verse, { solid: new Set(['אִישׁ', 'הָלַךְ', 'יָשַׁב']) });

  it("draws a poetry verse in the English lines with the Hebrew words in the places of their English", () => {
    const w = woven();
    expect(w.some((x) => x !== null)).toBe(true);
    const { container } = render(<VerseText verse={verse} view="english" source="hbo" woven={w} onLook={none} poetry />);
    const lines = [...container.querySelectorAll<HTMLElement>('[data-line]')];
    expect(lines.map((l) => l.getAttribute('data-indent'))).toEqual(['1', '2', '1', '2']);
    expect(lines).toHaveLength(4);
    expect(container.querySelectorAll('[data-woven]').length).toBeGreaterThan(0);
    // the woven Hebrew of 'man' stands in the first line, in the place of 'man'
    expect(lines[0].querySelector('[data-woven]')?.textContent).toContain('אִ');
    expect(lines.map((l) => l.querySelectorAll('[data-chunk]').length).reduce((a, b) => a + b, 0)).toBe(verse.e.length);
  });

  it('keeps a tap on a woven word and on an English one', () => {
    const looks: Lookup[] = [];
    const { container } = render(<VerseText verse={verse} view="english" source="hbo" woven={woven()} onLook={(l) => looks.push(l)} poetry />);
    fireEvent.click(container.querySelector('[data-woven]')!);
    fireEvent.click(container.querySelector('[data-chunk]:not([data-woven])')!);
    expect(looks).toHaveLength(2);
  });

  it('is running text in a weave laid out in the source order (its chunks no longer stand where the lines name them)', () => {
    const ordered = Object.assign([...woven()], { order: verse.e.map((_, i) => verse.e.length - 1 - i) }) as unknown as WovenVerse;
    expect(linesShown(verse, 'english', ordered, true)).toBeNull();
    expect(linesShown(verse, 'english', woven(), true)).toHaveLength(4);
  });
});
