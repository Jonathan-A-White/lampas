// src/data/frequency.ts — how often each word occurs in the New Testament, from /data/frequency.json (docs/data.md):
// the frontier picks the commonest words he does not know yet, and a name is not one to learn from a list. The Old Testament's Hebrew
// words are counted in /data/frequency-hbo.json, loaded beside it by language (mw-5vvlay.2).
import type { SourceLanguage } from './chapter';

export interface FrequencyEntry {
  /** Strong's number, no padding: 'G2532', 'H853' */
  strongs: string;
  /** the lemma (NFC): 'καί' */
  lemma: string;
  /** how many times the word is used in the 27 books */
  count: number;
  /** in how many of the 260 chapters */
  chapters: number;
  /** a name (a person, place or people): the RP code says indeclinable proper noun, or a noun whose lemma is capitalised */
  proper: boolean;
}

interface Table {
  entries: FrequencyEntry[];
  /** strongs -> index in entries, so the rank is index + 1 */
  rank: Map<string, number>;
}

const FILES: Record<SourceLanguage, string> = { grc: '/data/frequency.json', hbo: '/data/frequency-hbo.json' };
const tables: Partial<Record<SourceLanguage, Promise<Table>>> = {};

/** Fetches /data/frequency.json (or, for 'hbo', /data/frequency-hbo.json) once, commonest word first; later and concurrent callers share the one request. A failure is not kept. */
export function loadFrequency(language: SourceLanguage = 'grc'): Promise<FrequencyEntry[]> {
  return load(language).then((t) => t.entries);
}

function load(language: SourceLanguage): Promise<Table> {
  const held = tables[language];
  if (held) return held;
  const request = fetch(FILES[language]).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the word frequencies: ${response.status}`);
    const entries = (await response.json()) as FrequencyEntry[];
    return { entries, rank: new Map(entries.map((e, i) => [e.strongs, i])) };
  });
  tables[language] = request;
  request.catch(() => {
    if (tables[language] === request) delete tables[language];
  });
  return request;
}

/** 1 for the commonest word, 2 for the next ...; undefined when the text never uses the number. Rejects when the table cannot be loaded. */
export async function rankOf(strongs: string, language: SourceLanguage = 'grc'): Promise<number | undefined> {
  const i = (await load(language)).rank.get(strongs);
  return i === undefined ? undefined : i + 1;
}

/** True for a name; false for any other word and for a number the text never uses. Rejects when the table cannot be loaded. */
export async function isProperNoun(strongs: string, language: SourceLanguage = 'grc'): Promise<boolean> {
  const t = await load(language);
  const i = t.rank.get(strongs);
  return i !== undefined && t.entries[i].proper;
}

/** Drops the table held in memory (tests). */
export function forgetFrequency(): void {
  delete tables.grc;
  delete tables.hbo;
}
