// src/data/repositories/profile.ts — About you (mw-1vuvq6.1): what the tutor may know of the student as a person, kept on the phone only: age, pace,
// ways of learning, background, why, and a short list of notes the tutor has learned (each with when). Every field is optional. It is one JSON object
// in the settings store under 'learnerProfile' (the way studyWay.ts keeps its list: no table, no Dexie version) and outside the settings registry,
// which the tutor may change by itself: only the student's own taps (Settings > About you) write it. It leaves the phone only inside a tutor grist,
// as `learner_profile` (src/data/learnerProfile.ts).
//
// What the tutor learns in a talk (mw-1vuvq6.3, 'detect first, ask last') is kept beside his own fields, never over them: `learned` holds one item
// per field (a value, when, from which talk, whether it is only a guess, whether he has changed it), `removed` what he took away (the same talk does
// not bring it back) and `asked` the fields the tutor asked about or he declined (so it does not ask again at once, or ever after a no). A learned
// item for a field he filled in himself is a suggestion: shown, never sent, never written over his.
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
  /** the talk it came from (missing in a note kept before mw-1vuvq6.3) */
  talk?: string;
}

/** The fields the tutor may learn, and the ones it may only guess (a guess is of how he writes and talks: his age band and his background). */
export const LEARNABLE = ['age', 'pace', 'ways', 'background', 'why'] as const;
export type Learnable = (typeof LEARNABLE)[number];
export const GUESSABLE: readonly Learnable[] = ['age', 'background'];
export const LEARNED_VALUE_MAX = 100;
/** The most removals and asked-fields kept. */
const REMOVED_MAX = 30;
/** A field the tutor asked about is not asked again for a day. */
export const ASK_AGAIN_MS = 86_400_000;

/** A value the tutor learned from a talk. */
export interface Learned {
  field: Learnable;
  value: string;
  when: number;
  /** only guessed from how he writes and talks: shown as 'Lampas guesses', never over what he set */
  guessed: boolean;
  /** he changed it on the page: it is his words now */
  mine?: true;
  talk: string;
}
/** Something he took away, so the same talk does not bring it back (a note is told by its text too). */
export interface Removed {
  field: Learnable | 'note';
  talk: string;
  value?: string;
}
/** A field the tutor asked him about, and when; `declined` when he did not want to say (never asked again). */
export interface Asked {
  field: Learnable;
  when: number;
  declined: boolean;
}

/** What is kept; a field he has not filled is missing. */
export interface Profile {
  age?: string;
  pace?: Pace;
  ways: Way[];
  background?: string;
  why?: string;
  notes: ProfileNote[];
  /** what the tutor learned in talks; missing when nothing */
  learned?: Learned[];
  removed?: Removed[];
  asked?: Asked[];
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

const isField = (value: unknown): value is Learnable => LEARNABLE.some((f) => f === value);
const isLearned = (value: unknown): value is Learned =>
  isObject(value) && isField(value.field) && text(value.value, LEARNED_VALUE_MAX) !== undefined && typeof value.when === 'number' && Number.isFinite(value.when) && typeof value.guessed === 'boolean' && typeof value.talk === 'string';
const isRemoved = (value: unknown): value is Removed =>
  isObject(value) && (isField(value.field) || value.field === 'note') && typeof value.talk === 'string' && (value.value === undefined || typeof value.value === 'string');
const isAsked = (value: unknown): value is Asked => isObject(value) && isField(value.field) && typeof value.when === 'number' && Number.isFinite(value.when) && typeof value.declined === 'boolean';

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
    notes: (Array.isArray(o.notes) ? o.notes.filter(isNote) : []).slice(0, PROFILE_NOTES_MAX).map((n) => ({ text: n.text.trim(), when: n.when, ...(typeof n.talk === 'string' && n.talk ? { talk: n.talk } : {}) })),
  };
  const learned = (Array.isArray(o.learned) ? o.learned : []).filter(isLearned).filter((l, i, all) => all.findIndex((m) => m.field === l.field) === i);
  if (learned.length > 0) profile.learned = learned.map((l) => ({ field: l.field, value: l.value.trim(), when: l.when, guessed: l.guessed, ...(l.mine === true ? { mine: true as const } : {}), talk: l.talk }));
  const removed = (Array.isArray(o.removed) ? o.removed : []).filter(isRemoved).slice(-REMOVED_MAX);
  if (removed.length > 0) profile.removed = removed.map((r) => ({ field: r.field, talk: r.talk, ...(r.value !== undefined ? { value: r.value } : {}) }));
  const asked = (Array.isArray(o.asked) ? o.asked : []).filter(isAsked).filter((a, i, all) => all.findIndex((b) => b.field === a.field) === i);
  if (asked.length > 0) profile.asked = asked.map((a) => ({ field: a.field, when: a.when, declined: a.declined }));
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

/** Drops the note `note`; one the tutor learned in a talk is not kept again from that talk. */
export async function deleteProfileNote(note: string): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = await read();
    const gone = kept.notes.find((n) => n.text === note);
    const removed = gone?.talk ? [...(kept.removed ?? []), { field: 'note' as const, talk: gone.talk, value: gone.text }].slice(-REMOVED_MAX) : kept.removed;
    await write({ ...kept, notes: kept.notes.filter((n) => n.text !== note), ...(removed ? { removed } : {}) });
  });
}

// What the tutor learns in a talk (mw-1vuvq6.3).

/** One thing the tutor returns in an answer's `profile_update`: a value for a field (`guessed` when it only judges so from how he writes), a note,
 * or `declined` (he did not want to say, so the field is never asked again). */
