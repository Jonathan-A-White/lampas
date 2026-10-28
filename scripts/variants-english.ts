// scripts/variants-english.ts — npm run variants:english (mw-9ji6ek0.3)
// Renders, with the tutor's model (sonnet, through the `claude` CLI on the home host, billed as the mill bills a grist), the English of every variant
// unit the MSB's footnotes do not speak for: the base and each other reading, 1-6 words each, checked against the Greek lemmas' glosses. The result
// is data/variant-english.json (source 'lampas'), committed; the chapter build (npm run data:build) stops on a unit with no entry (docs/data.md 'Variant English').
// It renders only the units without an entry, so a second run with nothing new changes nothing. Options: --raw <dir> (default data/raw), --limit N
// (render at most N units), --batch N (units per request, 25), --parallel N (requests at once, 4), --model <name> (sonnet).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildData, loadInputs } from './data-build';
import { letterKey } from './data/variants';
import { VARIANT_ENGLISH_FILE, readLampasEnglish, type LampasEnglish, type LampasEnglishFile, type MissingEnglish } from './data/variantEnglish';
import type { Chapter, GreekWord, VariantCode } from '../src/data/chapter';

// ---------------------------------------------------------------- what the model is shown

/** What the NT knows of a Greek form: its lemma, part of speech (from its parsing code), gloss and definition. */
export interface FormInfo {
  lemma: string;
  pos: string;
  gloss: string;
  definition: string;
}
export type FormIndex = Map<string, FormInfo[]>;

/** Every form of the chapters' Greek words, by its letters (no accents or case), with what the lexicon says of its lemma. */
export function formIndexOf(chapters: readonly Chapter[]): FormIndex {
  const index: FormIndex = new Map();
  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      for (const w of verse.g) {
        const key = letterKey(w.t);
        const info = infoOf(chapter, w);
        const list = index.get(key) ?? [];
        if (!list.some((i) => i.lemma === info.lemma && i.pos === info.pos)) index.set(key, [...list, info]);
      }
    }
  }
  return index;
}
const infoOf = (chapter: Chapter, w: GreekWord): FormInfo => ({
  lemma: w.l,
  pos: w.p.split('-')[0],
  gloss: chapter.lex[w.s]?.g ?? '',
  definition: chapter.lex[w.s]?.d ?? '',
});

const wordsOf = (text: string): string[] => text.split(/\s+/).filter(Boolean);
const CONTENT_POS = new Set(['N', 'V', 'A']);

/** The lemmas the model is shown for a reading's Greek: each word with the lemma and gloss it can be (the first, when a form is two words). */
function hintsOf(greek: string, index: FormIndex): Array<{ word: string; lemma: string; gloss: string }> {
  return wordsOf(greek).flatMap((word) => {
    const info = index.get(letterKey(word))?.[0];
    return info ? [{ word, lemma: info.lemma, gloss: info.gloss }] : [];
  });
}

export interface Item {
  id: number;
  ref: string;
  /** the verse in Greek and in the MSB's English, for the sense of the words */
  verse_greek: string;
  verse_english: string;
  base: { greek: string; lemmas: Array<{ word: string; lemma: string; gloss: string }> };
  readings: Array<{ witness: string; greek: string; lemmas: Array<{ word: string; lemma: string; gloss: string }> }>;
}

const WITNESS_NAME: Record<VariantCode, string> = { B: 'another Byzantine reading', N: 'Nestle-Aland', C: 'Nestle-Aland 27/28', S: 'Nestle-Aland 27', E: 'Nestle-Aland 28', M: 'Editio Critica Maior' };

export function itemOf(id: number, m: MissingEnglish, chapter: Chapter, index: FormIndex): Item {
  const verse = chapter.verses.find((v) => v.n === m.unit.v);
  return {
    id,
    ref: m.ref,
    verse_greek: verse ? verse.g.map((w) => w.t).join(' ') : '',
    verse_english: verse ? verse.e.map((c) => c.t).join(' ') : '',
    base: { greek: m.unit.base, lemmas: hintsOf(m.unit.base, index) },
    readings: m.unit.alts.map((a) => ({ witness: WITNESS_NAME[a.code], greek: a.text, lemmas: hintsOf(a.text, index) })),
  };
}

export const SYSTEM = `You write the English of textual variants of the Greek New Testament for a reading app.
You are given items. Each has a verse (Greek and the Majority Standard Bible's English, for the sense), a base reading (the Byzantine text's Greek words) and one or more other readings, each with the lemma and gloss of its words where known.
For each item give the English of the base and of every other reading, in the order given:
- Render only the Greek words of that reading, literally, in plain modern English, in the vocabulary of the verse's English where the words are the same.
- 1 to 6 English words each. Keep the article and small words that the reading has.
- The same Greek word is the same English in the base and in the other reading, so that what differs in the Greek is what differs in the English (a different tense, number, case, word or word order shows).
- A reading that leaves the base out (its Greek is empty) is the empty string "".
- No Greek letters, no brackets, no quotation marks, no notes, no explanation.
Answer with JSON only, no other text: an array with one object per item, {"id": <id>, "base": "<English>", "alts": ["<English of each other reading>"]}.`;

