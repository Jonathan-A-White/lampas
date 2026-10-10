// src/data/repositories/talks.ts — the turns of the Bible talk, kept on the phone per conversation. A repository owns its transactions.
import type { AppliedChange } from '../../settings/registry';
import { db, type AnswerLink, type AnswerWord, type HebrewSounds, type TalkPicture, type TalkTurn } from '../db';

export type { TalkPicture, TalkTurn };

/** The key a conversation is kept under: the chapter 'rom.8', one of its verses 'rom.8.28' or a passage 'rom.8.1-11' (a string, src/data/passage.ts unitId).
 * A quiz (mw-5r3p30.74) is a conversation of its own beside the talk about the same verses: 'rom.8.1-11:quiz'. */
export const talkRef = (book: string, chapter: number, unit: number | string | null, quiz = false): string =>
  (unit === null ? `${book}.${chapter}` : `${book}.${chapter}.${unit}`) + (quiz ? ':quiz' : '');

/** The key a talk from a screen (mw-5r3p30.91) is kept under: 'screen.goal', 'screen.my-study-way'. Not a verse, not a chapter. */
export const screenRef = (slug: string): string => `screen.${slug}`;

/** What an answer did to the app: the settings changed and a sentence for each one ignored, and the words it put on his list
 * (`added`), found there already (`already`) or could not find in the lexicon (`unknown`). */
export interface TurnChanges {
  changes: AppliedChange[];
  refused: string[];
  added?: string[];
  already?: string[];
  unknown?: string[];
  /** the links of the answer (mw-5r3p30.75) */
  links?: AnswerLink[];
  /** the study way line the answer proposed (mw-5r3p30.76) */
  studyWayLine?: string;
  /** how the Hebrew word he asked to sound out is said (mw-5r3p30.98) */
  guide?: HebrewSounds;
  /** the one-line summary of an ask the app cannot meet, offered to the makers */
  feedbackOffer?: string;
  /** what he said, cleaned up by the tutor; shown in place of the raw words, which stay as `q` */
  cleanQ?: string;
  /** the pictures he sent with it (mw-y3qno5.1), kept in their own table */
  pictures?: KeptPicture[];
}

/** A picture to keep with a turn: the bytes that were sent. */
export interface KeptPicture {
  bytes: Uint8Array;
  mime: string;
  name: string;
}

/** Keeps one turn and returns its id. */
export async function addTurn(ref: string, q: string, a: string, words: AnswerWord[], now = Date.now(), done?: TurnChanges): Promise<number> {
  const turn: TalkTurn = { ref, q, a, words, when: now };
  if (done && done.changes.length > 0) turn.changes = done.changes;
  if (done && done.refused.length > 0) turn.refused = done.refused;
  if (done?.added?.length) turn.added = done.added;
  if (done?.already?.length) turn.already = done.already;
  if (done?.unknown?.length) turn.unknown = done.unknown;
  if (done?.links?.length) turn.links = done.links;
  if (done?.studyWayLine) turn.studyWayLine = done.studyWayLine;
  if (done?.guide) turn.guide = done.guide;
  if (done?.feedbackOffer) turn.feedbackOffer = done.feedbackOffer;
  if (done?.cleanQ) turn.cleanQ = done.cleanQ;
  return db.transaction('rw', db.talks, db.talkPictures, async () => {
    const id = (await db.talks.add(turn)) as number;
    if (done?.pictures?.length) {
      await db.talkPictures.bulkAdd(done.pictures.map((p, place) => ({ turnId: id, place, bytes: bufferOf(p.bytes), mime: p.mime, name: p.name })));
    }
    return id;
  });
}

/** The bytes as an ArrayBuffer of their own (a view may sit in a bigger buffer). */
const bufferOf = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

/** The pictures kept with a turn, in the order they were sent. */
export async function listTurnPictures(turnId: number): Promise<TalkPicture[]> {
  const rows = await db.talkPictures.where('turnId').equals(turnId).toArray();
  return rows.sort((a, b) => a.place - b.place);
}

/** Marks change number `index` of a turn as undone, so its Undo is not offered again. */
export async function markChangeUndone(turnId: number, index: number): Promise<void> {
  await db.transaction('rw', db.talks, async () => {
    const turn = await db.talks.get(turnId);
    if (!turn?.changes?.[index]) return;
    const changes = turn.changes.map((c, i) => (i === index ? { ...c, undone: true } : c));
    await db.talks.update(turnId, { changes });
  });
}

/** Marks the turn's feedback offer as sent, so it reads Sent from then on. */
export async function markFeedbackSent(turnId: number): Promise<void> {
  await db.talks.update(turnId, { feedbackSent: true });
}

/** One conversation's turns, the oldest first. */
export function listTurns(ref: string): Promise<TalkTurn[]> {
  return db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}

/** Forgets one conversation (New talk): its turns and the pictures kept with them. */
export async function deleteTurns(ref: string): Promise<void> {
  await db.transaction('rw', db.talks, db.talkPictures, async () => {
    const ids = (await db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).primaryKeys()) as number[];
    await db.talkPictures.where('turnId').anyOf(ids).delete();
    await db.talks.bulkDelete(ids);
  });
}
