// src/WordSheet.tsx — the bottom sheet a tapped word opens: the Greek word as it stands, its transliteration,
// lemma, parsing in plain words, gloss and Strong's. Closes by a tap outside, a swipe down on its handle,
// the Done button or Escape.
import { type Chapter, type GreekWord, wordGloss, wordLemma, wordParse } from './data/chapter';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

/** What was tapped: Greek words, and the English they stand for. `english` is the tapped chunk, or a Greek word's own chunk. */
export interface Lookup {
  words: GreekWord[];
  english?: string;
  /** true when the English was what he tapped (the sheet then heads with it) */
  fromEnglish: boolean;
}

function Fact({ label, children, testId, lang }: { label: string; children: string; testId: string; lang?: string }) {
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-20 shrink-0 text-sm text-muted">{label}</dt>
      <dd data-testid={testId} lang={lang} className={`min-w-0 break-words ${lang ? 'font-greek text-xl' : 'text-base'}`}>
        {children}
      </dd>
    </div>
  );
}

function WordCard({ chapter, word, english }: { chapter: Chapter; word: GreekWord; english?: string }) {
  return (
    <section className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <p data-testid="sheet-word" lang="grc" className="min-w-0 break-words font-greek text-4xl font-bold">
          {word.t}
        </p>
        <SpeakButton text={word.t} id={`word:${word.t}`} label="Hear it" kind="speaker" className="shrink-0" />
      </div>
      <p data-testid="sheet-translit" className="text-base text-muted">
        {word.tr}
      </p>
      <dl className="mt-2">
        <Fact label="Lemma" testId="sheet-lemma" lang="grc">
          {wordLemma(word)}
        </Fact>
        <Fact label="Parsing" testId="sheet-parse">
          {wordParse(chapter, word)}
        </Fact>
        <Fact label="Meaning" testId="sheet-gloss">
          {wordGloss(chapter, word)}
        </Fact>
        <Fact label="Strong's" testId="sheet-strongs">
          {word.s}
        </Fact>
        {english ? (
          <Fact label="English" testId="sheet-english">
            {english}
          </Fact>
        ) : null}
      </dl>
    </section>
  );
}

export function WordSheet({ chapter, lookup, onClose }: { chapter: Chapter; lookup: Lookup; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Word"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative rounded-t-2xl border-t border-line bg-surface"
      >
        <div
          data-testid="sheet-handle"
          {...handle}
          className="flex min-h-12 touch-none items-center justify-between gap-3 px-4 pt-2"
        >
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button
            type="button"
            ref={focusOnMount}
            onClick={onClose}
            className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent"
          >
            Done
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-3">
          {lookup.fromEnglish && lookup.english ? (
            <p className="mb-3 pr-14 text-lg text-muted">
              <span className="sr-only">English: </span>“{lookup.english}”
            </p>
          ) : null}
          {lookup.words.map((w, i) => (
            <WordCard key={i} chapter={chapter} word={w} english={lookup.fromEnglish ? undefined : lookup.english} />
          ))}
        </div>
      </div>
    </div>
  );
}
