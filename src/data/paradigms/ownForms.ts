// src/data/paradigms/ownForms.ts — a word's own paradigm (mw-irpgqi.4, docs/paradigms.md 'This word'): every form of its lemma that the New Testament text uses,
// laid in the cells of a table. The forms come from public/lemma-forms/<lemma>.json (scripts/build-lemma-forms.mjs, made from the chapter data at build): a form is only
// ever one the text has, never one made up, so a cell the text does not use is marked absent ('not in the NT') and keeps no form. Pure, but for the one fetch.
// Read from a Septuagint word (mw-u2w5klk.289) the file's Septuagint forms are laid too, with the New Testament's, each cell saying which text it was found in.
import { BOOK_INDEX, CANON_INDEX } from '../bookIndex';
import { loadLxxIndex } from '../lxxChapter';
import { bestHit, cellName, cellsLanding, cellsOf, formFit, tableFor, type Hit } from './index';
import type { OwnText, OwnUse, Paradigm, ParadigmCell, ParadigmRow } from './types';

/**
 * One form of a lemma the text uses: its parsing code, how many times, and where it is first used. `source` is the text that use is in. Read in the Septuagint (mw-u2w5klk.289) a form
 * the Septuagint has is its Septuagint use, and `also` is the New Testament's when the New Testament has it too; a form only the New Testament has is its New Testament use.
 */
export interface OwnForm extends OwnUse {
  form: string;
  code: string;
  also?: OwnUse;
}

/** A line of a lemma's file: [form, RP code, how many times, book, chapter, verse of the first use] (scripts/build-lemma-forms.mjs). */
export type LemmaFormEntry = [form: string, code: string, count: number, book: string, chapter: number, verse: number];

const useOf = (source: OwnText, [, , count, book, chapter, verse]: LemmaFormEntry): OwnUse => ({ source, count, book, chapter, verse });

/**
 * A lemma's forms as the reading has them. The New Testament's reading is the New Testament's forms alone, as it was. The Septuagint's reading (`lxx` is the file's Septuagint list) is
 * the Septuagint's forms first, each with the New Testament's use beside it when the New Testament has the same form with the same code, then the New Testament's others.
 */
export function ownFormsOf(entries: readonly LemmaFormEntry[], reading: OwnText = 'nt', lxx: readonly LemmaFormEntry[] = []): OwnForm[] {
  const nt = entries.map((entry) => ({ form: entry[0], code: entry[1], ...useOf('nt', entry) }));
  if (reading === 'nt') return nt;
  const key = (form: string, code: string): string => `${form}\u0000${code}`;
  const inNt = new Map(nt.map((f) => [key(f.form, f.code), f]));
  const inLxx = new Set(lxx.map(([form, code]) => key(form, code)));
  const septuagint = lxx.map((entry): OwnForm => {
    const also = inNt.get(key(entry[0], entry[1]));
    return { form: entry[0], code: entry[1], ...useOf('septuagint', entry), ...(also ? { also: useOf('nt', [also.form, also.code, also.count, also.book, also.chapter, also.verse]) } : {}) };
  });
  return [...septuagint, ...nt.filter((f) => !inLxx.has(key(f.form, f.code)))];
}

/** What a cell with no form says: the text read is the one it is absent from, and in the Septuagint's reading the New Testament's forms are laid too. */
export const absentText = (reading: OwnText): string => (reading === 'septuagint' ? 'not in the Septuagint or NT' : 'not in the NT');

/** The name of a text, as 'in the Septuagint' / 'in the NT' says where a form was found. */
export const foundIn = (source: OwnText): string => (source === 'septuagint' ? 'in the Septuagint' : 'in the NT');

/** The text's form as the files hold it: a grave accent turned acute, a capital at the start lowered unless the lemma is a name (the same as the build's ownFormOf; tests/unit/own-forms.test.ts holds them equal). */
export function ownFormOf(text: string, lemma: string): string {
  const decomposed = text.normalize('NFD').replace(/̀/g, '́');
  const first = lemma.normalize('NFD')[0];
  const form = first === first.toLowerCase() ? decomposed[0].toLowerCase() + decomposed.slice(1) : decomposed;
  return form.normalize('NFC');
}

