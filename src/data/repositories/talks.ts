// src/data/repositories/talks.ts — the turns of the Bible talk, kept on the phone per conversation. A repository owns its transactions.
import type { AppliedChange } from '../../settings/registry';
import { db, type AnswerLink, type AnswerWord, type Bridge, type GreekOffer, type HebrewSounds, type HeldPassage, type RustyOffer, type TalkPicture, type TalkSummaryRow, type TalkTurn } from '../db';

export type { TalkPicture, TalkSummaryRow, TalkTurn };

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
  /** the chapter the answer took him to (mw-5r3p30.172) */
  opened?: string;
  /** the chapter he was already on (mw-5r3p30.199): nothing moved */
  stayed?: string;
  /** the chapter the answer would have opened had he not closed Talk first (mw-5r3p30.199) */
  unopened?: { book: string; chapter: number; title: string };
  /** the links of the answer (mw-5r3p30.75) */
  links?: AnswerLink[];
  /** the study way line the answer proposed (mw-5r3p30.76) */
  studyWayLine?: string;
  /** the goal the answer offered to keep as his quiz goal (mw-5r3p30.185) */
  quizGoalOffer?: string;
  /** how the Hebrew word he asked to sound out is said (mw-5r3p30.98) */
  guide?: HebrewSounds;
  /** the one-line summary of an ask the app cannot meet, offered to the makers */
  feedbackOffer?: string;
  /** a setting change the answer offered, checked against the registry (mw-5r3p30.186) */
  settingOffer?: { key: string; value: string | number };
  /** the foundation ideas the answer bridged to (mw-1vuvq6.5) */
  bridge?: Bridge;
  /** the one offer of the Greek the answer made (mw-yrmkdf.4) */
  greekOffer?: GreekOffer;
  /** the rusty items the answer offered to move back to Frontier (mw-1vuvq6.6) */
  rustyOffer?: RustyOffer;
  /** the answer offered to open Today (mw-5r3p30.731) */
  todayOffer?: boolean;
  /** what he said, cleaned up by the tutor; shown in place of the raw words, which stay as `q` */
  cleanQ?: string;
  /** the question was spoken, so the tutor's cleaned question shows his own words under it (mw-5r3p30.308) */
  spoken?: boolean;
  /** the pictures he sent with it (mw-y3qno5.1), kept in their own table */
  pictures?: KeptPicture[];
  /** the key points the tutor wrote at a refresh of the talk's session (mw-pxji7y.3) */
  keyPoints?: string;
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
  if (done?.opened) turn.opened = done.opened;
  if (done?.stayed) turn.stayed = done.stayed;
  if (done?.unopened) turn.unopened = done.unopened;
  if (done?.added?.length) turn.added = done.added;
  if (done?.already?.length) turn.already = done.already;
  if (done?.unknown?.length) turn.unknown = done.unknown;
  if (done?.links?.length) turn.links = done.links;
  if (done?.studyWayLine) turn.studyWayLine = done.studyWayLine;
  if (done?.quizGoalOffer) turn.quizGoalOffer = done.quizGoalOffer;
  if (done?.guide) turn.guide = done.guide;
  if (done?.feedbackOffer) turn.feedbackOffer = done.feedbackOffer;
  if (done?.settingOffer) turn.settingOffer = done.settingOffer;
  if (done?.bridge) turn.bridge = done.bridge;
  if (done?.greekOffer) turn.greekOffer = done.greekOffer;
  if (done?.rustyOffer) turn.rustyOffer = done.rustyOffer;
  if (done?.todayOffer) turn.todayOffer = true;
  if (done?.cleanQ) turn.cleanQ = done.cleanQ;
  if (done?.spoken) turn.spoken = true;
  if (done?.keyPoints) turn.keyPoints = done.keyPoints;
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

