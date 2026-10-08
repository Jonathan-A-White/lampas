// src/GrammarSheet.tsx — the sheet a grammar word of a word's Parsing opens (mw-5r3p30.35), over the word sheet: the term, a plain
// explanation, how it shows in Koine Greek, related terms, up to three examples from the chapter (each opens its own word
// sheet), and at the bottom I know this (kept on the phone; the word sheet then shows the term plain) and Ask the tutor.
import { type Chapter, type GreekWord, wordGloss } from './data/chapter';
import { conceptOf } from './data/grammar-concepts';
import { grammarExamples } from './data/grammarExamples';
import { focusOnMount } from './ui/focus';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { markTermKnown } from './useKnownTerms';

const BUTTON = 'min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-base font-medium';

export function GrammarSheet({ chapter, term, word, known, onClose, onTerm, onWord, onAsk }: {
  chapter: Chapter;
  term: string;
  /** the word whose sheet the term was tapped on: it is left out of the examples */
  word: GreekWord;
  /** whether he marked this term I know this */
  known: boolean;
  onClose: () => void;
  /** a related term was tapped */
  onTerm: (term: string) => void;
  /** an example was tapped */
  onWord: (word: GreekWord) => void;
  /** Ask the tutor; the button is left out when the screen cannot send it anywhere */
  onAsk?: (term: string) => void;
}) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  const concept = conceptOf(term);
  const examples = grammarExamples(chapter, term, word);
  const title = `${chapter.book} ${chapter.chapter}`;

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div data-testid="grammar-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Grammar"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="grammar-handle" {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" ref={focusOnMount} onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
          <h2 className="pr-14 text-2xl font-bold">{term}</h2>
          {concept ? (
            <>
              <p data-testid="grammar-explanation" className="mt-2 text-lg">
                {concept.explanation}
              </p>
              <p className="mt-3 text-sm text-muted">In Greek</p>
              <p data-testid="grammar-greek" className="text-lg">
                {concept.greek}
              </p>
              {concept.related.length ? (
                <div role="group" aria-label="Related terms" className="mt-3">
                  <p className="text-sm text-muted">Related</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {concept.related.map((other) => (
                      <button
                        key={other}
                        type="button"
                        onClick={() => onTerm(other)}
                        className="min-h-11 rounded-lg border border-line px-3 text-base text-accent active:bg-line"
                      >
                        {other}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="mt-3">
            <p className="text-sm text-muted">Examples from {title}</p>
            {examples.length ? (
              <ul className="space-y-2 pt-1">
                {examples.map(({ word: example, verse }) => (
                  <li key={`${verse}:${example.t}`}>
                    <button
                      type="button"
                      data-testid="grammar-example"
                      data-form={example.t}
                      data-lemma={example.l}
                      onClick={() => onWord(example)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-1 text-left active:bg-line"
                    >
                      <span lang="grc" className="font-greek text-2xl">
                        {example.t}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-base text-muted">{wordGloss(chapter, example)}</span>
                      <span className="shrink-0 text-sm text-muted">
                        {chapter.chapter}:{verse}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pt-1 text-base text-muted">No word of {title} has this in its parsing.</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))]">
          <button
            type="button"
            aria-pressed={known}
            onClick={() => void markTermKnown(term, !known)}
            className={`${BUTTON} ${known ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'}`}
          >
            {known ? <span aria-hidden="true">✓ </span> : null}I know this
          </button>
          {onAsk ? (
            <button type="button" onClick={() => onAsk(term)} className={`${BUTTON} border-line text-accent active:bg-line`}>
              Ask the tutor
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
