// src/events/bus.ts — the one typed pub-sub screens talk through instead of calling each other. A screen
// publishes what happened; any screen subscribes to the kinds it cares about. The last event of each kind is
// kept, so a screen that mounts late still knows the current verse. docs/events.md lists every kind.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReaderView, ReadingLayout, SectionHeadings, Tips, Weave, WeaveGrammar } from '../data/repositories';
import type { GrammarLevelName } from '../data/db';
import type { Goal } from '../data/goal';
import type { ReadSpan } from '../speech/readSpan';
import type { Theme } from '../appearance/themes';
import type { SpeechLanguage, SpeechRates } from '../speech/languages';
import type { GreekPronunciation } from '../speech/pronunciation';

export type AppEvent =
  /** `verse` is null when no verse is selected any more (the same verse tapped again, or the reader left) */
  | { kind: 'verse-selected'; chapter: number; verse: number | null }
  /** the Reader shows this chapter (it opens, or he chose another in the picker); `book` is the code public/data/index.json has */
  | { kind: 'chapter-opened'; book: string; chapter: number }
  | { kind: 'view-changed'; view: ReaderView }
  | { kind: 'weave-changed'; weave: Weave }
  /** the Weave's grammar dial: which forms of the woven words keep their Greek (Any | Solid | Solid and frontier) */
  | { kind: 'weave-grammar-changed'; grammar: WeaveGrammar }
  | { kind: 'layout-changed'; layout: ReadingLayout }
  | { kind: 'headings-changed'; headings: SectionHeadings }
  /** the Read aloud span: how far the header's Read from the top / Read from here goes */
  | { kind: 'read-span-changed'; span: ReadSpan }
  /** the Tips choice: whether the phone may send for a tip and show its card */
  | { kind: 'tips-changed'; tips: Tips }
  /** the voices he chose in Settings, as the phone's voiceURI; null is the phone's default */
  | { kind: 'voices-changed'; english: string | null; greek: string | null }
  | { kind: 'pronunciation-changed'; pronunciation: GreekPronunciation }
  /** the Theme he chose in Settings */
  | { kind: 'theme-changed'; theme: Theme }
  /** the Text size he chose, as a percent of the phone's own (85 to 160) */
  | { kind: 'text-size-changed'; percent: number }
  /** how fast each language is spoken, 0.5 to 1.5, 1 normal */
  | { kind: 'rates-changed'; rates: SpeechRates }
  | { kind: 'verse-reading'; chapter: number; verse: number }
  | { kind: 'reading-stopped' }
  | { kind: 'word-tapped'; strongs: string; verse: number }
  /** a long press on a word of the reader said that word alone, in its own language */
  | { kind: 'word-spoken'; text: string; language: SpeechLanguage; verse: number }
  /** he tapped Grammar or Sound it out on a word's sheet (Help with this word): the Talk sheet opens on `verse` with the question
   * about `form` sent. `help` is what he wants help with */
  | { kind: 'word-help'; help: 'grammar' | 'sound'; form: string; lemma: string; parse: string; chapter: number; verse: number }
  /** a Grammar sheet opened on `term` (a word of src/data/grammar-concepts.ts), from a grammar word in the Parsing of a word's sheet,
   * from a related term on another Grammar sheet */
  | { kind: 'grammar-term-opened'; term: string }
  /** he marked `term` I know this (`known` true) or took the mark off (false) */
  | { kind: 'grammar-term-known'; term: string; known: boolean }
  /** another screen asks the Reader, as it opens on `chapter` and `verse`, to show the Ask box holding `question` (action
   * 'ask') or to open the Talk sheet (action 'talk'); `id` counts up, so the Reader can tell a request it has not met */
  | { kind: 'reader-requested'; id: number; action: 'ask'; book: string; chapter: number; verse: number; question: string }
  | { kind: 'reader-requested'; id: number; action: 'talk'; book: string; chapter: number; verse: number }
  /** the Paradigms screen's Ask the tutor: the Talk sheet on the whole chapter, with `table` (its name) and the `revealed` forms sent as the first question's focus */
  | { kind: 'reader-requested'; id: number; action: 'paradigm'; book: string; chapter: number; table: string; revealed: string[] }
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
    }
  /** the schedule changed (an answer, or items added): `due` is how many items are due now (src/data/schedule.ts) */
  | { kind: 'review-due-changed'; due: number }
  /** grammar idea `id` (src/data/grammar/ladder.ts) got a level: a review answer, the placement, the idea sheet, the tutor, or the first-open seed */
  | { kind: 'grammar-level-changed'; id: string; level: GrammarLevelName }
  /** the reading goal he set in Settings or asked the tutor for; `goal` is null when he cleared it */
  | { kind: 'goal-changed'; goal: Goal | null }
  /** the grammar approach he chose in Settings or asked the tutor for; `approach` is its id in src/approaches/ */
  | { kind: 'approach-changed'; approach: string }
  /** he told the idea sheet of grammar idea `id` Got it ('got-it': it is on the frontier, due tomorrow) or I know this ('known': solid, the 30-day step) */
  | { kind: 'idea-taught'; id: string; outcome: 'got-it' | 'known' }
  /** New words at (Settings > New words, 'pickerGrammar') was moved by how his grammar reviews went: `level` is where it is now, `how` whether he said Yes ('ask') or Move it was Auto (src/review/pickerMove.ts) */
  | { kind: 'picker-level-moved'; level: 'solid' | 'frontier'; how: 'ask' | 'auto' }
  /** a grammar placement ended (src/PlacementScreen.tsx): what it found, over the ideas the goal needs; `goal` is the saved goal text, '' for none */
  | { kind: 'placement-done'; goal: string; approach: string; solid: number; frontier: number; notYet: number; untested: number }
  /** feedback reached the factory (the mill answered 'sent'); `feedback` is what it was, today only 'grammar-approach' (the Ask for another approach sheet) */
  | { kind: 'feedback-sent'; feedback: 'grammar-approach' };