/** Adds changes to a turn's list, so its rows show them with Undo (a setting offer taken by its button). */
export async function addTurnChanges(turnId: number, added: AppliedChange[]): Promise<void> {
  await db.transaction('rw', db.talks, async () => {
    const turn = await db.talks.get(turnId);
    if (turn) await db.talks.update(turnId, { changes: [...(turn.changes ?? []), ...added] });
  });
}

/** Records that he tapped Open on a turn's unopened chapter (mw-5r3p30.216): the turn then reads 'Opened John 3' and offers no button. */
export async function markUnopenedOpened(turnId: number): Promise<void> {
  await db.transaction('rw', db.talks, async () => {
    const turn = await db.talks.get(turnId);
    if (!turn?.unopened) return;
    const { unopened, ...rest } = turn;
    await db.talks.put({ ...rest, opened: unopened.title });
  });
}

/** Keeps the passages the turn's answer asked for (mw-5r3p30.734), once they are read: the turn then reads 'Tutor fetched ...' and the talk's next request holds them. */
export async function keepFetched(turnId: number, passages: HeldPassage[]): Promise<void> {
  await db.talks.update(turnId, { fetched: passages });
}

/** Marks the turn's feedback offer as sent, so it reads Sent from then on. */
export async function markFeedbackSent(turnId: number): Promise<void> {
  await db.talks.update(turnId, { feedbackSent: true });
}

/** The turn as kept now, or undefined when it is gone. */
export function getTurn(turnId: number): Promise<TalkTurn | undefined> {
  return db.talks.get(turnId);
}

/** Marks the turn's feedback offer as withdrawn (he said no): nothing is sent and the offer reads Not sent. */
export async function markFeedbackWithdrawn(turnId: number): Promise<void> {
  await db.talks.update(turnId, { feedbackWithdrawn: true });
}

/** Records what became of a turn's setting offer: 'taken' (the caller changed the setting) or 'declined'. */
export async function markSettingChoice(turnId: number, choice: 'taken' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { settingChoice: choice });
}

/** Records what became of a turn's bridge (mw-1vuvq6.5): 'taken' (the idea's sheet was opened) or 'declined'. */
export async function markBridgeChoice(turnId: number, choice: 'taken' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { bridgeChoice: choice });
}

/** Records what became of a turn's offer of the Greek (mw-yrmkdf.4): 'taken' (the word's sheet or the Greek view was opened) or 'declined' (his no). */
export async function markGreekChoice(turnId: number, choice: 'taken' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { greekChoice: choice });
}

/** Records what became of a turn's offer to move rusty items back to Frontier (mw-1vuvq6.6): 'taken' (they were moved and their practice opened) or 'declined'. */
export async function markRustyChoice(turnId: number, choice: 'taken' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { rustyChoice: choice });
}

/** Records what became of a turn's offer to open Today (mw-5r3p30.731): 'taken' (Today was opened) or 'declined'. */
export async function markTodayChoice(turnId: number, choice: 'taken' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { todayChoice: choice });
}

/** Records what he did with a turn's quiz goal offer: 'kept' (Yes, from now on; the caller keeps the goal), 'once' (Just this time) or 'declined' (no: nothing kept). */
export async function markQuizGoalChoice(turnId: number, choice: 'kept' | 'once' | 'declined'): Promise<void> {
  await db.talks.update(turnId, { quizGoalChoice: choice });
}

/** One conversation's turns, the oldest first. */
export function listTurns(ref: string): Promise<TalkTurn[]> {
  return db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}

/** The running summary of a conversation (mw-5r3p30.700), or undefined when none is kept yet. */
export function getTalkSummary(ref: string): Promise<TalkSummaryRow | undefined> {
  return db.talkSummaries.get(ref);
}

/** Keeps the running summary of a conversation, replacing the one before: `covered` is how many of its oldest turns the summary holds. */
export async function keepTalkSummary(ref: string, summary: string, covered: number, when = Date.now()): Promise<void> {
  await db.talkSummaries.put({ ref, summary, covered, when });
}

