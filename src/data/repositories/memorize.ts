// src/data/repositories/memorize.ts — verses on the schedule (mw-fu7dqf.4, the epic mw-fu7dqf): the ONLY file that reads or writes the Dexie `recalls` table and the
// schedule's 'verse' rows. A verse is memorized per language: one row of kind 'verse' per verse per language, its id '<lang>:<canonical ref>' ('en:Rom.8.28', 'el:Rom.8.28',
// 'he:Jonah.1.1', 'weave:Rom.8.28'). The rows are on the same back-off schedule as the words (src/data/schedule.ts) but reviews.ts leaves them out of listDue()/countDue() with no kind, so Review's
// round, Today's 'Review: N due', the pace and the learner summary do not count them: Memorize asks for its own kind. Every recall is kept in `recalls` (the schedule row keeps
// only the step), and stays when a verse is unmemorized: it is evidence.
import { db, type RecallHow, type RecallRow, type Review } from '../db';
import { publish } from '../../events/bus';
import { isMemorizeLang, MEMORIZE_LANGS, type MemorizeLang } from '../../memorize/languages';
import { DAY, startSchedule } from '../schedule';
import { listDue, VERSE_KIND, writeReview } from './reviews';

export { VERSE_KIND };
export type { RecallHow, RecallRow };

/** A recall passes at this share of the target's words heard in order (PROVISIONAL, the Mayor's 90%). */
export const PASS_SCORE = 0.9;

/** The id of a verse's row in one language. */
export const verseId = (ref: string, lang: MemorizeLang): string => `${lang}:${ref}`;

/** Splits a verse row's id back into its language and canonical reference; undefined for an id this repository did not make. */
export function parseVerseId(id: string): { lang: MemorizeLang; ref: string } | undefined {
  const at = id.indexOf(':');
  const lang = id.slice(0, at);
  return at > 0 && at < id.length - 1 && isMemorizeLang(lang) ? { lang, ref: id.slice(at + 1) } : undefined;
}

/** A memorized verse in one language, as the screens read it. */
export interface MemorizedRow {
  ref: string;
  lang: MemorizeLang;
  step: number;
  due: number;
  lastWhen: number;
}

function memorizedRow(row: Review): MemorizedRow | undefined {
  const at = parseVerseId(row.id);
  return at && { ...at, step: row.step, due: row.due, lastWhen: row.lastWhen };
}

/** Tells the bus how many verses are due at `now`. Best effort: the write it follows is already kept. */
async function announceDueVerses(now: number): Promise<void> {
  try {
    publish({ kind: 'memorize-due-changed', due: await countDueVerses(now) });
  } catch (error) {
    console.error('could not count the verses due', error);
  }
}

/**
 * Puts a verse on the schedule in these languages: a row each, at step 0 and due now (so the first session is at once), for the ones that are not there; a row that is
 * there is left as it is. Returns the languages it added.
 */
export async function memorize(ref: string, langs: readonly MemorizeLang[], now = Date.now()): Promise<MemorizeLang[]> {
  const added = await db.transaction('rw', db.reviews, async () => {
    const wanted = [...new Set(langs)];
    const there = await Promise.all(wanted.map((lang) => db.reviews.get([VERSE_KIND, verseId(ref, lang)])));
    const missing = wanted.filter((_, i) => there[i] === undefined);
    await db.reviews.bulkAdd(missing.map((lang): Review => ({ kind: VERSE_KIND, id: verseId(ref, lang), ...startSchedule(now), due: now, lastWhen: now, lapses: 0, rights: 0 })));
    return missing;
  });
  if (added.length > 0) await announceDueVerses(now);
  return added;
}

/** Takes a verse off the schedule: one language's row, or every language's. The recalls stay. */
export async function unmemorize(ref: string, lang?: MemorizeLang, now = Date.now()): Promise<void> {
  const langs = lang === undefined ? MEMORIZE_LANGS : [lang];
  await db.reviews.where('[kind+id]').anyOf(langs.map((l) => [VERSE_KIND, verseId(ref, l)])).delete();
  await announceDueVerses(now);
}

/** The schedule rows of a verse as they are now (one language's, or every language's), to put back when the tutor's unmemorize is undone. */
export async function verseRowsOf(ref: string, lang?: MemorizeLang): Promise<Review[]> {
  const langs = lang === undefined ? MEMORIZE_LANGS : [lang];
  const rows = await Promise.all(langs.map((l) => db.reviews.get([VERSE_KIND, verseId(ref, l)])));
  return rows.flatMap((row) => row ?? []);
}

/** Puts back schedule rows `verseRowsOf` returned, as they were (the step and the due date too). */
export async function restoreVerseRows(rows: readonly Review[], now = Date.now()): Promise<void> {
  await db.reviews.bulkPut([...rows]);
  await announceDueVerses(now);
}