/** Swete's marks on a printed token: punctuation, brackets and the editor's signs (the same as the build's SWETE_MARKS; tests/unit/own-forms.test.ts holds them equal). */
const SWETE_MARKS = /[.,;:!?()[\]{}"\u00B7\u0387\u037E\u201C\u201D\u00AB\u00BB\u2014\u2013\-\u2E00-\u2E7F\u00B6\u00A7*+\u2020\u2021]/g;

/** The form a Septuagint token is indexed under: Swete's marks off, then ownFormOf; undefined for a word printed wholly in capitals, which the index leaves out (the build's septuagintFormOf). */
export function septuagintFormOf(text: string, lemma: string): string | undefined {
  const bare = text.replace(SWETE_MARKS, '');
  if (bare.length > 1 && bare === bare.toUpperCase() && bare !== bare.toLowerCase()) return undefined;
  return bare === '' ? undefined : ownFormOf(bare, lemma);
}

/** 'John 14:31', 'Genesis 1:2': the canon's names, the Old Testament's too, since a Septuagint use is in it. */
export function referenceText(form: Pick<OwnForm, 'book' | 'chapter' | 'verse'>): string {
  const name = CANON_INDEX.books.find((b) => b.code === form.book)?.name ?? form.book;
  return `${name} ${form.chapter}:${form.verse}`;
}

// The files are asked for with the chapters' fingerprints folded into one version, so the worker (CacheFirst, src/sw.ts) keeps a lemma until some chapter changes. The Septuagint's
// reading folds in the fingerprints of the shipped Septuagint chapters too (`septuagint`: the index's, one string), since its forms ride in the file; the New Testament's does not,
// so it never waits on that index and a Septuagint chapter shipped leaves its cached file alone.
function formsVersion(septuagint = ''): string {
  let hash = 5381;
  for (const book of BOOK_INDEX.books) for (const fingerprint of book.fingerprints) for (let i = 0; i < fingerprint.length; i++) hash = ((hash * 33) ^ fingerprint.charCodeAt(i)) >>> 0;
  for (let i = 0; i < septuagint.length; i++) hash = ((hash * 33) ^ septuagint.charCodeAt(i)) >>> 0;
  return hash.toString(16);
}

/** The address of a lemma's file: /lemma-forms/<lemma>.json?v=<version>. */
export const lemmaFormsUrl = (lemma: string, septuagint = ''): string => `/lemma-forms/${encodeURIComponent(lemma)}.json?v=${formsVersion(septuagint)}`;

/** The fingerprints of the shipped Septuagint chapters in one string; '' when the index cannot be had (the file is then asked for as the New Testament's reading asks). */
const septuagintVersion = (): Promise<string> => loadLxxIndex().then((index) => index.books.flatMap((book) => book.fingerprints).join(''), () => '');

/** A lemma's file: the New Testament's (or Hebrew) forms, and the Septuagint's when it has any. */
interface LemmaFile {
  f: LemmaFormEntry[];
  lxx?: LemmaFormEntry[];
}

const loaded = new Map<string, Promise<LemmaFile>>();

/**
 * Fetches a lemma's forms once for a reading (later and concurrent callers share the request); a lemma with no file has none. A failure is not kept. The New Testament's reading
 * is the file's `f` alone; the Septuagint's is its `lxx` with the New Testament's beside (ownFormsOf).
 */
export async function loadLemmaForms(lemma: string, reading: OwnText = 'nt'): Promise<OwnForm[]> {
  const key = `${reading}|${lemma}`;
  let request = loaded.get(key);
  if (!request) {
    const fetched: Promise<LemmaFile> = (reading === 'septuagint' ? septuagintVersion() : Promise.resolve('')).then(async (version) => {
      const response = await fetch(lemmaFormsUrl(lemma, version));
      if (response.status === 404) return { f: [] };
      if (!response.ok) throw new Error(`Could not load the forms of ${lemma}: ${response.status}`);
      return (await response.json()) as LemmaFile;
    });
    request = fetched;
    loaded.set(key, fetched);
    fetched.catch(() => {
      if (loaded.get(key) === fetched) loaded.delete(key);
    });
  }
  const file = await request;
  return ownFormsOf(file.f, reading, file.lxx ?? []);
}

/** Drops the forms held in memory (tests). */
export const forgetLemmaForms = (): void => loaded.clear();

/** Whether none of a lemma's forms has a table (tableFor gives none for any): a conjunction, an adverb, a preposition, a particle. */
export const fitsNoTable = (lemma: string, forms: readonly OwnForm[]): boolean => forms.every((f) => tableFor(f.code, { l: lemma, t: f.form }) === undefined);

// The tables whose row groups are model words (ἀγαπάω, ποιέω, πληρόω; λόγος, τέκνον…): a word's own view keeps the one group it is like. In every other table the row groups
// are sections of the one word (a tense, a voice), and all of them stay.
const MODEL_TABLES = new Set([
  'noun-endings',
  'third-declension',
  'adjective-endings',
  'pronouns-personal',
  'pronouns-demonstrative-relative',
  'pronouns-interrogative-indefinite',
  'contract-verbs',
  'mi-verbs',
]);

/** A table laid with a word's own forms: `table` is the pattern's table with the word's forms in its cells (see `ParadigmCell.own` and `absent`), `placeOf` the cell a form of the text is in. */
export interface OwnTable {
  table: Paradigm;
  /** the name of the cell (cellName of the derived table) holding the form `form` with the code `code`, if one does */
  placeOf: (form: string, code: string) => string | undefined;
}

interface Placed {
  form: OwnForm;
  hit: Hit;
}

/** The spellings a cell's form stands for, accents kept: 'ἐστί(ν)' is ἐστί and ἐστίν. */
const spellings = (form: string): string[] => [form.replace(/\([^)]*\)/g, ''), form.replace(/[()]/g, '')];

