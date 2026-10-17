// src/events/kinds/reader.ts — the event kinds of the Reader, reading aloud, links and requests to the Reader. bus.ts composes AppEvent from every kinds file; docs/events.md lists each kind.
import type { TalkFocus } from '../../services/talk';
import type { SpeechLanguage } from '../../speech/languages';

export type ReaderEvent =
  /** `verse` is null when no verse is selected any more (the same verse tapped again, or the reader left) */
  | { kind: 'verse-selected'; chapter: number; verse: number | null }
  /** the Reader shows this chapter (it opens, or he chose another in the picker); `book` is the code public/data/index.json has */
  | { kind: 'chapter-opened'; book: string; chapter: number }
  | { kind: 'verse-reading'; chapter: number; verse: number }
  | { kind: 'reading-stopped' }
  | { kind: 'word-tapped'; strongs: string; verse: number }
  /** a long press on a word of the reader said that word alone, in its own language */
  | { kind: 'word-spoken'; text: string; language: SpeechLanguage; verse: number | null }
  /** another screen asks the Reader, as it opens on `chapter` and `verse`, to show the Ask box holding `question` (action
   * 'ask') or to open the Talk sheet (action 'talk'); `id` counts up, so the Reader can tell a request it has not met */
  | { kind: 'reader-requested'; id: number; action: 'ask'; book: string; chapter: number; verse: number; question: string }
  | { kind: 'reader-requested'; id: number; action: 'talk'; book: string; chapter: number; verse: number }
  /** the Paradigms screen's Ask the tutor: the Talk sheet on the whole chapter, with `table` (its name) and the `revealed` forms sent as the first question's focus */
  | { kind: 'reader-requested'; id: number; action: 'paradigm'; book: string; chapter: number; table: string; revealed: string[] }
  /** the Quick test's Ask the tutor: the Talk sheet on `verse`, the first question `question` sent with `focus` (a QuizFocus: the word, the question, his answers) */
  | { kind: 'reader-requested'; id: number; action: 'word'; book: string; chapter: number; verse: number; question: string; focus: TalkFocus }
  /** the tutor took him to `chapter` of `book` (mw-5r3p30.172, the answer's `go`): the Reader shows the one-line notice 'Opened <title>' as it opens */
  | { kind: 'reader-requested'; id: number; action: 'opened'; book: string; chapter: number }
  /** a link in the address was resolved (src/nav/linkRequest.ts): the reader opens on `chapter` of `book`, with `verse` selected (null: none), the one-line
   * `notice` that says what was asked for when it is not what is shown, and, for a word link, the `word` whose sheet opens over it; `id` counts up, so the
   * Reader can tell a link it has not met */
  | {
      kind: 'link-opened';
      id: number;
      book: string;
      chapter: number;
      verse: number | null;
      notice: string | null;
      word: { lemma: string; strongs: string; gloss: string } | null;
      /** an Old Testament place the link named, which Lampas does not hold: the notice then also offers it in Logos */
      elsewhere?: { book: string; chapter: number; verse?: number };
    };