/** Forgets one conversation (New talk): its turns, the pictures kept with them and its summary. */
export async function deleteTurns(ref: string): Promise<void> {
  await db.transaction('rw', db.talks, db.talkPictures, db.talkSummaries, async () => {
    await db.talkSummaries.delete(ref);
    const ids = (await db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).primaryKeys()) as number[];
    await db.talkPictures.where('turnId').anyOf(ids).delete();
    await db.talks.bulkDelete(ids);
  });
}

/** A conversation as the lists show it (Share to Lampas > Choose a talk, and Conversations): its key, the first and the last thing he said in it and when the last turn came. */
export interface Conversation {
  ref: string;
  firstQuestion: string;
  lastQuestion: string;
  lastWhen: number;
}

/** What he said in a turn: his question as the tutor cleaned it up when it did. */
const questionOf = (turn: TalkTurn): string => (turn.cleanQ ?? turn.q).trim();

/** The conversations, the one with the newest turn first (all of them, or at most `limit`). */
export async function listConversations(limit = Infinity): Promise<Conversation[]> {
  const talks = new Map<string, Conversation & { firstWhen: number }>();
  await db.talks.each((turn) => {
    const seen = talks.get(turn.ref);
    const question = questionOf(turn);
    if (!seen) talks.set(turn.ref, { ref: turn.ref, firstQuestion: question, firstWhen: turn.when, lastQuestion: question, lastWhen: turn.when });
    else {
      if (turn.when < seen.firstWhen) Object.assign(seen, { firstQuestion: question, firstWhen: turn.when });
      if (turn.when >= seen.lastWhen) Object.assign(seen, { lastQuestion: question, lastWhen: turn.when });
    }
  });
  return Array.from(talks.values(), ({ ref, firstQuestion, lastQuestion, lastWhen }) => ({ ref, firstQuestion, lastQuestion, lastWhen }))
    .sort((a, b) => b.lastWhen - a.lastWhen)
    .slice(0, limit);
}

/** A conversation the search found, with the line of its newest matching turn that holds the first word searched for. */
export interface ConversationHit extends Conversation {
  line: string;
}

/** The longest matching line a hit shows, cut around the word. */
const LINE_MAX = 120;

/** The first line of `texts` that holds `word` (lower case), cut to LINE_MAX around it with … where it is cut; undefined when none does. */
function lineWith(texts: string[], word: string): string | undefined {
  for (const text of texts) {
    for (const line of text.split('\n')) {
      const at = line.toLowerCase().indexOf(word);
      if (at < 0) continue;
      const trimmed = line.trim();
      if (trimmed.length <= LINE_MAX) return trimmed;
      const from = Math.max(0, Math.min(at - Math.floor((LINE_MAX - word.length) / 2), line.length - LINE_MAX));
      const cut = line.slice(from, from + LINE_MAX).trim();
      return `${from > 0 ? '…' : ''}${cut}${from + LINE_MAX < line.length ? '…' : ''}`;
    }
  }
  return undefined;
}

/** The conversations with a turn whose question or answer holds every word of `query` (case-insensitive), the one with the newest last turn first.
 * The turns are read from the phone and filtered in memory: no index is needed for the few thousand a phone holds. */
export async function searchConversations(query: string): Promise<ConversationHit[]> {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const found = new Map<string, { when: number; line: string }>();
  await db.talks.each((turn) => {
    const texts = [turn.cleanQ ?? turn.q, turn.q, turn.a];
    const all = texts.join('\n').toLowerCase();
    if (!words.every((word) => all.includes(word))) return;
    const line = lineWith(texts, words[0] as string);
    const seen = found.get(turn.ref);
    if (line !== undefined && (!seen || turn.when >= seen.when)) found.set(turn.ref, { when: turn.when, line });
  });
  if (found.size === 0) return [];
  const conversations = await listConversations();
  return conversations.flatMap((conversation) => {
    const hit = found.get(conversation.ref);
    return hit ? [{ ...conversation, line: hit.line }] : [];
  });
}