export interface ProfileUpdate {
  field: Learnable | 'note';
  value?: string;
  guessed?: boolean;
  declined?: boolean;
}
/** What became of an update: kept as a value, kept as a suggestion (he set the field himself), kept as a note, a decline noted, or not kept. */
export type UpdateResult = 'applied' | 'suggested' | 'noted' | 'declined' | 'ignored';

const isFieldName = (field: string): field is Learnable => LEARNABLE.some((f) => f === field);

/** Whether he filled in `field` himself. */
function ownSet(profile: Profile, field: Learnable): boolean {
  if (field === 'ways') return profile.ways.length > 0;
  return profile[field] !== undefined;
}

/** A learned item is only a suggestion while the field it is for is one he filled in himself: shown, never sent, never over his. */
export const isSuggestion = (profile: Profile, item: Learned): boolean => ownSet(profile, item.field);

const withAsked = (asked: readonly Asked[] | undefined, field: Learnable, when: number, declined: boolean): Asked[] => [
  ...(asked ?? []).filter((a) => a.field !== field),
  { field, when, declined: declined || (asked ?? []).some((a) => a.field === field && a.declined) },
];

function applyUpdate(profile: Profile, talk: string, update: ProfileUpdate, now: number): { profile: Profile; result: UpdateResult } {
  const ignored = { profile, result: 'ignored' as const };
  const value = update.value?.trim();
  if (update.declined) {
    if (!isFieldName(update.field) || value !== undefined) return ignored;
    return { profile: { ...profile, asked: withAsked(profile.asked, update.field, now, true) }, result: 'declined' };
  }
  if (update.field === 'note') {
    if (update.guessed || !value || !text(value, PROFILE_NOTE_MAX)) return ignored;
    if ((profile.removed ?? []).some((r) => r.field === 'note' && r.talk === talk && r.value === value)) return ignored;
    if (profile.notes.some((n) => n.text === value) || profile.notes.length >= PROFILE_NOTES_MAX) return ignored;
    return { profile: { ...profile, notes: [...profile.notes, { text: value, when: now, talk }] }, result: 'noted' };
  }
  if (!value || !text(value, LEARNED_VALUE_MAX)) return ignored;
  if (update.field === 'pace' && !PACES.some((p) => p === value)) return ignored;
  if (update.guessed && !GUESSABLE.includes(update.field)) return ignored;
  if ((profile.removed ?? []).some((r) => r.field === update.field && r.talk === talk)) return ignored;
  const before = (profile.learned ?? []).find((l) => l.field === update.field);
  // he changed it himself, or the tutor was told it: a guess never replaces either, and nothing replaces his own words
  if (before?.mine || (before && !before.guessed && update.guessed)) return ignored;
  const item: Learned = { field: update.field, value, when: now, guessed: update.guessed === true, talk };
  const learned = before ? (profile.learned ?? []).map((l) => (l.field === update.field ? item : l)) : [...(profile.learned ?? []), item];
  return { profile: { ...profile, learned }, result: ownSet(profile, update.field) ? 'suggested' : 'applied' };
}

/** Keeps what the tutor learned in the talk `talk` (an answer's `profile_update`), and the field it asked about (`question`), in one transaction. */
export function learnFromTalk(talk: string, updates: readonly ProfileUpdate[], question?: Learnable, now: number = Date.now()): Promise<UpdateResult[]> {
  return db.transaction('rw', db.settings, async (): Promise<UpdateResult[]> => {
    let profile = await read();
    const results: UpdateResult[] = [];
    for (const update of updates) {
      const done = applyUpdate(profile, talk, update, now);
      profile = done.profile;
      results.push(done.result);
    }
    if (question) profile = { ...profile, asked: withAsked(profile.asked, question, now, false) };
    await write(parse(JSON.stringify(profile)));
    return results;
  });
}

/** Takes away what the tutor learned for `field`; the talk it came from does not bring it back. */
export async function removeLearned(field: Learnable): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const kept = await read();
    const item = (kept.learned ?? []).find((l) => l.field === field);
    if (!item) return;
    await write(parse(JSON.stringify({ ...kept, learned: kept.learned?.filter((l) => l.field !== field), removed: [...(kept.removed ?? []), { field, talk: item.talk }].slice(-REMOVED_MAX) })));
  });
}

export type ChangeLearnedResult = 'saved' | 'invalid' | 'missing';

/** Puts his own `value` (trimmed) where the tutor's stands for `field`: it is his words from then on, not a guess. */
export function changeLearned(field: Learnable, value: string): Promise<ChangeLearnedResult> {
  const line = value.trim();
  return db.transaction('rw', db.settings, async (): Promise<ChangeLearnedResult> => {
    const kept = await read();
    if (!(kept.learned ?? []).some((l) => l.field === field)) return 'missing';
    if (!text(line, LEARNED_VALUE_MAX) || (field === 'pace' && !PACES.some((p) => p === line))) return 'invalid';
    await write(parse(JSON.stringify({ ...kept, learned: kept.learned?.map((l) => (l.field === field ? { ...l, value: line, guessed: false, mine: true } : l)) })));
    return 'saved';
  });
}

/** The fields the tutor must not ask about now: one it asked about in the last day, and any he declined. */
export function doNotAsk(profile: Profile, now: number): Learnable[] {
  return (profile.asked ?? []).filter((a) => a.declined || now - a.when < ASK_AGAIN_MS).map((a) => a.field);
}
