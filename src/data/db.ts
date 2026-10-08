import Dexie, { type EntityTable } from 'dexie';

export type WordState = 'solid' | 'learning' | 'dropped';

/** A Greek word he is learning. */
export interface Word {
  /** The plain headword, the key: 'ἄνθρωπος'. */
  lemma: string;
  /** The lexicon lemmas that match it (see lemma.ts); indexed so the weave can look a lemma up. */
  lemmas: string[];
  gloss: string;
  /** The BMA lesson it came from; 0 for a word added by Import with no lesson. */
  lesson: number;
  state: WordState;
  /** When it last got this state (ms since the epoch). */
  since: number;
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

  constructor() {
    super('lampas');
    // v1: no stores yet; the reading, licence and progress stories add theirs.
    this.version(1).stores({});
    // v2: the words he knows (key lemma; lesson and state to list them; *lemmas to find one by lexicon lemma), and meta.
    this.version(2).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key' });
    // v3: settings he chooses (key, value), such as the reader's English | Greek view.
    this.version(3).stores({ words: 'lemma, lesson, state, *lemmas', meta: 'key', settings: 'key' });
  }
}

export const db = new LampasDB();
