import Dexie, { type EntityTable } from 'dexie';
import type { AppliedChange } from '../settings/registry';

export type WordState = 'solid' | 'learning' | 'dropped';

/** A Greek word he is learning. */
export interface Word {
  /** The plain headword, the key: 'ἄνθρωπος'. */
  lemma: string;
  /** The lexicon lemmas that match it (see lemma.ts); indexed so the weave can look a lemma up. */
  lemmas: string[];
  gloss: string;
  /** The BMA lesson it came from; 0 for a word added by Import or from a Talk answer, with no lesson. */
  lesson: number;
  state: WordState;
  /** When it last got this state (ms since the epoch). */
  since: number;
}

/** One answer in the Quick test. */
export interface TestResult {
  id?: number;
  lemma: string;
  /** When he answered (ms since the epoch). */
  when: number;
  right: boolean;
}

/** A word of the tutor's answer: a Greek word of the verse, its lemma and a note with its parsing. */
export interface AnswerWord {
  greek: string;
  lemma: string;
  note: string;
}

/** One answer the tutor gave to a question about a verse, kept so it is there on return. */
export interface TutorAnswer {
  id?: number;
  /** the verse it was asked about: 'rom.8.28' */
  ref: string;
  question: string;
  answer: string;
  words: AnswerWord[];
  /** when it arrived (ms since the epoch) */
  when: number;
}

/** One turn of a Bible talk: what he said and what the companion answered, kept so the conversation is there on return. */
export interface TalkTurn {
  id?: number;
  /** the conversation it belongs to: the chapter 'rom.8', or a verse 'rom.8.28' when it was started on one */
  ref: string;
  q: string;
  a: string;
  words: AnswerWord[];
  /** when the answer arrived (ms since the epoch) */
  when: number;
  /** the settings the answer changed, each with what it replaced so Undo can put it back (src/settings/registry.ts) */
  changes?: AppliedChange[];
  /** a sentence for each change the answer asked for that was ignored */
  refused?: string[];
  /** the lemmas the answer put on his words-to-learn list (words_to_add), each one new to it */
  added?: string[];
  /** the lemmas the answer asked to add that were on his list already */
  already?: string[];
}

/** One step of one word in the Parsing drill: 'tense' of λέγω, answered rightly or not. */
export interface DrillResult {
  id?: number;
  /** the word's key in the store: the headword he knows it by */
  lemma: string;
  /** the step asked: 'pos', 'tense', 'case', 'number+gender' ... (src/data/drill.ts) */
  step: string;
  /** when he answered (ms since the epoch) */
  when: number;
  right: boolean;
}

/** One word of a reading the mill marked to fix, with its chunks to say and a tip. */
export interface FixWord {
  word: string;
  chunks: string[];
  tip: string;
}

/** The result of the last reading check of a verse, kept so it is there on return. */
export interface VerseReading {
  /** the verse it was read from, the key: 'rom.8.28' for an English reading, 'rom.8.28:el' for one in another language */
  ref: string;
  verdict: 'well-read' | 'some-to-fix';
  words: FixWord[];
  note: string;
  /** when it arrived (ms since the epoch) */
  when: number;
}

/** A grammar term he marked I know this on its Grammar sheet ('conjunction'), kept so the word sheet shows it plain. */
export interface KnownTerm {
  /** the term, the key: a word of src/data/grammar-concepts.ts */
  term: string;
  /** when he marked it (ms since the epoch) */
  since: number;
}

/**
 * One item on the back-off schedule (src/data/schedule.ts): a word today, anything he reviews later. The key is
 * {kind, id}: kind 'word' with the NFC headword as id, or another kind with its own ids.
 */
export interface Review {
  kind: string;
  id: string;
  /** the position on the steps of src/data/schedule.ts (0 is the shortest gap) */
  step: number;
  /** when it next comes up (ms since the epoch) */
  due: number;
  /** when it was last answered (ms since the epoch) */
  lastWhen: number;
  /** how many times it was answered wrong */
  lapses: number;
  /** rights in a row since it last moved up or was wrong; two move it up a step */
  rights: number;
}

/** One-off facts about the store, such as 'wordsSeeded'. */
export interface MetaRow {
  key: string;
  value: string;
}

/** A saved setting, such as the reader's 'readerView'. */
export interface SettingRow {
  key: string;
  value: string;
}

// Never edit an old version(): repeat the whole stores map on each bump with a '// vN:' comment
// (docs/pwa-best-practices.md section 15).
class LampasDB extends Dexie {
  words!: EntityTable<Word, 'lemma'>;
  meta!: EntityTable<MetaRow, 'key'>;
  settings!: EntityTable<SettingRow, 'key'>;
  results!: EntityTable<TestResult, 'id'>;
  answers!: EntityTable<TutorAnswer, 'id'>;
  talks!: EntityTable<TalkTurn, 'id'>;
  drills!: EntityTable<DrillResult, 'id'>;
  readings!: EntityTable<VerseReading, 'ref'>;
  grammarKnown!: EntityTable<KnownTerm, 'term'>;
  reviews!: EntityTable<Review, 'kind' | 'id'>;

  constructor() {
    super('lampas');
    // v1: no stores yet; the reading, licence and progress stories add theirs.
    this.version(1).stores({});
    // v2: the words he knows (key lemma; lesson and state to list them; *lemmas to find one by lexicon lemma), and meta.
    this.version(2).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key' });
    // v3: settings he chooses (key, value), such as the reader's English | Greek view.
    this.version(3).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key', settings: 'key' });
    // v4: the Quick test's answers {lemma, when, right}; [lemma+when] reads one word's answers in order.
    this.version(4).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
    });
    // v5: the tutor's answers {ref, question, answer, words, when}; [ref+when] reads one verse's answers in order.
    this.version(5).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
    });
    // v6: the turns of a Bible talk {ref, q, a, words, when}; [ref+when] reads one conversation's turns in order.
    this.version(6).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
    });
    // v7: the Parsing drill's steps {lemma, step, when, right}; [lemma+step] reads one word's answers to one step.
    this.version(7).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
    });
    // v8: the last reading check of each verse {ref, verdict, words, note, when}, one row per verse (key ref).
    this.version(8).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
    });
    // v9: the grammar terms he knows {term, since}, one row per term (key term).
    this.version(9).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
    });
    // v10: the back-off schedule {kind, id, step, due, lastWhen, lapses, rights}, one row per item (key [kind+id]); due finds what is due.
    this.version(10).stores({
      words: 'lemma, lesson, state, *lemmas',
      meta: 'key',
      settings: 'key',
      results: '++id, [lemma+when]',
      answers: '++id, [ref+when]',
      talks: '++id, [ref+when]',
      drills: '++id, lemma, [lemma+step]',
      readings: 'ref',
      grammarKnown: 'term',
      reviews: '[kind+id], due, kind',
    });
  }
}

export const db = new LampasDB();