export const promptFor = (items: Item[], problems: Map<number, string[]> = new Map()): string =>
  `${items.length} items:\n${JSON.stringify(items.map((i) => ({ ...i, ...(problems.has(i.id) ? { fix: problems.get(i.id) } : {}) })))}`;

// ---------------------------------------------------------------- checking an answer

const GREEK = /[\u0370-\u03ff\u1f00-\u1fff]/;
const STOP = new Set(['to', 'the', 'an', 'of', 'in', 'on', 'and', 'or', 'for', 'by', 'with', 'as', 'at', 'from', 'that', 'this', 'it', 'not', 'one', 'who', 'what']);
const words = (text: string): string[] => text.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length >= 2);
// forms of 'to be' and 'to do' that share no letters with them
const FORMS: Record<string, string[]> = { be: ['am', 'is', 'are', 'was', 'were', 'been', 'being', 'will', 'shall'], do: ['did', 'done', 'does'], go: ['went', 'gone'], come: ['came'], see: ['saw', 'seen'], give: ['gave'], take: ['took'], say: ['said'], speak: ['spoke'], know: ['knew'], find: ['found'], 'have': ['had', 'has'], 'make': ['made'], stand: ['stood'], die: ['died'], rise: ['rose', 'risen'], 'raise': ['rose'], write: ['wrote'], bring: ['brought'], send: ['sent'], hear: ['heard'] };
/** two English words of one stem: the same first three letters (the whole shorter word when it is shorter), or one a listed irregular form of the other */
const alike = (a: string, b: string): boolean => {
  const n = Math.min(3, a.length, b.length);
  return a.slice(0, n) === b.slice(0, n) || (FORMS[a]?.includes(b) ?? false) || (FORMS[b]?.includes(a) ?? false);
};

/**
 * What is wrong with the model's English for an item, as plain sentences ([] when nothing): not a base and one English per reading; a reading
 * of 0 words (only for a reading that leaves the base out) or over 6; Greek letters or brackets; and, against the Greek lemmas, a reading with a noun,
 * verb or adjective of a known lemma whose English shares no beginning (4 letters) with the gloss or definition of any of them.
 */
export function problemsWith(item: Item, answer: { base?: unknown; alts?: unknown } | undefined, index: FormIndex): string[] {
  if (!answer || typeof answer.base !== 'string' || !Array.isArray(answer.alts) || answer.alts.length !== item.readings.length || answer.alts.some((a) => typeof a !== 'string')) {
    return ['answer {"id", "base", "alts"} with a string for the base and one string for each other reading'];
  }
  const out: string[] = [];
  const reading = (label: string, greek: string, english: string): void => {
    const n = wordsOf(english).length;
    if (greek.trim() === '' ? n !== 0 : n < 1 || n > 6) out.push(`${label}: ${JSON.stringify(english)} has ${n} words; give ${greek.trim() === '' ? 'nothing' : '1 to 6 words'}`);
    if (GREEK.test(english) || /[[\]{}()<>]/.test(english)) out.push(`${label}: ${JSON.stringify(english)} has Greek letters or brackets`);
    const known = wordsOf(greek).flatMap((w) => (index.get(letterKey(w)) ?? []).slice(0, 1).filter((i) => CONTENT_POS.has(i.pos)));
    if (known.length && n > 0) {
      const mine = words(english);
      const fits = known.some((i) => words(`${i.gloss} ${i.definition}`).some((g) => !STOP.has(g) && mine.some((m) => alike(m, g))));
      if (!fits) out.push(`${label}: ${JSON.stringify(english)} does not match ${known.map((i) => `${i.lemma} (${i.gloss})`).join(', ')}`);
    }
  };
  reading('base', item.base.greek, answer.base);
  item.readings.forEach((r, i) => reading(`reading ${i + 1}`, r.greek, (answer.alts as string[])[i]));
  return out;
}

// ---------------------------------------------------------------- asking the model

