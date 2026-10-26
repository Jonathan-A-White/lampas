// scripts/places/tipnr.ts — the parse of STEPBible's TIPNR (Translators Individualised Proper Names with all References, Tyndale House Cambridge and STEPBible.org, CC BY 4.0;
// the coordinates are OpenBible.info's) into the places of each book (docs/maps.md). Pure: the download and the writing are scripts/places-build.ts's.
// A record is a line of tab-separated fields under a `$========== PLACE` (or `PLACE+PERSON`) header, followed by sub-record lines that start with an en dash:
//   Gerar@Gen.10.19-2Ch=H1642 \t Gerar \t founder \t people \t Google Maps URL \t Palopenmaps URL \t region \t #summary \t Place
//   – Named \t Gerar@Gen.10.19-2Ch \t H1642«H1642=גְּרָר \t Gerar \t Gen.10.19; Gen.20.1; …
//   – Total \t all names ('A or B') \t fewest names \t all dStrongs ('H1, H2') \t all refs, abbreviated ('Gen.10.19; 20.1,2; 26.1,6') \t count
import { CANON } from '../../src/data/canon';
import type { Place } from '../../src/maps/types';

/** One verse of one book (the app's book code). */
export interface TipnrRef {
  book: string;
  chapter: number;
  verse: number;
}

/** A place of TIPNR with every verse it is in, in every book. */
export interface TipnrPlace extends Omit<Place, 'verses' | 'pos'> {
  refs: TipnrRef[];
}

const BOOK_CODES: ReadonlySet<string> = new Set(CANON.map((b) => b.code));

/** TIPNR's three-letter book names are the app's codes in capitals ('Gen', 'Ezk', '1Sa'). */
export function bookOfTipnr(abbreviation: string): string | undefined {
  const code = abbreviation.toLowerCase();
  return BOOK_CODES.has(code) ? code : undefined;
}

/** A name without TIPNR's marks: '(?)' a decision on an ambiguity, '(d)' a parent of a group, '(a)' an ancestor, '(f)' a founder. */
export function stripMarks(text: string): string {
  return text.replace(/\((?:\?|[adf])\)/g, '').replace(/\s+/g, ' ').trim();
}

const BOOK_PREFIX = /^(\d?[A-Za-z]{2,3})\.(?=\d)/;

/**
 * The verses a reference field names, with the book each belongs to: 'Gen.10.19; 20.1,2; 26.1,6; 2Ch.14.13,14', a range 'Gen.1.10-12', letters after a verse
 * ('Num.21.19a'), an 'ff' after one ('Isa.23.2ff', its first verse only). A segment without a book keeps the last one named; a number after a comma is a verse of the
 * chapter before it, unless it has a dot ('20.1,21.5': a chapter and verse). A range across chapters ('1.30-2.3') names its two ends. What cannot be read is passed to `warn`.
 */
export function expandRefs(field: string, warn: (token: string) => void = () => undefined): TipnrRef[] {
  const out: TipnrRef[] = [];
  let book: string | undefined;
  let chapter: number | undefined;
  const add = (verse: number): void => {
    if (book !== undefined && chapter !== undefined) out.push({ book, chapter, verse });
  };
  for (const segment of field.split(';')) {
    let rest = segment.trim();
    // the Greek Old Testament's own numbering ('LXX.Num.21.19') is not the text the app shows
    if (rest === '' || rest === '.' || rest.startsWith('LXX.')) {
      if (rest.startsWith('LXX.')) book = undefined;
      continue;
    }
    const prefix = BOOK_PREFIX.exec(rest);
    if (prefix) {
      const code = bookOfTipnr(prefix[1]);
      if (code === undefined) {
        warn(segment.trim());
        book = undefined;
        continue;
      }
      book = code;
      rest = rest.slice(prefix[0].length);
    }
    for (const raw of rest.split(',')) {
      let token = raw.trim().replace(/ff$/, '');
      if (token === '') continue;
      // 'Gen.12.10,Exo.1.19': a book named after a comma
      const named = BOOK_PREFIX.exec(token);
      if (named && bookOfTipnr(named[1]) !== undefined) {
        book = bookOfTipnr(named[1]);
        token = token.slice(named[0].length);
      }
      const cross = /^(\d+)\.(\d+)[a-z]*-(\d+)\.(\d+)[a-z]*$/.exec(token);
      const inChapter = /^(?:(\d+)\.)?(\d+)[a-z]*(?:-(\d+)[a-z]*)?$/.exec(token);
      if (cross) {
        chapter = Number(cross[1]);
        add(Number(cross[2]));
        chapter = Number(cross[3]);
        add(Number(cross[4]));
      } else if (inChapter) {
        if (inChapter[1] !== undefined) chapter = Number(inChapter[1]);
        const first = Number(inChapter[2]);
        const last = inChapter[3] === undefined ? first : Number(inChapter[3]);
        if (chapter === undefined || book === undefined || last < first) warn(token);
        else for (let verse = first; verse <= last; verse += 1) add(verse);
      } else {
        warn(token);
      }
    }
  }
  return out;
}

/** The coordinates of a Google Maps address ('…/maps/@31.39,34.56,14z'); neither where the record has none ('…/maps/@,14z' and '…/maps/@0,14z'). */
export function coordinatesOf(url: string): { lat: number; lng: number } | undefined {
  const m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),\d+z/.exec(url);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: round(lat), lng: round(lng) } : undefined;
}

