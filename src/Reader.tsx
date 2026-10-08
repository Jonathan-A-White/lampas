// src/Reader.tsx — Romans 8 verse by verse. The header switches English (the MSB) | Greek (Byzantine); every
// word is tappable and opens the word sheet; a verse number selects the verse. In English a second switch,
// Weave (Off | Solid words), shows the Greek of his solid words in place of their English (src/data/weave.ts).
// A selected verse shows its kept tutor answers and the Ask box (src/Ask.tsx). The selection, the view and the weave
// are told to the rest of the app on the event bus (src/events/bus.ts, docs/events.md); the Reader reads the selection back from it.
// The chapter comes from /data/rom/8.json (precached), the switches are kept in the settings store.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnswerCards, AskBox } from './Ask';
import { type Chapter, type EnglishChunk, type GreekWord, type Verse, loadChapter } from './data/chapter';
import { getReaderView, getWeave, listSolidLemmas, setReaderView, setWeave, type ReaderView, type Weave } from './data/repositories';
import { weaveVerse, type Woven } from './data/weave';
import { BuildVersion } from './BuildVersion';
import { latest, publish, useLatest } from './events/bus';
import { navigate, readerOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useAsks } from './useAsks';
import { HeaderButton } from './ScreenHeader';
import { SpeakButton } from './speech/SpeakButton';
import { WordSheet, type Lookup } from './WordSheet';

