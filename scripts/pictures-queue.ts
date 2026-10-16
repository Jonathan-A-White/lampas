// scripts/pictures-queue.ts — the picture queue (mw-5r3p30.383, docs/pictures.md 'The picture queue'): the New Testament's
// dictionary forms with no memory picture, commonest first (public/data/frequency.json), less the skip list in docs/pictures.md.
// A slice of pictures draws the top of it. Run by `npm run pictures:queue` (`-- --top 60` for the first 60), never at runtime.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lexiconLemmas, normaliseHeadword } from '../src/data/lemma';
import { PICTURES } from '../src/data/pictures';

/** A row of public/data/frequency.json: a lemma may be several spellings ('Δαυείδ, Δαυίδ, Δαβίδ'). */
export interface FrequencyRow {
  strongs: string;
  lemma: string;
  count: number;
  chapters: number;
  proper: boolean;
}

/** A word waiting for a picture: `rank` is its place in the frequency table, `headword` the key PICTURES gives it. */
export interface QueueEntry {
  rank: number;
  headword: string;
  lemma: string;
  strongs: string;
  count: number;
  proper: boolean;
}

/** A word of the skip list: nothing honest to draw, and why. */
export interface SkipEntry {
  lemma: string;
  reason: string;
}

// Seed headwords the frequency table counts under another lemma, which src/data/lemma.ts does not map (it would change
// the weave): the seed's εὐαγγελίζω is the table's εὐαγγελίζομαι, and ἡμεῖς and ὑμεῖς are counted with ἐγώ and σύ.
const SAME_WORD: Readonly<Record<string, string>> = { 'εὐαγγελίζω': 'εὐαγγελίζομαι', 'ἡμεῖς': 'ἐγώ', 'ὑμεῖς': 'σύ' };

const formsOf = (row: FrequencyRow): string[] => row.lemma.split(',').map((f) => f.trim().normalize('NFC'));

/** The frequency row a picture's key or a skip's lemma names: by any of its spellings or the lexicon lemmas of a headword. */
export function entryOf(key: string, frequency: readonly FrequencyRow[]): FrequencyRow | undefined {
  const head = normaliseHeadword(key);
  const names = new Set([head, ...lexiconLemmas(head), ...(SAME_WORD[head] ? [SAME_WORD[head]] : [])]);
  return frequency.find((row) => formsOf(row).some((f) => names.has(f)));
}

/** The rows with no picture and no skip, in the table's order (commonest first). */
export function pictureQueue(frequency: readonly FrequencyRow[], pictured: readonly string[], skips: readonly SkipEntry[]): QueueEntry[] {
  const done = new Set<string>();
  for (const key of [...pictured, ...skips.map((s) => s.lemma)]) {
    const row = entryOf(key, frequency);
    if (row) done.add(row.strongs);
  }
  const queue: QueueEntry[] = [];
  frequency.forEach((row, i) => {
    if (done.has(row.strongs)) return;
    queue.push({ rank: i + 1, headword: normaliseHeadword(row.lemma), lemma: row.lemma, strongs: row.strongs, count: row.count, proper: row.proper });
  });
  return [...queue].sort((a, b) => b.count - a.count || a.rank - b.rank);
}

/** The skip list: the lines '- **<lemma>** — <reason>' under the heading 'Nothing honest to draw' of docs/pictures.md. */
export function readSkipList(markdown: string): SkipEntry[] {
  const skips: SkipEntry[] = [];
  let inside = false;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('#')) inside = /nothing honest to draw/i.test(line);
    const m = inside ? /^- \*\*(.+?)\*\* — (.+)$/.exec(line.trim()) : null;
    if (m) skips.push({ lemma: m[1].normalize('NFC'), reason: m[2].trim() });
  }
  return skips;
}

/** The queue as text: rank, count, the PICTURES key, Strong's number and gloss; `top` keeps the first lines only. */
export function formatQueue(queue: readonly QueueEntry[], glosses: Readonly<Record<string, string>>, top?: number): string {
  const shown = top === undefined ? queue : queue.slice(0, top);
  const lines = shown.map((e) => {
    const gloss = glosses[e.headword] ?? glosses[e.lemma] ?? '';
    const name = e.proper ? `${e.headword} (name)` : e.headword;
    return `${String(e.rank).padStart(5)} ${String(e.count).padStart(5)}  ${name.padEnd(20)} ${e.strongs.padEnd(6)} ${gloss}`;
  });
  return ['  rank count  headword             strongs gloss', ...lines].join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const frequency = JSON.parse(readFileSync('public/data/frequency.json', 'utf8')) as FrequencyRow[];
  const lexicon = JSON.parse(readFileSync('public/data/lexicon.json', 'utf8')) as Record<string, { g: string }>;
  const glosses = Object.fromEntries(Object.entries(lexicon).map(([lemma, e]) => [normaliseHeadword(lemma), e.g]));
  const skips = readSkipList(readFileSync('docs/pictures.md', 'utf8'));
  const at = process.argv.indexOf('--top');
  const top = at > 0 ? Number(process.argv[at + 1]) : undefined;
  const queue = pictureQueue(frequency, Object.keys(PICTURES), skips);
  process.stdout.write(formatQueue(queue, glosses, top));
  console.log(`${Object.keys(PICTURES).length} pictures, ${skips.length} skipped, ${queue.length} dictionary forms waiting`);
}
