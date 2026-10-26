// src/copy/format.ts — what Copy gives for a verse, a passage or a whole chapter (mw-9txn0x1.1, Settings > Reading > When you copy). Pure: copyText(unit, format)
// is the text the Verse view's Copy puts on the clipboard and Share hands the share sheet. The format is the four rows of the setting
// (src/settings/definitions/copyFormat.ts): Text (as you read it | English | the original | both), Reference (after | before | off), Verse numbers (on | off), Link (on | off).
import type { Chapter, SourceLanguage, Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { passageUrl, referenceUrl } from '../nav/links';

/** `asread` is the text in the view on now (the Reader's English, Greek or Hebrew, or its Weave); the others name the text. */
export type CopyText = 'asread' | 'english' | 'original' | 'both';
export type CopyReference = 'after' | 'before' | 'off';
export type OnOffChoice = 'on' | 'off';

export interface CopyFormat {
  text: CopyText;
  reference: CopyReference;
  numbers: OnOffChoice;
  link: OnOffChoice;
}

/** What Copy gives until he changes a row: the text as he reads it, the reference after it, the verse numbers of more than one verse, and the link. */
export const COPY_DEFAULTS: CopyFormat = { text: 'asread', reference: 'after', numbers: 'on', link: 'on' };

/** The translation the reference names: the English of every chapter, the New Testament's and the Old's, is the MSB's (src/data/chapter.ts `translation`). */
const TRANSLATION = 'MSB';

export interface CopyVerse {
  n: number;
  english: string;
  /** the verse in its own language (Greek or Hebrew); '' when the chapter has none */
  original: string;
  /** the verse as the Reader shows it in the view on now (English, the original or the Weave); absent when the view is not known: the English */
  shown?: string;
}

/** The view a chapter is read in: the Reader's view and, in step with `chapter.verses`, its Weave of each verse (null when it is not woven). */
export interface ReadView {
  view: ReaderView;
  woven: readonly (WovenVerse | null)[] | null;
}

export interface CopyUnit {
  kind: 'verse' | 'passage' | 'chapter';
  /** the book's name: 'Colossians' */
  book: string;
  /** the book's code: 'col' */
  code: string;
  chapter: number;
  /** the language of the original text */
  language: SourceLanguage;
  verses: readonly CopyVerse[];
}

const englishOf = (verse: Verse): string => verse.e.map((chunk) => chunk.t.trim()).join(' ').replace(/\s+/g, ' ').trim();
const originalOf = (verse: Verse): string => verse.g.map((word) => word.t).join(' ').trim();

/** The verse as the Reader draws it in `view`: the original's words; the English chunks in the order the weave lays them out, a woven chunk as the words of its own language
 * (what the Reader shows over a learning word's English hint is the Greek alone); else the English. */
function shownOf(verse: Verse, view: ReaderView, woven: WovenVerse | null): string {
  if (view === 'greek') return originalOf(verse) || englishOf(verse);
  if (!woven) return englishOf(verse);
  return drawnOrder(verse, woven)
    .map((i) => {
      const weft = woven[i];
      return weft ? weft.words.map((w) => w.t).join(' ') : chunkText(verse, woven, i).trim();
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A chapter's verses as copy units: `verse` is what the Verse view shows, a verse or (n to to) a passage; the first verse to the chapter's last is the whole chapter.
 * `read` is the view the Reader is in, for Text 'As you read it'; without it the verses are shown in English. */
export function copyUnitOf(chapter: Chapter, verse: Pick<Verse, 'n' | 'to'>, read?: ReadView): CopyUnit {
  const last = chapter.verses[chapter.verses.length - 1]?.n ?? verse.n;
  const kind: CopyUnit['kind'] =
    verse.to === undefined ? 'verse' : verse.n === (chapter.verses[0]?.n ?? verse.n) && verse.to >= last ? 'chapter' : 'passage';
  const held = chapter.verses.filter((v) => v.n >= verse.n && v.n <= (verse.to ?? verse.n));
  return {
    kind,
    book: chapter.book,
    code: chapter.code,
    chapter: chapter.chapter,
    language: chapter.lang ?? 'grc',
    verses: held.map((v) => ({
      n: v.n,
      english: englishOf(v),
      original: originalOf(v),
      ...(read ? { shown: shownOf(v, read.view, read.woven?.[chapter.verses.indexOf(v)] ?? null) } : {}),
    })),
  };
}

/** 'Colossians 3:1', 'Colossians 3:1-4' or, for a whole chapter, 'Colossians 3'. */
export function copyReference(unit: CopyUnit): string {
  const first = unit.verses[0]?.n;
  const last = unit.verses[unit.verses.length - 1]?.n;
  if (unit.kind === 'chapter' || first === undefined || last === undefined) return `${unit.book} ${unit.chapter}`;
  return `${unit.book} ${unit.chapter}:${first === last ? first : `${first}-${last}`}`;
}

/** The https link of the unit, as Copy link gave it before this setting. */
export function copyLink(unit: CopyUnit): string {
  const first = unit.verses[0]?.n;
  const last = unit.verses[unit.verses.length - 1]?.n;
  if (first === undefined || last === undefined) return referenceUrl(unit.code, unit.chapter);
  // a passage and a whole chapter are a verse range, as the Verse view's Copy link gave them
  return unit.kind === 'verse' ? referenceUrl(unit.code, unit.chapter, first) : passageUrl(unit.code, unit.chapter, first, last);
}

/** The unit's verses as one paragraph, each led by its number when the unit has more than one verse and Verse numbers is on. */
function paragraph(unit: CopyUnit, field: 'english' | 'original' | 'shown', numbers: OnOffChoice): string {
  const numbered = numbers === 'on' && unit.verses.length > 1;
  return unit.verses
    .map((v) => {
      const text = field === 'shown' ? (v.shown ?? v.english) : v[field];
      return numbered ? `${v.n} ${text}` : text;
    })
    .join(' ')
    .trim();
}

/** The text to copy for `unit` in `format`: the text, its reference before or after, and the link on a last line of its own. */
export function copyText(unit: CopyUnit, format: CopyFormat): string {
  const hasOriginal = unit.verses.some((v) => v.original !== '');
  // a chapter with no words of its own asked for the original gives the English, once
  const body =
    format.text === 'asread'
      ? paragraph(unit, 'shown', format.numbers)
      : format.text === 'original' && hasOriginal
      ? paragraph(unit, 'original', format.numbers)
      : format.text === 'both' && hasOriginal
        ? `${paragraph(unit, 'english', format.numbers)}\n\n${paragraph(unit, 'original', format.numbers)}`
        : paragraph(unit, 'english', format.numbers);
  const reference = `${copyReference(unit)} (${TRANSLATION})`;
  const lines = [
    ...(format.reference === 'before' ? [reference] : []),
    body,
    ...(format.reference === 'after' ? [`— ${reference}`] : []),
    ...(format.link === 'on' ? [copyLink(unit)] : []),
  ];
  return lines.join('\n');
}