const round = (n: number): number => Math.round(n * 1e5) / 1e5;

/** The forms of a name column ('Sidonian,Sidon =ESV,NIV,KJV; Zidonian,Zidon =KJV'), without the versions that use each. */
function formsOf(column: string): string[] {
  const out: string[] = [];
  for (const part of column.split(';')) {
    const forms = part.replace(/\s=[A-Za-z0-9,\s]*$/, '');
    for (const form of forms.split(',')) out.push(form);
  }
  return out;
}

/** A form worth keeping as a name: it starts with a capital or a digit (not 'stone', 'great/ Zidon' or '[ ]') and has no slash. */
function isName(form: string): boolean {
  return /^[\p{Lu}\d]/u.test(form) && !form.includes('/');
}

function nameOfUnique(unique: string): string {
  const at = unique.indexOf('@');
  const head = at < 0 ? unique : unique.slice(0, at);
  return stripMarks(head.slice(head.lastIndexOf('|') + 1)).replace(/_/g, ' ');
}

/** 'H6721H«H6721=צִידוֹן' → 'H6721H'. */
const dStrongOf = (field: string): string => field.split('«')[0].trim();

interface Block {
  head: string[];
  subs: string[][];
}

function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  let inPlaces = false;
  let current: Block | undefined;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith('$=')) {
      const section = line.replace(/^[$=\s]+/, '').replace(/[\t\s]+$/, '');
      inPlaces = section === 'PLACE' || section === 'PLACE+PERSON';
      current = undefined;
      continue;
    }
    if (!inPlaces) continue;
    if (line.startsWith('–')) {
      current?.subs.push(line.split('\t').map((f) => f.trim()));
    } else if (!line.startsWith('@') && !line.startsWith(' ') && !line.startsWith('\t') && line.includes('@')) {
      const head = line.split('\t').map((f) => f.trim());
      // the documentation's own header line ('UniqueName=uStrong …') has no '@' in its first field
      if (head[0].includes('@') && head[0].includes('=')) {
        current = { head, subs: [] };
        blocks.push(current);
      }
    }
  }
  return blocks;
}

/** Every PLACE and PLACE+PERSON record of the file, each with all of its verses in every book (PERSON and OTHER records are not places). */
export function parseTipnr(text: string, warn: (line: string) => void = () => undefined): TipnrPlace[] {
  const places: TipnrPlace[] = [];
  for (const { head, subs } of blocksOf(text)) {
    const unique = head[0];
    const equals = unique.lastIndexOf('=');
    const id = stripMarks(unique.slice(0, equals));
    const total = subs.find((s) => s[0] === '– Total');
    const named = subs.filter((s) => s[0] !== '– Total');
    const names: string[] = [];
    const push = (form: string): void => {
      const name = stripMarks(form);
      if (name !== '' && isName(name) && !names.includes(name)) names.push(name);
    };
    const name = nameOfUnique(unique.slice(0, equals));
    push(name);
    for (const form of (total?.[1] ?? '').split(' or ')) push(form);
    for (const sub of named) for (const form of formsOf(sub[3] ?? '')) push(form);
    const strongs: string[] = [];
    for (const strong of [...(total?.[3] ?? '').split(','), ...named.map((s) => dStrongOf(s[2] ?? '')), unique.slice(equals + 1)]) {
      const s = strong.trim();
      if (/^[HG]\d+[A-Za-z]?$/.test(s) && !strongs.includes(s)) strongs.push(s);
    }
    // the abbreviated list of the Total line, and every sub-record's own list (the abbreviation drops the verses an 'ff' stands for)
    const refs: TipnrRef[] = [];
    const seen = new Set<string>();
    const warnRef = (token: string): void => warn(`${id}: cannot read the reference ${JSON.stringify(token)}`);
    for (const field of [total?.[4], ...named.map((s) => s[4])]) {
      if (!field) continue;
      for (const ref of expandRefs(field, warnRef)) {
        const key = `${ref.book}.${ref.chapter}.${ref.verse}`;
        if (!seen.has(key)) {
          seen.add(key);
          refs.push(ref);
        }
      }
    }
    const where = coordinatesOf(head[4] ?? '');
    const region = stripMarks(head[6] ?? '');
    places.push({
      id,
      name,
      names,
      strongs,
      ...(where ? { lat: where.lat, lng: where.lng } : {}),
      ...(region === '' || region === '>' ? {} : { region }),
      refs,
    });
  }
  return places;
}

/** The places of one book: each place that has a verse in it, with its verses there in order (chapter, then verse). */
export function placesOfBook(places: readonly TipnrPlace[], book: string): Place[] {
  const out: Place[] = [];
  for (const place of places) {
    const verses = place.refs
      .filter((r) => r.book === book)
      .map((r): [number, number] => [r.chapter, r.verse])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (verses.length === 0) continue;
    out.push({ id: place.id, name: place.name, names: place.names, strongs: place.strongs, ...(place.lat === undefined ? {} : { lat: place.lat, lng: place.lng }), ...(place.region === undefined ? {} : { region: place.region }), verses });
  }
  return out;
}
