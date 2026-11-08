// src/copy/format.ts — what Copy gives for a verse, a passage or a whole chapter (mw-9txn0x1.1, Settings > Reading > When you copy). Pure: copyText(unit, format)
// is the text the Verse view's Copy puts on the clipboard and Share hands the share sheet. The format is the three rows of the setting
// (src/settings/definitions/copyFormat.ts): Reference (after | before | off), Verse numbers (on | off), Link (on | off).
import type { Chapter, SourceLanguage, Verse } from '../data/chapter';
import type { ReaderView } from '../data/repositories';
import { besideOf, chunkText, drawnOrder, type WovenVerse } from '../data/weave';
import { passageUrl, referenceUrl } from '../nav/links';
import { isSeptuagint, lampasNumber } from '../reader/septuagint';
import { textWithVariants } from '../reader/variantText';
import type { ReaderVariants } from '../reader/variants';

export type CopyReference = 'after' | 'before' | 'off';
export type OnOffChoice = 'on' | 'off';

export interface CopyFormat {
  reference: CopyReference;
  numbers: OnOffChoice;
  link: OnOffChoice;
}

/** What Copy gives until he changes a row (the text is always as he reads it): the reference after it, the verse numbers of more than one verse, and the link. */
export const COPY_DEFAULTS: CopyFormat = { reference: 'after', numbers: 'on', link: 'on' };

/** The translation the reference names: the English of every chapter, the New Testament's and the Old's, is the MSB's (src/data/chapter.ts `translation`). */
const TRANSLATION = 'MSB';

/** What the reference names for a chapter of the Septuagint (mw-u2w5klk.18): the edition, as the Reader's header names it. The wording is PROVISIONAL (the Governor has not chosen it): Swete's Greek with Brenton's English, neither the MSB. */
export const SEPTUAGINT_EDITION = "Septuagint: Swete's Greek, Brenton's English";

export interface CopyVerse {
  n: number;
  english: string;
  /** the verse as the Reader shows it in the view on now (English, the original or the Weave); absent when the view is not known: the English */
  shown?: string;
}

/** The view a chapter is read in: the Reader's view and, in step with `chapter.verses`, its Weave of each verse (null when it is not woven); `variants` are the variant units the Reader
 * shows in it and the readings it lays in place (src/reader/variants.ts useReaderVariants), absent when it shows none: the brace after a shown unit's words is copied with them (mw-5r3p30.866). */
export interface ReadView {
  view: ReaderView;
  woven: readonly (WovenVerse | null)[] | null;
  variants?: Pick<ReaderVariants, 'byVerse' | 'chosenByVerse'> | null;
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
  /** Swete's Septuagint (src/reader/septuagint.ts): `chapter` and the verse numbers are then Lampas's, and `greek` is the Septuagint's own address of the unit ('Greek 22:1'), '' where it is the same */
  septuagint?: { greek: string };
}

const englishOf = (verse: Verse): string => verse.e.map((chunk) => chunk.t.trim()).join(' ').replace(/\s+/g, ' ').trim();
const originalOf = (verse: Verse): string => verse.g.map((word) => word.t).join(' ').trim();

/** The verse as the Reader draws it in `view`: the original's words; the English chunks in the order the weave lays them out, a woven chunk as the words of its own language
 * (what the Reader shows over a learning word's English hint is the Greek alone); else the English. With variants shown in it, each unit's brace follows its words and a reading laid in place stands
 * where the Reader lays it (src/reader/variantText.ts). */
