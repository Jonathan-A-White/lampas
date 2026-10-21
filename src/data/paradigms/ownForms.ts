// src/data/paradigms/ownForms.ts — a word's own paradigm (mw-irpgqi.4, docs/paradigms.md 'This word'): every form of its lemma that the New Testament text uses,
// laid in the cells of a table. The forms come from public/lemma-forms/<lemma>.json (scripts/build-lemma-forms.mjs, made from the chapter data at build): a form is only
// ever one the text has, never one made up, so a cell the text does not use is marked absent ('not in the NT') and keeps no form. Pure, but for the one fetch.
import { BOOK_INDEX } from '../bookIndex';
import { bestHit, cellName, cellsLanding, cellsOf, formFit, tableFor, type Hit } from './index';
import type { Paradigm, ParadigmCell, ParadigmRow } from './types';

/** One form of a lemma the text uses: its parsing code, how many times, and where it is first used. */
export interface OwnForm {
  form: string;
  code: string;
  count: number;
  book: string;
  chapter: number;
  verse: number;
}

/** A line of a lemma's file: [form, RP code, how many times, book, chapter, verse of the first use] (scripts/build-lemma-forms.mjs). */
export type LemmaFormEntry = [form: string, code: string, count: number, book: string, chapter: number, verse: number];

export const ownFormsOf = (entries: readonly LemmaFormEntry[]): OwnForm[] => entries.map(([form, code, count, book, chapter, verse]) => ({ form, code, count, book, chapter, verse }));

/** The text's form as the files hold it: a grave accent turned acute, a capital at the start lowered unless the lemma is a name (the same as the build's ownFormOf; tests/unit/own-forms.test.ts holds them equal). */
export function ownFormOf(text: string, lemma: string): string {
  const decomposed = text.normalize('NFD').replace(/̀/g, '́');
  const first = lemma.normalize('NFD')[0];
  const form = first === first.toLowerCase() ? decomposed[0].toLowerCase() + decomposed.slice(1) : decomposed;
  return form.normalize('NFC');
}

/** 'John 14:31'. */
export function referenceText(form: Pick<OwnForm, 'book' | 'chapter' | 'verse'>): string {
  const name = BOOK_INDEX.books.find((b) => b.code === form.book)?.name ?? form.book;
  return `${name} ${form.chapter}:${form.verse}`;
}

// The files are asked for with the chapters' fingerprints folded into one version, so the worker (CacheFirst, src/sw.ts) keeps a lemma until some chapter changes.
function formsVersion(): string {
  let hash = 5381;
  for (const book of BOOK_INDEX.books) for (const fingerprint of book.fingerprints) for (let i = 0; i < fingerprint.length; i++) hash = ((hash * 33) ^ fingerprint.charCodeAt(i)) >>> 0;
  return hash.toString(16);
}

/** The address of a lemma's file: /lemma-forms/<lemma>.json?v=<version>. */
export const lemmaFormsUrl = (lemma: string): string => `/lemma-forms/${encodeURIComponent(lemma)}.json?v=${formsVersion()}`;

const loaded = new Map<string, Promise<OwnForm[]>>();

/** Fetches a lemma's forms once (later and concurrent callers share the request); a lemma with no file has none. A failure is not kept. */
export function loadLemmaForms(lemma: string): Promise<OwnForm[]> {
  const known = loaded.get(lemma);
  if (known) return known;
  const request = fetch(lemmaFormsUrl(lemma)).then(async (response) => {
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Could not load the forms of ${lemma}: ${response.status}`);
    return ownFormsOf(((await response.json()) as { f: LemmaFormEntry[] }).f);
  });
  loaded.set(lemma, request);
  request.catch(() => {
    if (loaded.get(lemma) === request) loaded.delete(lemma);
  });
  return request;
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
export function ownTable(table: Paradigm, lemma: string, forms: readonly OwnForm[]): OwnTable | undefined {
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
      return { ...cell, form: form.form, own: { code: form.code, count: form.count, book: form.book, chapter: form.chapter, verse: form.verse, pattern: cell.form, others: here.filter((p) => p !== top).map((p) => p.form.form) } };
    });
    rows.push({ ...named, cells });
  });
  return { table: { ...table, rows }, placeOf: (form, code) => places.get(`${form}|${code}`) };
}

/** Every cell of an own table that holds a form of the text. */
export const ownCells = (table: Paradigm): ParadigmCell[] => cellsOf(table).filter((cell) => cell.own !== undefined);
