// src/data/repositories/studyWay.ts — My study way (mw-5r3p30.76): the lines the reader keeps about how the tutor quizzes him ('Keep quizzes to
// five questions.'), in the settings store under 'studyWay' as a JSON list, oldest first. A list of short free text is what that store already
// holds (the paceRounds JSON, the Logos lexicon ticks), so there is no table and no Dexie version; the lines are outside the settings registry,
// which the tutor may change by itself: a line gets in only by the reader's tap on Keep this. They leave the phone only inside a quiz request.
import { db } from '../db';

const KEY = 'studyWay';

/** The most lines he keeps (the grind's input schema says the same). */
export const STUDY_WAY_MAX = 12;
/** The longest a line is, in characters: twelve lines of Greek stay well inside a grist. */
export const STUDY_WAY_LINE_MAX = 100;

const isLine = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= STUDY_WAY_LINE_MAX;

/** What a write did: 'kept' / 'saved', or why nothing changed. */
export type KeepResult = 'kept' | 'already' | 'empty' | 'full';
export type EditResult = 'saved' | 'already' | 'empty' | 'missing';

const read = async (): Promise<string[]> => {
  const row = await db.settings.get(KEY);
  if (typeof row?.value !== 'string') return [];
  try {
    const kept: unknown = JSON.parse(row.value);
    return Array.isArray(kept) ? kept.filter(isLine).slice(0, STUDY_WAY_MAX) : [];
  } catch {
    return [];
  }
};
const write = (lines: string[]) => db.settings.put({ key: KEY, value: JSON.stringify(lines) });

/** The kept lines, oldest first. */
export const listStudyWay = (): Promise<string[]> => read();

/** Keeps `line` (trimmed) at the end of the list, once. */
export function keepStudyWayLine(line: string): Promise<KeepResult> {
  const text = line.trim();
  return db.transaction('rw', db.settings, async (): Promise<KeepResult> => {
    if (!isLine(text)) return 'empty';
    const lines = await read();
    if (lines.includes(text)) return 'already';
    if (lines.length >= STUDY_WAY_MAX) return 'full';
    await write([...lines, text]);
    return 'kept';
  });
}

/** Puts `to` (trimmed) where the line `from` stands. */
export function editStudyWayLine(from: string, to: string): Promise<EditResult> {
  const text = to.trim();
  return db.transaction('rw', db.settings, async (): Promise<EditResult> => {
    if (!isLine(text)) return 'empty';
    const lines = await read();
    const at = lines.indexOf(from);
    if (at < 0) return 'missing';
    if (text === from) return 'saved';
    if (lines.includes(text)) return 'already';
    await write(lines.map((l, i) => (i === at ? text : l)));
    return 'saved';
  });
}

/** Drops the line `line`. */
export async function deleteStudyWayLine(line: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    await write((await read()).filter((l) => l !== line));
  });
}