function shownOf(verse: Verse, view: ReaderView, woven: WovenVerse | null, variants?: ReadView['variants']): string {
  const drawn = variants ? textWithVariants(verse, view, woven, variants.byVerse?.get(verse.n), variants.chosenByVerse.get(verse.n)) : null;
  if (drawn !== null) return drawn;
  if (view === 'greek') return originalOf(verse) || englishOf(verse);
  if (!woven) return englishOf(verse);
  return drawnOrder(verse, woven)
    .map((i) => {
      const weft = woven[i];
      return weft ? weft.words.map((w) => w.t).join(' ') : [...besideOf(woven, i).map((w) => w.t), chunkText(verse, woven, i).trim()].join(' ');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The Lampas chapter a Septuagint chapter is opened as: that of its first verse with a Lampas verse (a chapter keeps only the verses of its own Lampas chapter, loadSeptuagintChapter), else its own number. */
function lampasChapterOf(chapter: Chapter): number {
  const ref = chapter.verses.map((v) => v.ref).find((r) => r !== undefined && r !== 'none');
  return ref ? ref.chapter : chapter.chapter;
}

/** The Septuagint's own address of `held` verses of a chapter opened as Lampas's chapter `lampas`: 'Greek 22:1', 'Greek 22:2-3', 'Greek 114:1-115:2' or, for a whole chapter, 'Greek 22' ('Greek 114 and 115'); '' where it is Lampas's own. */
function greekAddress(chapter: Chapter, held: readonly Verse[], lampas: number, whole: boolean): string {
  const at = (v: Verse): { chapter: number; verse: number } => v.greek ?? { chapter: chapter.chapter, verse: v.n };
  if (held.every((v) => at(v).chapter === lampas && at(v).verse === lampasNumber(chapter, v))) return '';
  const chapters = [...new Set(held.map((v) => at(v).chapter))];
  if (whole || held.length === 0) return `Greek ${chapters.join(' and ')}`;
  const first = at(held[0]);
  const last = at(held[held.length - 1]);
  if (first.chapter === last.chapter) return `Greek ${first.chapter}:${first.verse}${first.verse === last.verse ? '' : `-${last.verse}`}`;
  return `Greek ${first.chapter}:${first.verse}-${last.chapter}:${last.verse}`;
}

/** A chapter's verses as copy units: `verse` is what the Verse view shows, a verse or (n to to) a passage; the first verse to the chapter's last is the whole chapter.
 * `read` is the view the Reader is in, for Text 'As you read it'; without it the verses are shown in English. */
export function copyUnitOf(chapter: Chapter, verse: Pick<Verse, 'n' | 'to'>, read?: ReadView): CopyUnit {
  const last = chapter.verses[chapter.verses.length - 1]?.n ?? verse.n;
  const kind: CopyUnit['kind'] =
    verse.to === undefined ? 'verse' : verse.n === (chapter.verses[0]?.n ?? verse.n) && verse.to >= last ? 'chapter' : 'passage';
  const held = chapter.verses.filter((v) => v.n >= verse.n && v.n <= (verse.to ?? verse.n));
  // a chapter of the Septuagint is named and numbered as Lampas's (Greek Ps 22:1 is Psalm 23:1), the edition and the Greek address in the reference line (mw-u2w5klk.18)
  const septuagint = isSeptuagint(chapter);
  const lampas = septuagint ? lampasChapterOf(chapter) : chapter.chapter;
  return {
    kind,
    book: chapter.book,
    code: chapter.code,
    chapter: lampas,
    language: chapter.lang ?? 'grc',
    ...(septuagint ? { septuagint: { greek: greekAddress(chapter, held, lampas, kind === 'chapter') } } : {}),
    verses: held.map((v) => ({
      n: lampasNumber(chapter, v),
      english: englishOf(v),
      ...(read ? { shown: shownOf(v, read.view, read.woven?.[chapter.verses.indexOf(v)] ?? null, read.variants) } : {}),
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

/** The unit's verses as one paragraph of the words as he reads them (the English when the view is not known), each led by its number when the unit has more than one verse and Verse numbers is on. */
function paragraph(unit: CopyUnit, numbers: OnOffChoice): string {
  const numbered = numbers === 'on' && unit.verses.length > 1;
  return unit.verses
    .map((v) => {
      const text = v.shown ?? v.english;
      return numbered ? `${v.n} ${text}` : text;
    })
    .join(' ')
    .trim();
}

/** The reference as Copy writes it: 'Colossians 3:1 (MSB)'; of the Septuagint 'Psalms 23:1 (Septuagint: Swete's Greek, Brenton's English; Greek 22:1)'. */
export const copyReferenceLine = (unit: CopyUnit): string =>
  `${copyReference(unit)} (${unit.septuagint ? `${SEPTUAGINT_EDITION}${unit.septuagint.greek ? `; ${unit.septuagint.greek}` : ''}` : TRANSLATION})`;

/** The text to copy for `unit` in `format`: the words as he reads them, their reference before or after, and the link on a last line of its own. */
export function copyText(unit: CopyUnit, format: CopyFormat): string {
  const reference = copyReferenceLine(unit);
  const lines = [
    ...(format.reference === 'before' ? [reference] : []),
    paragraph(unit, format.numbers),
    ...(format.reference === 'after' ? [`— ${reference}`] : []),
    ...(format.link === 'on' ? [copyLink(unit)] : []),
  ];
  return lines.join('\n');
}

/** What the Share sheet's row shows of a long piece: its first words, a gap and its last words, so a passage's row is short and still ends at its reference. A row has room for
 * a whole verse (the longest in the Bible is about 400 characters, nearly all under 300, and the whole's row adds its reference), so only a longer piece is cut (mw-5r3p30.1059). */
const SHOWN_HEAD = 72;
const SHOWN_TAIL = 36;
const SHOWN_WHOLE = 340;
export function cutShort(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= SHOWN_WHOLE) return flat;
  // the cuts fall between words
  const head = flat.slice(0, SHOWN_HEAD).replace(/\s+\S*$/, '');
  const tail = flat.slice(-SHOWN_TAIL).replace(/^\S*\s+/, '');
  return `${head} … ${tail}`;
}

export type SharePieceId = 'whole' | 'link' | 'text' | 'reference';

/** What the phone's share is handed: the parts of the Web Share data a piece fills. */
export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

/** One row of the Verse view's Share sheet (mw-5r3p30.1026): `shown` is what the row says it will send (cut short when long), `data` is what is sent, whole, and `hand` is the same
 * piece as one text, for a phone that has no share or refuses it (shown to copy by hand). */
export interface SharePiece {
  id: SharePieceId;
  label: string;
  shown: string;
  data: ShareData;
  hand: string;
}

/** The four pieces of `unit` in `format`: the whole as Share has always sent it (the words and the reference by Reference and Verse numbers, the link as the share's url while Link is On);
 * just the link (whatever Link says, he asks for it by name); just the text (the words as he reads them, numbered by Verse numbers, no reference, no link); just the reference. */
export function sharePieces(unit: CopyUnit, format: CopyFormat): SharePiece[] {
  const link = copyLink(unit);
  const words = copyText(unit, { ...format, link: 'off' });
  const plain = paragraph(unit, format.numbers);
  const reference = copyReferenceLine(unit);
  const linked = format.link === 'on';
  return [
    {
      id: 'whole',
      label: 'The whole',
      shown: linked ? `${cutShort(words)}\n${link}` : cutShort(words),
      data: { title: unit.septuagint ? reference : copyReference(unit), text: words, ...(linked ? { url: link } : {}) },
      hand: copyText(unit, format),
    },
    { id: 'link', label: 'Just the link', shown: link, data: { url: link }, hand: link },
    { id: 'text', label: 'Just the text', shown: cutShort(plain), data: { text: plain }, hand: plain },
    { id: 'reference', label: 'Just the reference', shown: reference, data: { text: reference }, hand: reference },
  ];
}