const BOOK = 'rom';
const CHAPTER = 8;
const TITLE = 'Romans 8';
// 44 px (--lp-tap) minus 1 em, halved, top and bottom. Every face's content area is taller than 1 em (Gentium Plus
// about 1.11 em, a phone's sans about 1.1 em), so an inline word is never under 44 px whatever the font, and the line
// box stays --lp-tap tall, so the spare pixels cost no layout.
const TAP_PAD = 'py-[calc((var(--lp-tap)-1em)/2)]';

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. */
function Tap({ onTap, lang, className, children, ...data }: {
  onTap: () => void;
  lang?: string;
  className?: string;
  children: string;
  'data-chunk'?: string;
  'data-woven'?: string;
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

const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

function WeaveSwitch({ weave }: { weave: Weave }) {
  const choice = (value: Weave, label: string) => (
    <button
      type="button"
      aria-pressed={weave === value}
      onClick={() => void setWeave(value)}
      className={`min-h-11 min-w-11 rounded-lg px-3 text-base font-medium ${weave === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Weave" className="flex shrink-0 rounded-xl border border-line p-0.5">
      {choice('off', 'Off')}
      {choice('solid', 'Solid words')}
    </div>
  );
}

function VerseView({ verse, view, woven, selected, onSelect, onLook }: {
  verse: Verse;
  view: ReaderView;
  /** per English chunk, the Greek words shown in its place or null; null for the whole verse when the weave is off */
  woven: Woven[] | null;
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
              <Tap key={i} data-word={String(i)} className={TAP_PAD} onTap={() => lookGreek(w)}>
                {w.t}
              </Tap>
            ))
          : verse.e.map((c, i) => {
              const words = woven?.[i];
              return words ? (
                <Tap
                  key={i}
                  data-chunk={String(i)}
                  data-woven=""
                  lang="grc"
                  className={`font-greek text-[length:var(--lp-greek-size)] text-accent ${TAP_PAD}`}
                  onTap={() => lookEnglish(c)}
                >
                  {words.map((w) => w.t).join(' ')}
                </Tap>
              ) : (
                <Tap key={i} data-chunk={String(i)} className={`${TAP_PAD} ${c.s ? 'italic' : ''}`} onTap={() => lookEnglish(c)}>
                  {c.t}
                </Tap>
              );
            })}
      </span>
      <SpeakButton
        text={verse.g.map((w) => w.t).join(' ')}
        id={`verse:${verse.n}`}
        label="Hear the verse"
        kind="play"
        className="align-baseline font-sans"
      />
    </p>
  );
}

export function Reader() {
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // What the address said when the reader opened (a reopen, Back to an earlier place): the selected verse, and the view
  // and weave to put back in the settings. The address is the place; the settings follow it.
  const [opened] = useState(() => readerOf(window.location.hash));
  const wantView = useRef(opened.view);
  const wantWeave = useRef(opened.weave);
  const scrollRef = useScrollMemory('reader');
  const address = useAddress();
  const current = useRef({ view, weave });
  useEffect(() => {
    current.current = { view, weave };
  });
  const selectedEvent = useLatest('verse-selected');
  const selected = selectedEvent?.chapter === CHAPTER ? selectedEvent.verse : null;
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const { asks, ask } = useAsks(BOOK, CHAPTER, TITLE);
  // The verse he last tapped: its Ask box scrolls into view. A selection put back by a reopen or Back does not, so it
  // leaves the text where the scroll memory put it.
  const [tapped, setTapped] = useState<number | null>(null);
  const selectVerse = useCallback(
    (n: number) => {
      setTapped(selected === n ? null : n);
      publish({ kind: 'verse-selected', chapter: CHAPTER, verse: selected === n ? null : n });
    },
    [selected],
  );
  const closeSheet = useCallback(() => setLookup(null), []);
  const weaving = view === 'english' && weave === 'solid';
  const woven = useMemo(
    () => (chapter && weaving ? chapter.verses.map((v) => weaveVerse(v, solid ?? EMPTY_LEMMAS)) : null),
    [chapter, weaving, solid],
  );
  const wovenCount = woven ? woven.reduce((n, w) => n + w.filter(Boolean).length, 0) : 0;

  // The selection is not kept when the reader goes away; the bus holds it only while the reader is on screen.
  useEffect(() => {
    const verse = opened.chapter === undefined || opened.chapter === CHAPTER ? opened.verse ?? null : null;
    publish({ kind: 'verse-selected', chapter: CHAPTER, verse });
    return () => publish({ kind: 'verse-selected', chapter: CHAPTER, verse: null });
  }, [opened]);
  // Back or Forward to another entry of the reader (the verse, view or weave of that entry) puts that entry's state back.
  useEffect(() => {
    const here = readerOf(address);
    const verse = here.chapter === undefined || here.chapter === CHAPTER ? here.verse ?? null : null;
    if ((latest('verse-selected')?.verse ?? null) !== verse) publish({ kind: 'verse-selected', chapter: CHAPTER, verse });
    const { view: shown, weave: woven } = current.current;
    if (here.view && shown && here.view !== shown) void setReaderView(here.view);
    if (here.weave && woven && here.weave !== woven) void setWeave(here.weave);
  }, [address]);
  useEffect(() => {
    if (!view) return;
    if (wantView.current && wantView.current !== view) {
      void setReaderView(wantView.current);
      return;
    }
    wantView.current = undefined;
    publish({ kind: 'view-changed', view });
  }, [view]);
  useEffect(() => {
    if (!weave) return;
    if (wantWeave.current && wantWeave.current !== weave) {
      void setWeave(wantWeave.current);
      return;
    }
    wantWeave.current = undefined;
    publish({ kind: 'weave-changed', weave });
  }, [weave]);

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
      {view === 'english' && weave ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-2 py-1">
          <WeaveSwitch weave={weave} />
          {woven ? (
            <p data-testid="weave-count" className="min-w-0 text-right text-sm text-muted">
              {wovenCount} {wovenCount === 1 ? 'word' : 'words'} in Greek
            </p>
          ) : null}
        </div>
      ) : null}
      <main ref={scrollRef} data-reader data-view={view} data-weave={weave} className="screen min-h-0 flex-1 px-1 pt-2">
        <div>
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
            {chapter.verses.map((v, vi) => (
              <Fragment key={v.n}>
                <VerseView
                  verse={v}
                  view={view}
                  woven={woven?.[vi] ?? null}
                  selected={selected === v.n}
                  onSelect={() => selectVerse(v.n)}
                  onLook={setLookup}
                />
                {selected === v.n ? (
                  <>
                    <AnswerCards verse={v.n} book={BOOK} chapter={CHAPTER} />
                    <AskBox chapter={chapter} asks={asks} onAsk={ask} reveal={tapped === v.n} />
                  </>
                ) : null}
              </Fragment>
            ))}
            <BuildVersion className="px-3 pt-6" />
            <div className="flex justify-center pb-4">
              <HeaderButton onClick={() => navigate('about')}>About</HeaderButton>
            </div>
          </>
        ) : (
          <p role="status" className="px-4 pt-6 text-center text-muted">
            Loading {TITLE}…
          </p>
        )}
        </div>
      </main>
      {chapter && lookup ? <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} /> : null}
    </>
  );
}
