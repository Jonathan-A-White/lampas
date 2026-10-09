// src/data/frequency.ts — how often each word occurs in the New Testament, from /data/frequency.json (docs/data.md):
// the frontier picks the commonest words he does not know yet, and a name is not one to learn from a list.

export interface FrequencyEntry {
  /** Strong's number, no padding: 'G2532' */
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

let table: Promise<Table> | undefined;

/** Fetches /data/frequency.json once, commonest word first; later and concurrent callers share the one request. A failure is not kept. */
export function loadFrequency(): Promise<FrequencyEntry[]> {
  return load().then((t) => t.entries);
}

function load(): Promise<Table> {
  if (table) return table;
  const request = fetch('/data/frequency.json').then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the word frequencies: ${response.status}`);
    const entries = (await response.json()) as FrequencyEntry[];
    return { entries, rank: new Map(entries.map((e, i) => [e.strongs, i])) };
  });
  table = request;
  request.catch(() => {
    if (table === request) table = undefined;
  });
  return request;
}

/** 1 for the commonest word, 2 for the next ...; undefined when the text never uses the number. Rejects when the table cannot be loaded. */
export async function rankOf(strongs: string): Promise<number | undefined> {
  const i = (await load()).rank.get(strongs);
  return i === undefined ? undefined : i + 1;
}

/** True for a name; false for any other word and for a number the text never uses. Rejects when the table cannot be loaded. */
export async function isProperNoun(strongs: string): Promise<boolean> {
  const t = await load();
  const i = t.rank.get(strongs);
  return i !== undefined && t.entries[i].proper;
}

/** Drops the table held in memory (tests). */
export function forgetFrequency(): void {
  table = undefined;
}
