// Types for scripts/build-lemma-forms.mjs, which the tests import.
import type { Chapter } from '../src/data/chapter';

/** [form, RP code, how many times the text uses it, book code, chapter, verse of the first use] */
export type LemmaFormEntry = [form: string, code: string, count: number, book: string, chapter: number, verse: number];

export function ownFormOf(text: string, lemma: string): string;
export function lemmaForms(chapters: Iterable<Pick<Chapter, 'code' | 'chapter' | 'verses'> & { lang?: Chapter['lang'] }>): Map<string, LemmaFormEntry[]>;
export function lemmaFileName(lemma: string): string;
export function fileText(lemma: string, entries: LemmaFormEntry[], septuagint?: LemmaFormEntry[]): string;
export function bareOf(text: string): string;
export function septuagintFormOf(text: string, lemma: string, accented?: readonly string[]): string | undefined;
export function septuagintForms(chapters: Iterable<Pick<Chapter, 'code' | 'chapter' | 'verses'>>, nt?: Map<string, LemmaFormEntry[]>): Map<string, LemmaFormEntry[]>;
/** A word printed in capitals: its token, lemma, parsing, the form it is matched to (undefined: left out) and its place ('gen 1:1'). */
export interface SeptuagintCapital {
  token: string;
  lemma: string;
  code: string;
  form: string | undefined;
  place: string;
}
export function septuagintCapitals(chapters: Iterable<Pick<Chapter, 'code' | 'chapter' | 'verses'>>, nt?: Map<string, LemmaFormEntry[]>): SeptuagintCapital[];
export function readSeptuagintChapters(lxxDir: string): Chapter[];
export function readChapters(dataDir: string): Chapter[];
export function writeLemmaForms(dataDir: string, outDir: string, lxxDir?: string): { lemmas: number; bytes: number; largest: { lemma: string; bytes: number }; capitals: number; unmatched: SeptuagintCapital[] };
