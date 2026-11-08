// src/copy/rangeText.ts — the text of a passage the tutor's copy or share link names (mw-5r3p30.1075), across chapters too: 'Heb.9.11-10.4' (the data's form) or 'Hebrews 9:11-10:4'
// is read as a range (parseCopyRange), each chapter it touches is loaded (loadChapter) and the verses are put as Copy puts them: in the view the Reader is in, with the variants he has on, in the
// format When you copy gives (src/copy/format.ts copyRange). Nothing here draws; src/TutorLinks.tsx holds the chip.
import { loadChapter, type Chapter } from '../data/chapter';
import { BOOK_INDEX } from '../data/bookIndex';
import { bookOf, otBookOf } from '../data/books';
import { getActiveSet, getVariantsLastOn } from '../data/repositories';
import { parseCanonReference } from '../nav/links';
import { readerVariants } from '../reader/variants';
import { settingsFor, readViewSettings } from '../reader/useViewSettings';
import { wovenOf } from '../reader/useWoven';
import { copyLinkSetting, copyNumbersSetting, copyReferenceSetting, variantsSetting, variantWitnessesSetting } from '../settings/definitions';
import { getSetting } from '../settings/store';
import { COPY_DEFAULTS, copyRange, copyUnitOf, type CopyFormat, type CopyUnit, type RangeCopy, type ReadView } from './format';

/** The passage a copy or share link names: from `verse` of `chapter` to `to` of `toChapter`. No `verse` is the whole of the chapter (and no `to` the whole of `toChapter`). `name` is the reference as Lampas writes it. */
export interface CopyRange {
  book: string;
  chapter: number;
  verse?: number;
  toChapter: number;
  to?: number;
  name: string;
}

/** The chapter that could not be read, named as the chip says it ('Hebrews 10'). */
export class UnreadableChapter extends Error {
  readonly chapter: string;
  constructor(chapter: string) {
    super(`Could not read ${chapter}`);
    this.chapter = chapter;
  }
}

const whole = (text: string): number | null => (/^\d+$/.test(text) ? Number(text) : null);

/** A passage as the tutor writes it: a verse ('Heb.9.11'), a range in a chapter ('Heb.9.11-14'), a range across chapters ('Heb.9.11-10.4', 'Hebrews 9:11-10:4'), a chapter ('Hebrews 9') or chapters ('Heb.9-10'), of a
 *  book of the Old or the New Testament; null for the Apocrypha (Lampas holds no text of it), a chapter the book lacks, a range that runs backwards, or anything else. */
export function parseCopyRange(reference: string): CopyRange | null {
  const parts = reference.trim().split(/\s*[-–—]\s*/);
  if (parts.length > 2) return null;
  const left = parseCanonReference(parts[0]);
  if (!left || left.testament === 'ap' || left.chapter === undefined) return null;
  const { book, chapter, verse } = left;
  let toChapter = chapter;
  let to: number | undefined = verse;
  if (parts.length === 2) {
    const right = parts[1].trim();
    const crossing = /^(\d+)\s*[.:]\s*(\d+)$/.exec(right);
    if (verse === undefined) {
      const n = whole(right);
      if (n === null) return null;
      toChapter = n;
      to = undefined;
    } else if (crossing) {
      toChapter = Number(crossing[1]);
      to = Number(crossing[2]);
    } else {
      const n = whole(right);
      if (n === null) return null;
      to = n;
    }
    if (toChapter < chapter || (toChapter === chapter && verse !== undefined && to !== undefined && to < verse)) return null;
  }
  if (verse !== undefined && (verse < 1 || (to !== undefined && to < 1))) return null;
  // both ends' chapters are in the book
  const chapters = left.testament === 'nt' ? BOOK_INDEX.books.find((b) => b.code === book)?.chapters : otBookOf(book)?.chapters;
  if (chapters === undefined || chapter < 1 || toChapter > chapters) return null;
  const bookName = bookOf(book)?.name ?? book;
  const label = verse === undefined ? (toChapter === chapter ? `${chapter}` : `${chapter}-${toChapter}`) : toChapter !== chapter ? `${chapter}:${verse}-${toChapter}:${to}` : to === verse ? `${chapter}:${verse}` : `${chapter}:${verse}-${to}`;
  return { book, chapter, ...(verse === undefined ? {} : { verse }), toChapter, ...(to === undefined ? {} : { to }), name: `${bookName} ${label}` };
}

/** How the chapters are loaded and which view a chapter is read in; both are the Reader's by default (`loadChapter`, `readOf` reading the saved settings once). */
export interface RangeHow {
  load?: (book: string, n: number) => Promise<Chapter>;
  read?: (chapter: Chapter) => ReadView | undefined;
}

/** The view the Reader reads a chapter in, with the variants it shows, for each chapter handed to the function: the saved settings, read once (the view and weave the dial of the chapter's language allows, Variants and Witnesses). */
export async function readerReadOf(): Promise<(chapter: Chapter) => ReadView> {
  const [saved, variants, witnesses, lastOn, set] = await Promise.all([readViewSettings(), getSetting(variantsSetting), getSetting(variantWitnessesSetting), getVariantsLastOn(), getActiveSet()]);
  return (chapter) => {
    const shown = settingsFor(saved, chapter);
    return { view: shown.view, woven: wovenOf(chapter, shown), variants: readerVariants(chapter, { variants, witnesses, lastOn, set }) };
  };
}

/** The format of Settings > Reading > When you copy, read once. */
export async function readCopyFormat(): Promise<CopyFormat> {
  const [reference, numbers, link] = await Promise.all([getSetting(copyReferenceSetting), getSetting(copyNumbersSetting), getSetting(copyLinkSetting)]);
  return { ...COPY_DEFAULTS, reference, numbers, link };
}

/** One unit for each chapter the range touches. A chapter that cannot be loaded, or holds no verse of the range, throws UnreadableChapter naming it. */
async function unitsOf(range: CopyRange, how: RangeHow): Promise<CopyUnit[]> {
  const load = how.load ?? loadChapter;
  const units: CopyUnit[] = [];
  for (let c = range.chapter; c <= range.toChapter; c++) {
    const named = `${bookOf(range.book)?.name ?? range.book} ${c}`;
    const chapter = await load(range.book, c).catch(() => null);
    if (!chapter) throw new UnreadableChapter(named);
    const last = chapter.verses[chapter.verses.length - 1]?.n;
    const from = c === range.chapter ? (range.verse ?? 1) : 1;
    const upto = c === range.toChapter ? (range.to ?? last) : last;
    if (last === undefined || upto === undefined || from > last) throw new UnreadableChapter(named);
    const unit = copyUnitOf(chapter, { n: from, to: upto === from ? undefined : upto }, how.read?.(chapter));
    if (unit.verses.length === 0) throw new UnreadableChapter(named);
    units.push(unit);
  }
  return units;
}

/** The text of `range` in `format`, its share data and its name; throws UnreadableChapter for a chapter it could not read. */
export async function rangeCopy(range: CopyRange, format: CopyFormat, how: RangeHow = {}): Promise<RangeCopy> {
  return copyRange(await unitsOf(range, how), format);
}
