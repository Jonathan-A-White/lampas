// src/Reader.tsx — Romans 8 verse by verse. The header switches English (the MSB) | Greek (Byzantine); every
// word is tappable and opens the word sheet; a verse number selects the verse. The chapter comes from
// /data/rom/8.json (precached), the switch is kept in the settings store.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { type Chapter, type EnglishChunk, type GreekWord, type Verse, loadChapter } from './data/chapter';
import { getReaderView, setReaderView, type ReaderView } from './data/repositories';
import { navigate } from './nav/route';
import { HeaderButton } from './ScreenHeader';
import { WordSheet, type Lookup } from './WordSheet';

const BOOK = 'rom';
const CHAPTER = 8;
const TITLE = 'Romans 8';
// 44 px (--lp-tap) minus the face's content area, halved, top and bottom: Gentium Plus is about 1.18 em tall, a phone's sans about 1.1 em.
const GREEK_PAD = 'py-[calc((var(--lp-tap)-1.15em)/2)]';
const ENGLISH_PAD = 'py-[calc((var(--lp-tap)-1.1em)/2)]';

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. */
function Tap({ onTap, lang, className, children, ...data }: {
  onTap: () => void;
  lang?: string;
  className?: string;
  children: string;
  'data-chunk'?: string;
  'data-word'?: string;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      {...data}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer select-none rounded px-[0.1em] active:bg-line ${className ?? ''}`}
    >
      {children}{' '}
    </span>
  );
}

function ViewSwitch({ view }: { view: ReaderView }) {
  const choice = (value: ReaderView, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => void setReaderView(value)}
      className={`min-h-11 min-w-11 rounded-lg px-3 text-base font-medium ${view === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Language" className="flex shrink-0 rounded-xl border border-line p-0.5">
      {choice('english', 'English')}
      {choice('greek', 'Greek')}
    </div>
  );
}

function VerseView({ verse, view, selected, onSelect, onLook }: {
  verse: Verse;
  view: ReaderView;
  selected: boolean;
  onSelect: () => void;
  onLook: (lookup: Lookup) => void;
}) {
  const greek = view === 'greek';
  const lookGreek = (w: GreekWord) =>
    onLook({ words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false });
  const lookEnglish = (c: EnglishChunk) => onLook({ words: c.g.map((i) => verse.g[i]), english: c.t, fromEnglish: true });
  return (
    <p
      data-verse={verse.n}
      data-selected={selected}
      lang={greek ? 'grc' : 'en'}
      className={`mb-1 break-words rounded-xl px-2 leading-(--lp-tap) ${selected ? 'bg-accent/15' : ''} ${
        greek ? 'font-greek text-[length:var(--lp-greek-size)]' : 'font-sans text-[length:var(--lp-english-size)]'
      }`}
    >
      <button
        type="button"
        aria-label={`Verse ${verse.n}`}
        aria-pressed={selected}
        onClick={onSelect}
        className="inline-block min-h-(--lp-tap) min-w-(--lp-tap) pr-1 text-left align-baseline font-sans text-sm font-semibold leading-(--lp-tap) text-muted"
      >
        {verse.n}
      </button>
      <span data-text>
        {greek
          ? verse.g.map((w, i) => (
              <Tap key={i} data-word={String(i)} className={GREEK_PAD} onTap={() => lookGreek(w)}>
                {w.t}
              </Tap>
            ))
          : verse.e.map((c, i) => (
              <Tap key={i} data-chunk={String(i)} className={`${ENGLISH_PAD} ${c.s ? 'italic' : ''}`} onTap={() => lookEnglish(c)}>
                {c.t}
              </Tap>
            ))}
      </span>
    </p>
  );
}

export function Reader() {
  const view = useLiveQuery(getReaderView, []);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const closeSheet = useCallback(() => setLookup(null), []);

  useEffect(() => {
    let current = true;
    loadChapter(BOOK, CHAPTER).then(
      (c) => current && (setFailed(false), setChapter(c)),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-2">
        <div className="shrink-0">
          <HeaderButton onClick={() => navigate('words')}>Words</HeaderButton>
        </div>
        <h1 className="min-w-0 flex-1 text-center text-lg font-semibold">{TITLE}</h1>
        {view ? <ViewSwitch view={view} /> : null}
      </header>
      <main data-reader data-view={view} className="screen min-h-0 flex-1 px-1 pt-2">
        {failed ? (
          <div role="alert" className="px-4 pt-6 text-center">
            <p className="text-lg">Could not load {TITLE}.</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-4 min-h-12 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg"
            >
              Try again
            </button>
          </div>
        ) : chapter && view ? (
          <>
            {chapter.verses.map((v) => (
              <VerseView
                key={v.n}
                verse={v}
                view={view}
                selected={selected === v.n}
                onSelect={() => setSelected((n) => (n === v.n ? null : v.n))}
                onLook={setLookup}
              />
            ))}
            <p data-testid="build-version" className="break-words px-3 pt-6 text-center text-sm text-muted">
              Lampas {__APP_VERSION__}
            </p>
            <div className="flex justify-center pb-4">
              <HeaderButton onClick={() => navigate('about')}>About</HeaderButton>
            </div>
          </>
        ) : (
          <p role="status" className="px-4 pt-6 text-center text-muted">
            Loading {TITLE}…
          </p>
        )}
      </main>
      {chapter && lookup ? <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} /> : null}
    </>
  );
}
