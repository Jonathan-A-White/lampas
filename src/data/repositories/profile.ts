// src/data/repositories/profile.ts — About you (mw-1vuvq6.1): what the tutor may know of the student as a person, kept on the phone only: age, pace,
// ways of learning, background, why, and a short list of notes the tutor has learned (each with when). Every field is optional. It is one JSON object
// in the settings store under 'learnerProfile' (the way studyWay.ts keeps its list: no table, no Dexie version) and outside the settings registry,
// which the tutor may change by itself: only the student's own taps (Settings > About you) write it. It leaves the phone only inside a tutor grist,
// as `learner_profile` (src/data/learnerProfile.ts).
import { db } from '../db';

const KEY = 'learnerProfile';

export const PACES = ['quick', 'steady', 'slow'] as const;
export type Pace = (typeof PACES)[number];
/** The ways of learning, in the order they are kept and sent. */
export const WAYS = ['hearing', 'seeing', 'reading', 'doing'] as const;
export type Way = (typeof WAYS)[number];

/** The longest each free field is, in characters (the grinds' input schemas say the same). */
export const PROFILE_AGE_MAX = 20;
export const PROFILE_BACKGROUND_MAX = 200;
export const PROFILE_WHY_MAX = 200;
export const PROFILE_NOTE_MAX = 100;
/** The most notes he keeps, and the most (the newest) a grist carries. */
export const PROFILE_NOTES_MAX = 12;
export const PROFILE_NOTES_SENT = 6;

export interface ProfileNote {
  text: string;
  /** when the tutor learned it (ms since the epoch) */
  when: number;
}

/** What is kept; a field he has not filled is missing. */
export interface Profile {
  age?: string;
  pace?: Pace;
  ways: Way[];
  background?: string;
  why?: string;
  notes: ProfileNote[];
}

/** What a save changes: a field named here is set ('' empties a text, null a pace); one left out stays. */
export interface ProfilePatch {
  age?: string;
  pace?: Pace | null;
  ways?: readonly Way[];
  background?: string;
  why?: string;
}

export type SaveResult = 'saved' | 'too-long';
export type NoteKeepResult = 'kept' | 'already' | 'empty' | 'full';
export type NoteEditResult = 'saved' | 'already' | 'empty' | 'missing';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): string | undefined => (typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined);
const isNote = (value: unknown): value is ProfileNote =>
  isObject(value) && text(value.text, PROFILE_NOTE_MAX) !== undefined && typeof value.when === 'number' && Number.isFinite(value.when);

/** Reads a stored value for what it can be: a field that is not what it should be is left out. */
function parse(raw: unknown): Profile {
  let value: unknown;
  try {
    value = typeof raw === 'string' ? JSON.parse(raw) : undefined;
  } catch {
    value = undefined;
  }
  const o = isObject(value) ? value : {};
  const profile: Profile = {
    ways: WAYS.filter((w) => Array.isArray(o.ways) && o.ways.includes(w)),
    notes: (Array.isArray(o.notes) ? o.notes.filter(isNote) : []).slice(0, PROFILE_NOTES_MAX).map((n) => ({ text: n.text.trim(), when: n.when })),
  };
  const age = text(o.age, PROFILE_AGE_MAX);
  const background = text(o.background, PROFILE_BACKGROUND_MAX);
  const why = text(o.why, PROFILE_WHY_MAX);
  if (age) profile.age = age;
  if (PACES.some((p) => p === o.pace)) profile.pace = o.pace as Pace;
  if (background) profile.background = background;
  if (why) profile.why = why;
  return profile;
}

const read = async (): Promise<Profile> => parse((await db.settings.get(KEY))?.value);
const write = (profile: Profile) => db.settings.put({ key: KEY, value: JSON.stringify(profile) });

/** What is kept now. */
export const getProfile = (): Promise<Profile> => read();

/** Saves the fields named in `patch`, trimmed; nothing is saved when one is too long (the screens stop the typing at the limit). */
export function saveProfile(patch: ProfilePatch): Promise<SaveResult> {
  const tooLong = (value: string | undefined, max: number): boolean => value !== undefined && value.trim().length > max;
  if (tooLong(patch.age, PROFILE_AGE_MAX) || tooLong(patch.background, PROFILE_BACKGROUND_MAX) || tooLong(patch.why, PROFILE_WHY_MAX)) return Promise.resolve('too-long');
  return db.transaction('rw', db.settings, async (): Promise<SaveResult> => {
    const kept = await read();
    const next: Profile = { ...kept };
    if (patch.age !== undefined) next.age = patch.age.trim() || undefined;
    if (patch.pace !== undefined) next.pace = patch.pace ?? undefined;
    if (patch.ways !== undefined) next.ways = WAYS.filter((w) => patch.ways?.includes(w));
    if (patch.background !== undefined) next.background = patch.background.trim() || undefined;
    if (patch.why !== undefined) next.why = patch.why.trim() || undefined;
    await write(parse(JSON.stringify(next)));
    return 'saved';
  });
}

/** Turns a way of learning on or off from what is kept now (read and written in one transaction, so two quick taps both count). */
export async function toggleWay(way: Way): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = await read();
    await write({ ...kept, ways: WAYS.filter((w) => (w === way ? !kept.ways.includes(w) : kept.ways.includes(w))) });
  });
}

/** Chooses `pace`, or clears it when it is the one kept, from what is kept now (one transaction). */
export async function togglePace(pace: Pace): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = await read();
    await write({ ...kept, pace: kept.pace === pace ? undefined : pace });
  });
}

/** Empties the whole profile, the notes too. */
export async function clearProfile(): Promise<void> {
  await db.settings.delete(KEY);
}

/** Keeps `note` (trimmed) at the end of the notes with the time it was learned, once. */
export function keepProfileNote(note: string, when: number = Date.now()): Promise<NoteKeepResult> {
  const line = note.trim();
  return db.transaction('rw', db.settings, async (): Promise<NoteKeepResult> => {
    if (!text(line, PROFILE_NOTE_MAX)) return 'empty';
    const kept = await read();
    if (kept.notes.some((n) => n.text === line)) return 'already';
    if (kept.notes.length >= PROFILE_NOTES_MAX) return 'full';
    await write({ ...kept, notes: [...kept.notes, { text: line, when }] });
    return 'kept';
  });
}

/** Puts `to` (trimmed) where the note `from` stands, with its time. */
export function editProfileNote(from: string, to: string): Promise<NoteEditResult> {
  const line = to.trim();
  return db.transaction('rw', db.settings, async (): Promise<NoteEditResult> => {
    if (!text(line, PROFILE_NOTE_MAX)) return 'empty';
    const kept = await read();
    if (!kept.notes.some((n) => n.text === from)) return 'missing';
    if (line === from) return 'saved';
    if (kept.notes.some((n) => n.text === line)) return 'already';
    await write({ ...kept, notes: kept.notes.map((n) => (n.text === from ? { ...n, text: line } : n)) });
    return 'saved';
  });
}

/** Drops the note `note`. */
export async function deleteProfileNote(note: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = await read();
    await write({ ...kept, notes: kept.notes.filter((n) => n.text !== note) });
  });
}
