// scripts/data/rp2026English.ts — the English of the RP 2026 wording changes (docs/data.md 'The RP 2026 English', mw-9ji6ek0.32). The MSB's English is of the
// Robinson-Pierpont 2005 Greek; for each change of data/rp2026-overlay.json that differs from that Greek, data/rp2026-english.json says whether the English
// changes and, where it does, gives Lampas's own English for the affected words, made by the tutor's model, with where the Greek and the English come from.
// The build reads the file and stops on an overlay change with no entry, so a later release cannot add a change that nobody has decided.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { OverlayEntry } from './rp2026';

/** where the decisions and Lampas's English are committed */
export const RP2026_ENGLISH_FILE = 'data/rp2026-english.json';

/** The kind of English Lampas's own is, in the words the provenance carries. */
export const RENDERING_KIND = 'Lampas rendering, AI-made at build time';

export interface Rp2026Provenance {
  /** the Greek: its source and its licence */
  greek: { source: string; licence: string };
  /** the MSB's English of the span */
  msb: string;
  /** who decided whether the English changes, and when */
  decision: { model: string; date: string };
  /** Lampas's English, only where there is some */
  rendering?: { kind: string; model: string; date: string };
}

/** One entry of data/rp2026-english.json: the overlay change (its `from` and `to`, so that a changed overlay makes a stale entry rather than a wrong one) and what became of its English. */
export interface Rp2026English {
  ref: string;
  from: string[];
  to: string[];
  /** whether the English of the span is other than the MSB's, which translated the 2005 Greek */
  changesEnglish: boolean;
  /** the MSB's English for the affected span */
  msb: string;
  /** Lampas's English for it: set exactly when `changesEnglish` */
  lampas: string | null;
  /** why, in a sentence */
  note: string;
  provenance: Rp2026Provenance;
}
export type Rp2026EnglishFile = Record<string, Rp2026English>;

export function readRp2026English(path: string = RP2026_ENGLISH_FILE): Rp2026EnglishFile {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Rp2026EnglishFile) : {};
}

const refOf = (e: OverlayEntry): string => `${e.book} ${e.chapter}:${e.verse}`;

/** A short stable name for an overlay change: its place and a hash of its words. */
export function entryKey(e: OverlayEntry): string {
  const hash = createHash('sha256').update(`${e.from.join(' ')}\n${e.to.join(' ')}`).digest('hex').slice(0, 8);
  return `${refOf(e)} ${hash}`;
}

/** Stops, naming each fault, unless the file has one well-formed entry for each change of the overlay and none besides. */
export function checkRp2026English(entries: OverlayEntry[], file: Rp2026EnglishFile): void {
  const problems: string[] = [];
  const keys = new Set(entries.map(entryKey));
  for (const e of entries) if (!file[entryKey(e)]) problems.push(`${refOf(e)} (${e.from.join(' ')} → ${e.to.join(' ')}) has no entry in ${RP2026_ENGLISH_FILE}`);
  for (const [key, x] of Object.entries(file)) {
    if (!keys.has(key)) {
      problems.push(`${x.ref} (${key}) is not in the overlay: remove or redo its entry in ${RP2026_ENGLISH_FILE}`);
      continue;
    }
    if (x.changesEnglish) {
      if (!x.lampas?.trim()) problems.push(`${x.ref} changes the English and has no lampas English`);
      if (!x.msb.trim()) problems.push(`${x.ref} changes the English and has no msb English`);
      if (x.provenance.rendering?.kind !== RENDERING_KIND || !x.provenance.rendering.model || !x.provenance.rendering.date) {
        problems.push(`${x.ref} has lampas English and no rendering provenance (kind "${RENDERING_KIND}", model, date)`);
      }
    } else {
      if (x.lampas !== null) problems.push(`${x.ref} does not change the English and has lampas English`);
      if (x.provenance.rendering) problems.push(`${x.ref} does not change the English and has rendering provenance`);
    }
    if (!x.note.trim()) problems.push(`${x.ref} has no note`);
    const { greek, decision } = x.provenance;
    if (!greek?.source || !greek.licence || !x.provenance.msb || !decision?.model || !decision.date) problems.push(`${x.ref} lacks provenance (Greek source and licence, msb, decision model and date)`);
  }
  if (problems.length) throw new Error(`RP 2026 English (${RP2026_ENGLISH_FILE}):\n  ${problems.join('\n  ')}`);
}

const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The build's lines: how many changes, how many alter the English, and which, with the MSB's English and Lampas's. */
export function rp2026EnglishReport(entries: OverlayEntry[], file: Rp2026EnglishFile): string[] {
  const altering = entries.map((e) => file[entryKey(e)]).filter((x): x is Rp2026English => !!x && x.changesEnglish);
  return [
    `RP 2026 English: ${count(entries.length, 'change', 'changes')}, ${altering.length} ${altering.length === 1 ? 'alters' : 'alter'} the English, ${entries.length - altering.length} do not`,
    ...altering.map((x) => `  alters: ${x.ref} ("${x.msb}" → "${x.lampas}")`),
  ];
}