/** Runs `claude -p` as the mill's model (no tools, the app's own system prompt) and returns its text. */
export function ask(model: string, prompt: string, timeoutMs = 600_000): Promise<string> {
  return new Promise((resolveText, reject) => {
    const child = spawn(
      'claude',
      ['-p', '--model', model, '--output-format', 'json', '--tools', '', '--system-prompt', SYSTEM, '--no-session-persistence', '--disable-slash-commands', '--setting-sources', ''],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d: Buffer) => (out += d));
    child.stderr.on('data', (d: Buffer) => (err += d));
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.slice(0, 300)} ${out.slice(0, 300)}`));
      try {
        const reply = JSON.parse(out) as { result?: string; is_error?: boolean };
        if (reply.is_error || typeof reply.result !== 'string') throw new Error(`no result: ${out.slice(0, 300)}`);
        resolveText(reply.result);
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.end(prompt);
  });
}

export function parseAnswer(text: string): Array<{ id?: number; base?: unknown; alts?: unknown }> {
  const from = text.indexOf('[');
  const to = text.lastIndexOf(']');
  if (from < 0 || to < from) throw new Error(`no JSON array in ${text.slice(0, 200)}`);
  return JSON.parse(text.slice(from, to + 1)) as Array<{ id?: number; base?: unknown; alts?: unknown }>;
}

export interface Rendered {
  made: Map<number, LampasEnglish>;
  /** items whose English still fails the check after the retry (kept, and reported) */
  flagged: Map<number, string[]>;
}

/** One request, then one more for the items whose answer failed the check, told what was wrong. */
export async function render(items: Item[], index: FormIndex, model: string, say: (s: string) => string | void = () => undefined, asker = ask): Promise<Rendered> {
  const made = new Map<number, LampasEnglish>();
  const flagged = new Map<number, string[]>();
  let todo = items;
  let problems = new Map<number, string[]>();
  for (let round = 0; round < 3 && todo.length; round++) {
    let answers: Array<{ id?: number; base?: unknown; alts?: unknown }> = [];
    try {
      answers = parseAnswer(await asker(model, promptFor(todo, problems)));
    } catch (e) {
      say(`  request failed: ${(e as Error).message.slice(0, 200)}`);
    }
    const next: Item[] = [];
    problems = new Map();
    for (const item of todo) {
      const answer = answers.find((a) => a.id === item.id);
      const found = problemsWith(item, answer, index);
      if (answer && typeof answer.base === 'string' && Array.isArray(answer.alts) && answer.alts.length === item.readings.length) {
        made.set(item.id, { source: 'lampas', base: answer.base.trim(), alts: (answer.alts as string[]).map((a) => a.trim()) });
      }
      if (found.length) {
        flagged.set(item.id, found);
        problems.set(item.id, found);
        next.push(item);
      } else flagged.delete(item.id);
    }
    todo = next;
  }
  return { made, flagged };
}

// ---------------------------------------------------------------- the file

/** The file as it is committed: the keys in order, one entry to a line. */
export function fileText(entries: LampasEnglishFile): string {
  const keys = Object.keys(entries).sort();
  return `{\n${keys.map((k) => ` ${JSON.stringify(k)}: ${JSON.stringify(entries[k])}`).join(',\n')}\n}\n`;
}

const argOf = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

async function main(): Promise<void> {
  const raw = argOf('raw', 'data/raw');
  const limit = Number(argOf('limit', '0'));
  const batch = Number(argOf('batch', '25'));
  const parallel = Number(argOf('parallel', '4'));
  const model = argOf('model', 'sonnet');
  const inputs = await loadInputs({ rawDir: raw, log: console.log });
  const existing = readLampasEnglish();
  const built = buildData(inputs.msbTsv, inputs.lex, inputs.apparatus, inputs.overlay, { lampas: existing, strict: false });
  const keep = new Set(built.lampasUsed.map((u) => u.key));
  const entries: LampasEnglishFile = Object.fromEntries(Object.entries(existing).filter(([k]) => keep.has(k)));
  console.log(`${built.missingEnglish.length} units without English; ${Object.keys(existing).length - keep.size} stale entries dropped`);
  const chapters = new Map(built.chapters.map((c) => [`${c.chapter.code}/${c.chapter.chapter}`, c.chapter]));
  const index = formIndexOf(built.chapters.map((c) => c.chapter));
  // --recheck: an entry that fails the check as it is today is rendered again
  const failing: MissingEnglish[] = [];
  if (process.argv.includes('--recheck')) {
    for (const u of built.lampasUsed) {
      if (problemsWith(itemOf(0, u, chapters.get(`${u.code}/${u.chapter}`)!, index), entries[u.key], index).length) {
        failing.push(u);
        delete entries[u.key];
      }
    }
    console.log(`${failing.length} entries fail the check and are rendered again`);
  }
  const todo = [...built.missingEnglish, ...failing].slice(0, limit > 0 ? limit : undefined);
  const items = todo.map((m, i) => itemOf(i, m, chapters.get(`${m.code}/${m.chapter}`)!, index));
  const batches: Item[][] = [];
  for (let i = 0; i < items.length; i += batch) batches.push(items.slice(i, i + batch));
  let done = 0;
  let flaggedTotal = 0;
  const flaggedLines: string[] = [];
  const save = (): void => writeFileSync(VARIANT_ENGLISH_FILE, fileText(entries));
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < batches.length) {
      const mine = batches[next++];
      const { made, flagged } = await render(mine, index, model, console.log);
      for (const item of mine) {
        const e = made.get(item.id);
        if (!e) continue;
        entries[todo[item.id].key] = e;
        done++;
      }
      for (const [id, why] of flagged) {
        flaggedTotal++;
        flaggedLines.push(`${items[id].ref} ${todo[id].key}: ${why.join('; ')}`);
      }
      save();
      console.log(`${done} of ${items.length} units written`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, parallel) }, worker));
  save();
  console.log(`${done} of ${items.length} units rendered; ${flaggedTotal} still fail the lemma check after a retry:`);
  for (const line of flaggedLines) console.log(`  ${line}`);
  const left = built.missingEnglish.length + failing.length - done;
  if (left > 0) console.log(`${left} units still without English: run npm run variants:english again`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