export type EventKind = AppEvent['kind'];
export type EventOf<K extends EventKind> = Extract<AppEvent, { kind: K }>;
type Listener<K extends EventKind> = (event: EventOf<K>) => void;

const listeners = new Map<EventKind, Set<Listener<EventKind>>>();
const last = new Map<EventKind, AppEvent>();
const everyListeners = new Set<(event: AppEvent) => void>();

/** Tells every listener of `event.kind`, in the order they subscribed. A listener that throws is logged and the
 * others still hear it. */
export function publish(event: AppEvent): void {
  last.set(event.kind, event);
  const calls = [...(listeners.get(event.kind) ?? [])].map((l) => () => (l as Listener<EventKind>)(event));
  for (const every of [...everyListeners]) calls.push(() => every(event));
  for (const call of calls) {
    try {
      call();
    } catch (error) {
      console.error(`event listener for ${event.kind} threw`, error);
    }
  }
}

/** Calls `listener` on each later event of any kind, after the listeners of its kind; returns the unsubscribe. For things that
 * count what happens (src/tips/usageLog.ts), not for screens. */
export function subscribeAll(listener: (event: AppEvent) => void): () => void {
  const entry = (event: AppEvent) => listener(event);
  everyListeners.add(entry);
  return () => void everyListeners.delete(entry);
}

/** Calls `listener` on each later event of `kind`; returns the unsubscribe. It is not called with an event
 * published before (ask `latest` for that). */
export function subscribe<K extends EventKind>(kind: K, listener: Listener<K>): () => void {
  // A new entry per call, so subscribing the same function twice is two subscriptions.
  const entry = ((event) => listener(event as EventOf<K>)) as Listener<EventKind>;
  const set = listeners.get(kind) ?? new Set();
  set.add(entry);
  listeners.set(kind, set);
  return () => void set.delete(entry);
}

/** The last event published of `kind`, or undefined if none has been. */
export function latest<K extends EventKind>(kind: K): EventOf<K> | undefined {
  return last.get(kind) as EventOf<K> | undefined;
}

/** Forgets every listener and every kept event: for tests. */
export function clearBus(): void {
  listeners.clear();
  everyListeners.clear();
  last.clear();
}

/** Calls `listener` on each event of `kind` while the component is mounted. The latest `listener` is called, so
 * it needs no useCallback. */
export function useEvent<K extends EventKind>(kind: K, listener: Listener<K>): void {
  const current = useRef(listener);
  useEffect(() => {
    current.current = listener;
  });
  useEffect(() => subscribe(kind, (event) => current.current(event)), [kind]);
}

/** The last event of `kind`, re-rendering when another comes: a screen that mounts late starts from it. */
export function useLatest<K extends EventKind>(kind: K): EventOf<K> | undefined {
  return useSyncExternalStore(
    (notify) => subscribe(kind, notify),
    () => latest(kind),
    () => latest(kind),
  );
}
