// src/data/repositories/talkReader.ts — the kept talks as a voice-kit TalkReader over Lampas's own tables (mw-o480n1.8). A row of db.talks is one
// question and its answer; the reader shows it as two turns (his, then the tutor's) with the Bible fields on them, so the kit's list and its
// search read the talks without the tables changing. Read only: addTurn, mark*Choice and keepTalkSummary in talks.ts stay the writers.
import type { SearchOptions, Talk, TalkReader, TalkSummary, Turn } from 'voice-kit/talks';
import { db, type TalkTurn } from '../db';

/** What is kept with his turn: the question as the tutor cleaned it, and whether he spoke it. */
export interface UserFields {
  cleanQ?: string;
  spoken?: boolean;
}

/** What is kept with the tutor's turn: the row's id, its words and every Bible field (changes, links, offers and their choices). */
export type AssistantFields = Omit<TalkTurn, 'ref' | 'q' | 'cleanQ' | 'spoken' | 'a' | 'when'>;

export type BibleTurnFields = UserFields | AssistantFields;

/** What a conversation's summary carries: the first and the last thing he said in it, each as the tutor cleaned it. */
export interface ConversationFields {
  firstQuestion: string;
  lastQuestion: string;
}

/** What he said in a row: his question as the tutor cleaned it up when it did. */
const questionOf = (row: TalkTurn): string => (row.cleanQ ?? row.q).trim();

/** A row as its two turns. */
function turnsOf(row: TalkTurn): [Turn<BibleTurnFields>, Turn<BibleTurnFields>] {
  const { q, cleanQ, spoken, a, when, ...withRef } = row;
  const { ref, ...rest } = withRef;
  void ref;
  const his: UserFields = {};
  if (cleanQ !== undefined) his.cleanQ = cleanQ;
  if (spoken !== undefined) his.spoken = spoken;
  return [
    { role: 'user', text: q, at: when, fields: his },
    { role: 'assistant', text: a, at: when, fields: rest },
  ];
}

/** The conversations, the one with the newest last turn first (all of them, or at most `limit`): one pass over the kept rows. */
async function list({ limit }: { limit?: number } = {}): Promise<TalkSummary<ConversationFields>[]> {
  const talks = new Map<string, TalkSummary<ConversationFields> & { fields: ConversationFields }>();
  await db.talks.each((row) => {
    const question = questionOf(row);
    const seen = talks.get(row.ref);
    if (!seen) {
      talks.set(row.ref, { id: row.ref, title: '', turnCount: 2, firstText: question, createdAt: row.when, updatedAt: row.when, fields: { firstQuestion: question, lastQuestion: question } });
      return;
    }
    seen.turnCount += 2;
    if (row.when < seen.createdAt) {
      seen.createdAt = row.when;
      seen.firstText = question;
      seen.fields.firstQuestion = question;
    }
    if (row.when >= seen.updatedAt) {
      seen.updatedAt = row.when;
      seen.fields.lastQuestion = question;
    }
  });
  return Array.from(talks.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

/** One conversation: its rows as turns, the oldest first; undefined when none is kept. Pictures are not loaded (talkPictures holds them). */
async function get(ref: string): Promise<Talk<BibleTurnFields> | undefined> {
  const rows = await db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return undefined;
  return { id: ref, title: '', turns: rows.flatMap(turnsOf), memory: { facts: [], summary: '' }, createdAt: first.when, updatedAt: last.when };
}

/** The kept Bible talks as the kit reads talks. The summaries' fields are ConversationFields; the turns' are UserFields and AssistantFields. */
export const bibleTalks: TalkReader<BibleTurnFields> = {
  list: (options) => list(options) as Promise<TalkSummary<BibleTurnFields>[]>,
  get,
};

/** The longest matching line a hit shows, cut around the word. */
const LINE_MAX = 120;

/** The line of `text` that holds the word at `at`, cut to LINE_MAX around it with … where it is cut. */
function lineWith(text: string, at: number, word: string): string {
  const start = text.lastIndexOf('\n', at) + 1;
  const end = text.indexOf('\n', at);
  const line = text.slice(start, end < 0 ? text.length : end);
  const here = at - start;
  const trimmed = line.trim();
  if (trimmed.length <= LINE_MAX) return trimmed;
  const from = Math.max(0, Math.min(here - Math.floor((LINE_MAX - word.length) / 2), line.length - LINE_MAX));
  const cut = line.slice(from, from + LINE_MAX).trim();
  return `${from > 0 ? '…' : ''}${cut}${from + LINE_MAX < line.length ? '…' : ''}`;
}

/** How Conversations searches: one place per question and answer (what he said as cleaned, as he said it, and the answer; every word on one pair),
 * matched in lower case, every matching pair kept, the line cut to 120 characters around the word. */
export const conversationSearch: SearchOptions<BibleTurnFields> = {
  places: (talk) =>
    talk.turns.flatMap((turn, index): { in: 'turn'; turn: number; role: 'user'; text: string }[] => {
      if (turn.role !== 'user') return [];
      const fields = turn.fields as UserFields | undefined;
      const answer = talk.turns[index + 1]?.text ?? '';
      return [{ in: 'turn', turn: index, role: 'user', text: [fields?.cleanQ ?? turn.text, turn.text, answer].join('\n') }];
    }),
  fold: (text) => text.toLowerCase(),
  snippet: lineWith,
  maxMatches: Infinity,
};
