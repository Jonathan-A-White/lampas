// src/events/kinds/talk.ts — the event kinds of the tutor talk and feedback. bus.ts composes AppEvent from every kinds file; docs/events.md lists each kind.

export type TalkEvent =
  /** he tapped Grammar or Sound it out on a word's sheet (Help with this word): the Talk sheet opens on `verse` with the question
   * about `form` sent. `help` is what he wants help with ('word': the sheet's Ask the tutor, nothing in particular) */
  | { kind: 'word-help'; help: 'grammar' | 'sound' | 'word'; form: string; lemma: string; parse: string; chapter: number; verse: number }
  /** feedback reached the factory (the mill answered 'sent'); `feedback` is what it was: 'grammar-approach' (the Ask for another approach sheet), 'tutor-ask' (the tutor's Send this to the makers), 'book' (Ask for a book), 'library' (Ask the makers about these) or the kind of an Ask for more form: 'approach', 'text', 'translation' */
  | { kind: 'feedback-sent'; feedback: 'grammar-approach' | 'tutor-ask' | 'book' | 'library' | 'approach' | 'text' | 'translation' };