/** For each of these references that is memorized, the languages it is in (English, Greek, Hebrew, Weave order). A reference that is not memorized is not in the map. */
export async function memorizedOf(refs: readonly string[]): Promise<Map<string, MemorizeLang[]>> {
  const rows = await Promise.all(refs.flatMap((ref) => MEMORIZE_LANGS.map((lang) => db.reviews.get([VERSE_KIND, verseId(ref, lang)]))));
  const found = new Map<string, MemorizeLang[]>();
  rows.forEach((row, i) => {
    if (!row) return;
    const ref = refs[Math.floor(i / MEMORIZE_LANGS.length)];
    found.set(ref, [...(found.get(ref) ?? []), MEMORIZE_LANGS[i % MEMORIZE_LANGS.length]]);
  });
  return found;
}

/** Every memorized verse in every language, with where it is on the schedule. */
export async function listMemorized(): Promise<MemorizedRow[]> {
  const rows = await db.reviews.where('kind').equals(VERSE_KIND).toArray();
  return rows.flatMap((row) => memorizedRow(row) ?? []);
}

/** Where one verse is on the schedule in one language, or undefined when it is not memorized in it. */
export async function memorizedRowOf(ref: string, lang: MemorizeLang): Promise<MemorizedRow | undefined> {
  const row = await db.reviews.get([VERSE_KIND, verseId(ref, lang)]);
  return row && memorizedRow(row);
}

/** The verse rows due at `now`, the longest overdue first. */
export const listDueVerses = (now = Date.now()): Promise<Review[]> => listDue(VERSE_KIND, now);

/** How many verse rows are due at `now`. */
export async function countDueVerses(now = Date.now()): Promise<number> {
  return (await listDueVerses(now)).length;
}

/** What a recall is made of, before it is dated and given its gap. */
export type RecallInput = Omit<RecallRow, 'id' | 'when' | 'gap' | 'lang'> & { lang: MemorizeLang };

/**
 * Keeps one recall and moves the verse on the schedule: the recall row (with its gap, the days since the last recall of this verse in this language, 0 for the first) and the
 * schedule row (a score of PASS_SCORE or more is right, as the words' schedule has it; less drops it two steps and makes it due tomorrow) are written in one transaction. A verse that
 * was not on the schedule is put there. Publishes 'memorize-due-changed'.
 */
export async function recordRecall(input: RecallInput, now = Date.now()): Promise<RecallRow> {
  const row = await db.transaction('rw', db.reviews, db.recalls, async () => {
    const before = await db.recalls.where('[ref+lang]').equals([input.ref, input.lang]).toArray();
    const last = before.reduce((latest, r) => Math.max(latest, r.when), -Infinity);
    const recall: RecallRow = { ...input, when: now, gap: before.length === 0 ? 0 : Math.max(0, Math.round((now - last) / DAY)) };
    recall.id = await db.recalls.add(recall);
    await writeReview(VERSE_KIND, verseId(input.ref, input.lang), input.score >= PASS_SCORE, now);
    return recall;
  });
  await announceDueVerses(now);
  return row;
}

/** Every recall of a verse (all languages, or one), oldest first: the evidence the tutor and the schedule models read. */
export async function recallsOf(ref: string, lang?: MemorizeLang): Promise<RecallRow[]> {
  const rows = lang === undefined ? await db.recalls.where('[ref+lang]').between([ref, ''], [ref, '￿']).toArray() : await db.recalls.where('[ref+lang]').equals([ref, lang]).toArray();
  return rows.sort((a, b) => a.when - b.when || (a.id ?? 0) - (b.id ?? 0));
}

/** Every recall of every verse, oldest first: the evidence the tutor reads (src/memorize/evidence.ts). */
export async function listRecalls(): Promise<RecallRow[]> {
  const rows = await db.recalls.toArray();
  return rows.sort((a, b) => a.when - b.when || (a.id ?? 0) - (b.id ?? 0));
}

/** A memorized verse in one language with its newest recall (undefined before the first). */
export interface MemorizedProgress {
  row: MemorizedRow;
  last: RecallRow | undefined;
}

/** Every memorized verse in every language (or only these references') with its newest recall: what the Memorize screen and the progress marks read. */
export async function listProgress(refs?: readonly string[]): Promise<MemorizedProgress[]> {
  const wanted = refs && new Set(refs);
  const rows = (await listMemorized()).filter((row) => !wanted || wanted.has(row.ref));
  return Promise.all(rows.map(async (row) => ({ row, last: (await recallsOf(row.ref, row.lang)).at(-1) })));
}

/** The verse the next session is of: the longest overdue of those due at `now`, leaving out `except` (the one just recalled). */
export async function nextDueVerse(now = Date.now(), except?: { ref: string; lang: MemorizeLang }): Promise<{ ref: string; lang: MemorizeLang } | undefined> {
  const due = (await listDueVerses(now)).flatMap((row) => parseVerseId(row.id) ?? []);
  return due.find((d) => d.ref !== except?.ref || d.lang !== except.lang);
}
