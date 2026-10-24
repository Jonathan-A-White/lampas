// src/events/kinds/learning.ts — the event kinds of grammar, review, new words and placement. bus.ts composes AppEvent from every kinds file; docs/events.md lists each kind.
import type { GrammarLevelName } from '../../data/db';

export type LearningEvent =
  /** a Grammar sheet opened on `term` (a word of src/data/grammar-concepts.ts), from a grammar word in the Parsing of a word's sheet,
   * from a related term on another Grammar sheet */
  | { kind: 'grammar-term-opened'; term: string }
  /** he marked `term` I know this (`known` true) or took the mark off (false) */
  | { kind: 'grammar-term-known'; term: string; known: boolean }
  /** the schedule changed (an answer, or items added): `due` is how many items are due now (src/data/schedule.ts) */
  | { kind: 'review-due-changed'; due: number }
  /** a memorized verse changed (memorized, unmemorized or recalled; src/data/repositories/memorize.ts): `due` is how many verse rows (one per verse per language) are due now; Review's count leaves them out */
  | { kind: 'memorize-due-changed'; due: number }
  /** grammar idea `id` (src/data/grammar/ladder.ts) got a level: a review answer, the placement, the idea sheet, the tutor, or the first-open seed */
  | { kind: 'grammar-level-changed'; id: string; level: GrammarLevelName }
  /** he told the idea sheet of grammar idea `id` Got it ('got-it': it is on the frontier, due tomorrow) or I know this ('known': solid, the 30-day step) */
  | { kind: 'idea-taught'; id: string; outcome: 'got-it' | 'known' | 'not-yet' }
  /** he finished Try it on a verse (src/TryItSheet.tsx) for grammar idea `id`: `right` of the `total` questions on the verse were answered right */
  | { kind: 'idea-tried'; id: string; right: number; total: number }
  /** New words at (Settings > New words, 'pickerGrammar') was moved by how his grammar reviews went: `level` is where it is now, `how` whether he said Yes ('ask') or Move it was Auto (src/review/pickerMove.ts) */
  | { kind: 'picker-level-moved'; level: 'solid' | 'frontier'; how: 'ask' | 'auto' }
  /** he answered the teach sheet (src/TeachSheet.tsx) for the new word `lemma` (NFC): Got it ('got-it': learning, due now), I know this ('known': solid, the 30-day step) or Not now ('not-now': skipped for today only) */
  | { kind: 'frontier-taught'; lemma: string; outcome: 'got-it' | 'known' | 'not-now' }
  /** a grammar placement ended (src/PlacementScreen.tsx): what it found, over the ideas the goal needs; `goal` is the saved goal text, '' for none */
  /** passage lesson `key` (src/approaches passageKey: 'passage:1jn.1.1-4') is now `read` or `passed` (src/data/repositories/passageLessons.ts) */
  | { kind: 'passage-lesson-changed'; key: string; state: 'read' | 'passed' }
  | { kind: 'placement-done'; goal: string; approach: string; solid: number; frontier: number; notYet: number; untested: number };