const rowGroup = (table: Paradigm, hit: Hit): string => table.rows[hit.row].group ?? '';

/** The best cell of the group for a form: of the cells its parsing lands on in the group's rows, the one naming most of its ideas. */
const bestIn = (hits: readonly Hit[], table: Paradigm, group: string | undefined): Hit | undefined => bestHit(group === undefined ? hits : hits.filter((hit) => rowGroup(table, hit) === group));

/** Of a table of models, the group the word is like: the one its forms end most like (a whole match counts most), the earlier on a tie. */
function modelOf(table: Paradigm, forms: readonly OwnForm[], hits: ReadonlyMap<OwnForm, Hit[]>): string | undefined {
  let best: { group: string; score: number } | undefined;
  for (const group of new Set(table.rows.map((row) => row.group ?? ''))) {
    let score = 0;
    for (const form of forms) {
      const hit = bestIn(hits.get(form) ?? [], table, group);
      if (hit) score += 1 + formFit(form.form, table.rows[hit.row].cells[hit.column].form);
    }
    if (score > 0 && (!best || score > best.score)) best = { group, score };
  }
  return best?.group;
}

/**
 * The table laid with the word's own forms (mw-irpgqi.4), or undefined when the text has none of them for any cell of it (the word is not in this table). Each form is put in
 * the cell its parsing lands on (paradigmOfWord's rule: a cell names nothing the form is not); in a table of models, only the group of rows the word is like stays, named for
 * the word. Several forms of one cell (ἐστίν, ἐστιν) show the one that is the pattern's own spelling, else the one the text uses most; the rest are `own.others`. A Greek
 * cell the text has no form for is `absent` with no form; the English cells (εἰμί's meanings) stay as the pattern has them.
 */
export function ownTable(table: Paradigm, lemma: string, forms: readonly OwnForm[], reading: OwnText = 'nt'): OwnTable | undefined {
  const hits = new Map<OwnForm, Hit[]>(forms.map((form) => [form, cellsLanding(table, { t: form.form, l: lemma, p: form.code })]));
  const group = MODEL_TABLES.has(table.id) ? modelOf(table, forms, hits) : undefined;
  if (MODEL_TABLES.has(table.id) && group === undefined) return undefined;
  const placed: Placed[] = [];
  for (const form of forms) {
    const hit = bestIn(hits.get(form) ?? [], table, group);
    if (hit) placed.push({ form, hit });
  }
  if (placed.length === 0) return undefined;
  const at = (row: number, column: number): Placed[] => placed.filter((p) => p.hit.row === row && p.hit.column === column);
  // the place of each form of the text in the derived table, named as cellName names a cell (the rows of a model are the word's own)
  const places = new Map<string, string>();
  const rows: ParadigmRow[] = [];
  table.rows.forEach((row, r) => {
    if (group !== undefined && (row.group ?? '') !== group) return;
    const named: ParadigmRow = group !== undefined ? { ...row, group: lemma } : row;
    const cells: ParadigmCell[] = row.cells.map((cell, c) => {
      if (cell.lang !== 'el') return cell;
      const here = at(r, c);
      const place = cellName({ ...table, rows: [named] }, named, c);
      for (const p of here) places.set(`${p.form.form}|${p.form.code}`, place);
      if (here.length === 0) return { ...cell, form: '', absent: true as const };
      // the pattern's own spelling first (accents as they are, so ἐστίν before ἐστιν), then the nearest, then the one the text uses most
      const exact = (p: Placed): number => (spellings(cell.form).includes(p.form.form) ? 1 : 0);
      const top = [...here].sort((a, b) => exact(b) - exact(a) || formFit(b.form.form, cell.form) - formFit(a.form.form, cell.form) || b.form.count - a.form.count)[0];
      const { form } = top;
      const { source, count, book, chapter, verse, also } = form;
      return { ...cell, form: form.form, own: { code: form.code, source, count, book, chapter, verse, ...(also ? { also } : {}), pattern: cell.form, others: here.filter((p) => p !== top).map((p) => p.form.form) } };
    });
    rows.push({ ...named, cells });
  });
  return { table: { ...table, rows, ownText: reading }, placeOf: (form, code) => places.get(`${form}|${code}`) };
}

/** Every cell of an own table that holds a form of the text. */
export const ownCells = (table: Paradigm): ParadigmCell[] => cellsOf(table).filter((cell) => cell.own !== undefined);
