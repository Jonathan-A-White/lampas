// src/Reader.tsx — Romans 8 verse by verse. The header switches English (the MSB) | Greek (Byzantine); every
// word is tappable and opens the word sheet; a verse number selects the verse. The gear opens Settings
// (src/SettingsScreen.tsx), where the Weave (Off | Solid words) is switched: with it on, the English view shows the
// Greek of his solid words in place of their English (src/data/weave.ts).
// Settings also holds the Layout (Verse by verse | Paragraph, src/layout/layouts.ts cuts the verses into blocks) and Section
// headings (On | Off): the MSB's heading (verses[].h) is drawn above its block in either view, in English.
// A selected verse shows its reading check (src/ReadCheck.tsx: hold Read, read the verse aloud, the words to fix come back
// marked; in either view: the Greek view reads the verse's Greek) directly under it, so what the hold is doing is on
// screen while he holds; then its kept tutor answers and the Ask box (src/Ask.tsx). The selection, the view and the weave
// are told to the rest of the app on the event bus (src/events/bus.ts, docs/events.md); the Reader reads the selection back from it.
// The chapter comes from /data/rom/8.json (precached), the view and the weave are kept in the settings store.
import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnswerCards, AskBox } from './Ask';
import { ReadCheckPanel, VerseRead, type ReadHold } from './ReadCheck';
import { TalkBar, TalkSheet } from './Talk';
import { type Chapter, type EnglishChunk, type GreekWord, type Verse, loadChapter } from './data/chapter';
import {
  getLayout,
  getGreekPronunciation,
  getReaderView,
  getSectionHeadings,
  getWeave,
  listSolidLemmas,
  setReaderView,
  setWeave,
  talkRef,
  type ReaderView,
} from './data/repositories';
import { READER_CHAPTER } from './data/readerChapter';
import { weaveVerse, type Woven } from './data/weave';
import { BuildVersion } from './BuildVersion';
import { latest, publish, useLatest } from './events/bus';
import { blocksOf } from './layout/layouts';
import { pendingRequest, takeRequest } from './nav/readerRequest';
import { navigate, readerOf, useAddress } from './nav/route';
import { useScrollMemory } from './nav/scrollMemory';
import { useAsks } from './useAsks';
import { useReadChecks } from './useReadChecks';
import { useTalk } from './useTalk';
import { helpQuestion, scopeTitle, termQuestion } from './services/talk';
import { useVoice } from './useVoice';
import { useHoldPress } from './ui/holdPress';
import { HeaderButton } from './ScreenHeader';
import { pauseReading, planOf, startAnswer, startReading, stopReading, updatePlan, useReading } from './speech/readAloud';
import { answerRuns, syllableRuns } from './speech/answerRuns';
import { ReadFromButton, ReadingBar, VersePlay } from './speech/ReadControls';
import { speakWord, warmVoices } from './speech/greek';
import type { SpeechLanguage } from './speech/languages';
import { WordSheet, type Lookup, type TermAsk, type WordHelp } from './WordSheet';

const { book: BOOK, chapter: CHAPTER, title: TITLE } = READER_CHAPTER;
// 44 px (--lp-tap) minus 1 em, halved, top and bottom. Every face's content area is taller than 1 em (Gentium Plus
// about 1.11 em, a phone's sans about 1.1 em), so an inline word is never under 44 px whatever the font, and the line
// box stays --lp-tap tall, so the spare pixels cost no layout.
const TAP_PAD = 'py-[calc((var(--lp-tap)-1em)/2)]';

/** How long a finger must stay on a word to say it, and how far it may wander meanwhile. */
const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

/** A word he can tap: a span with role button and no chrome. The caller pads it to a 44 px tap height (an inline box
 * is as tall as its font's content area, so the padding is 44 px minus that, which differs by face). The trailing
 * space is inside so the gap between two words is tappable too. A finger held on it for half a second (`onLongPress`)
 * is a press, not a tap: the click that follows is dropped, and so is one after the finger wandered over 10 px. The
 * word never selects text and never raises the phone's callout menu, so the hold is free for the press. */
function Tap({ onTap, onLongPress, lang, className, children, ...data }: {
  onTap: () => void;
  onLongPress: () => void;
  lang?: string;
  className?: string;
  children: string;
  'data-chunk'?: string;
  'data-woven'?: string;
  'data-word'?: string;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const from = useRef({ x: 0, y: 0 });
  // the press that is going on was a long press or a drag: its click is not a tap
  const notATap = useRef(false);
  const stopTimer = () => clearTimeout(timer.current);
  useEffect(() => stopTimer, []);
  return (
    <span
      role="button"
      tabIndex={0}
      lang={lang}
      {...data}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        notATap.current = false;
        from.current = { x: e.clientX, y: e.clientY };
        stopTimer();
        timer.current = setTimeout(() => {
          notATap.current = true;
          navigator.vibrate?.(10);
          onLongPress();
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(e) => {
        if (Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) <= LONG_PRESS_SLOP_PX) return;
        notATap.current = true;
        stopTimer();
      }}
      onPointerUp={stopTimer}
      onPointerCancel={stopTimer}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (notATap.current) notATap.current = false;
        else onTap();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer select-none [-webkit-touch-callout:none] rounded px-[0.1em] active:bg-line ${className ?? ''}`}
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
      className={`min-h-11 min-w-11 rounded-lg px-3 chrome-text font-medium ${view === value ? 'bg-accent text-accent-fg' : 'text-fg'}`}
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

/** What a held verse number does: open the talk about that verse and listen, send on release, drop on a slide-away. */
interface VerseTalk {
  onHold: (n: number) => void;
  onRelease: () => void;
  onDrop: () => void;
}

/** The button with a verse's number: a tap selects the verse, a hold (half a second) talks about it. */
function VerseNumber({ n, selected, onSelect, talk, className, children }: {
  n: number;
  selected: boolean;
  onSelect: () => void;
  talk: VerseTalk;
  className: string;
  children: ReactNode;
}) {
  const press = useHoldPress({ onTap: onSelect, onHold: () => talk.onHold(n), onRelease: talk.onRelease, onDrop: talk.onDrop });
  return (
    <button
      type="button"
      {...press}
      aria-label={`Verse ${n}`}
      aria-pressed={selected}
      className={`select-none [-webkit-touch-callout:none] ${className}`}
    >
      {children}
    </button>
  );
}

interface VerseProps {
  verse: Verse;
  view: ReaderView;
  /** per English chunk, the Greek words shown in its place or null; null for the whole verse when the weave is off */
  woven: Woven[] | null;
  selected: boolean;
  /** this verse is the one being read aloud */
  reading: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
  /** the Read button of this verse (English view only) */
  read: ReadHold | null;
}

/** The words of one verse, every one tappable: the Greek in Greek order, or the English chunks (woven or not). */
function VerseText({ verse, view, woven, onLook }: Pick<VerseProps, 'verse' | 'view' | 'woven' | 'onLook'>) {
  const lookGreek = (w: GreekWord) =>
    onLook({ words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false });
  const lookEnglish = (c: EnglishChunk) => onLook({ words: c.g.map((i) => verse.g[i]), english: c.t, fromEnglish: true });
  // A long press says the word alone, in its own language, straight from the press (docs/pwa-best-practices.md section 12).
  // A reading under way is paused first: it would have the speech taken from it anyway.
  const say = (text: string, language: SpeechLanguage) => {
    pauseReading();
    if (speakWord(text, language)) publish({ kind: 'word-spoken', text, language, verse: verse.n });
  };
  return (
    <span data-text>
      {view === 'greek'
        ? verse.g.map((w, i) => (
            <Tap key={i} data-word={String(i)} className={TAP_PAD} onTap={() => lookGreek(w)} onLongPress={() => say(w.t, 'greek')}>
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
                onLongPress={() => say(words.map((w) => w.t).join(' '), 'greek')}
              >
                {words.map((w) => w.t).join(' ')}
              </Tap>
            ) : (
              <Tap key={i} data-chunk={String(i)} className={`${TAP_PAD} ${c.s ? 'italic' : ''}`} onTap={() => lookEnglish(c)} onLongPress={() => say(c.t, 'english')}>
                {c.t}
              </Tap>
            );
          })}
    </span>
  );
}

const textClass = (view: ReaderView) =>
  view === 'greek' ? 'font-greek text-[length:var(--lp-greek-size)]' : 'font-sans text-[length:var(--lp-english-size)]';

const READING_CLASS = 'bg-accent/30';


/** Verse by verse: one verse per line, its number a button before it. */
function VerseView(props: VerseProps) {
  const { verse, view, selected, reading, onSelect, onPlay, talk, read } = props;
  return (
    <p
      data-verse={verse.n}
      data-selected={selected}
      data-reading={reading || undefined}
      lang={view === 'greek' ? 'grc' : 'en'}
      className={`mb-1 break-words rounded-xl px-2 leading-(--lp-leading) ${reading ? READING_CLASS : selected ? 'bg-accent/15' : ''} ${textClass(view)}`}
    >
      <VerseNumber
        n={verse.n}
        selected={selected}
        onSelect={onSelect}
        talk={talk}
        className="inline-block min-h-(--lp-tap) min-w-(--lp-tap) pr-1 text-left align-baseline font-sans text-sm font-semibold leading-(--lp-tap) text-muted"
      >
        {verse.n}
      </VerseNumber>
      <VerseText {...props} />
      <VersePlay playing={reading} onPlay={onPlay} className="align-baseline font-sans" />
      {read ? <VerseRead verse={verse.n} hold={read} className="align-baseline font-sans" /> : null}
    </p>
  );
}

/** Paragraph: the verses of one MSB paragraph run on, each number a small superscript. The button is still 44 px square
 * (its side margins pull the neighbours back in), and a verse is still selected by its number. The play button of a
 * verse shows only while it is selected, so a paragraph reads as running text. */
function ParagraphView({ verses, view, woven, selected, reading, onSelect, onPlay, onLook, talk, readOf }: {
  verses: Verse[];
  view: ReaderView;
  woven: (Woven[] | null)[];
  selected: number | null;
  /** the verse being read aloud */
  reading: number | null;
  onSelect: (n: number) => void;
  onPlay: (n: number) => void;
  onLook: (lookup: Lookup) => void;
  talk: VerseTalk;
  /** the Read button of a verse, or null (Greek view) */
  readOf: (verse: Verse) => ReadHold | null;
}) {
  return (
    <p data-paragraph lang={view === 'greek' ? 'grc' : 'en'} className={`mb-2 break-words px-2 leading-(--lp-leading) ${textClass(view)}`}>
      {verses.map((verse, i) => (
        <span key={verse.n} data-verse={verse.n} data-selected={selected === verse.n} data-reading={reading === verse.n || undefined} className={`rounded-xl ${reading === verse.n ? READING_CLASS : selected === verse.n ? 'bg-accent/15' : ''}`}>
          <VerseNumber
            n={verse.n}
            selected={selected === verse.n}
            onSelect={() => onSelect(verse.n)}
            talk={talk}
            className="-mx-3 inline-block min-h-(--lp-tap) min-w-(--lp-tap) text-center align-baseline font-sans leading-(--lp-tap)"
          >
            <sup className="text-xs font-semibold text-muted">{verse.n}</sup>
          </VerseNumber>
          <VerseText verse={verse} view={view} woven={woven[i]} onLook={onLook} />
          {selected === verse.n || reading === verse.n ? (
            <>
              <VersePlay playing={reading === verse.n} onPlay={() => onPlay(verse.n)} className="align-baseline font-sans" />
              {readOf(verse) ? <VerseRead verse={verse.n} hold={readOf(verse) as ReadHold} className="align-baseline font-sans" /> : null}
            </>
          ) : null}
        </span>
      ))}
    </p>
  );
}

/** A section heading: the MSB's own English, whichever view is on. */
function SectionHeading({ text }: { text: string }) {
  return (
    <h2 data-heading lang="en" className="mb-1 mt-5 px-2 font-sans text-lg font-semibold leading-snug text-accent">
      {text}
    </h2>
  );
}

export function Reader() {
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const layout = useLiveQuery(getLayout, []);
  const headings = useLiveQuery(getSectionHeadings, []);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // What the address said when the reader opened (a reopen, Back to an earlier place): the selected verse, and the view
  // and weave to put back in the settings. The address is the place; the settings follow it.
  const [opened] = useState(() => readerOf(window.location.hash));
  const wantView = useRef(opened.view);
  // The weave is switched in Settings, so a reader reached by Back from there must not put an older address's weave
  // back: once the bus has told a weave, the saved setting is the truth and the address only follows it.
  const wantWeave = useRef(latest('weave-changed') ? undefined : opened.weave);
  const scrollRef = useScrollMemory('reader');
  const main = useRef<HTMLElement | null>(null);
  const mainRef = useCallback(
    (el: HTMLElement | null) => {
      main.current = el;
      scrollRef(el);
    },
    [scrollRef],
  );
  const reading = useReading();
  const address = useAddress();
  const current = useRef({ view });
  useEffect(() => {
    current.current = { view };
  });
  const selectedEvent = useLatest('verse-selected');
  const selected = selectedEvent?.chapter === CHAPTER ? selectedEvent.verse : null;
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const { asks, ask } = useAsks(BOOK, CHAPTER, TITLE);
  // A request from another screen (the Parsing drill's links) is met once, as the Reader opens: the Talk sheet on that verse,
  // or the Ask box on it holding the question.
  const [request] = useState(() => {
    const pending = pendingRequest();
    return pending?.chapter === CHAPTER ? pending : undefined;
  });
  useEffect(() => {
    if (request) takeRequest(request);
  }, [request]);
  const [prefill, setPrefill] = useState(() => (request?.action === 'ask' ? { verse: request.verse, text: request.question } : null));
  const pronunciation = useLiveQuery(getGreekPronunciation, []);
  const checks = useReadChecks(BOOK, CHAPTER, TITLE, view ?? 'english', pronunciation);
  // The Talk sheet: undefined is closed, a number the verse it was opened on, null the chapter. An answer that arrives while
  // its conversation is open on the sheet is read aloud.
  const [talkAbout, setTalkAbout] = useState<number | null | undefined>(() => (request?.action === 'talk' ? request.verse : undefined));
  const openTalk = useRef<string | null>(null);
  useEffect(() => {
    openTalk.current = talkAbout === undefined ? null : talkRef(BOOK, CHAPTER, talkAbout);
  }, [talkAbout]);
  // Push-to-talk (src/useVoice.ts): what he says goes as the turn of the conversation the sheet is open on.
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const holding = useRef(false);
  useEffect(() => {
    holding.current = voice.listening;
  });
  const { states: talkStates, say } = useTalk(BOOK, CHAPTER, (ref, id, answer, info) => {
    // an answer that comes while he holds waits: page audio can take the microphone from the recogniser
    if (openTalk.current !== ref || holding.current) return;
    // Sound it out: the word was said before the answer; now each syllable it lists, slowly, one after another.
    if (info.focus?.kind === 'sound' && info.syllables?.length) startAnswer(id, syllableRuns(info.syllables));
    else startAnswer(id, answerRuns(answer));
  });
  // The verse he last tapped: its Ask box scrolls into view. A selection put back by a reopen or Back does not, so it
  // leaves the text where the scroll memory put it.
  const [tapped, setTapped] = useState<number | null>(() => (request?.action === 'ask' ? request.verse : null));
  const selectVerse = useCallback(
    (n: number) => {
      setTapped(selected === n ? null : n);
      publish({ kind: 'verse-selected', chapter: CHAPTER, verse: selected === n ? null : n });
    },
    [selected],
  );
  const closeSheet = useCallback(() => setLookup(null), []);
  const talkScope = chapter && talkAbout !== undefined ? { title: TITLE, chapter, verse: chapter.verses.find((v) => v.n === talkAbout) ?? null } : null;
  useEffect(() => {
    sayAbout.current = (message) => {
      if (talkScope) say(talkScope, message);
    };
  });
  // A hold opens the sheet about `about` and listens, unless that conversation is still waiting for its answer.
  const holdTalk = useCallback(
    (about: number | null) => {
      setTalkAbout(about);
      const state = talkStates[talkRef(BOOK, CHAPTER, about)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      voice.press();
    },
    [talkStates, voice],
  );
  // Help with this word (the word sheet's Grammar | Sound it out): the Talk sheet on the word's verse, the first question sent.
  // Sound it out says the word, slowly, now (straight from the tap); a conversation still waiting for its answer is only shown.
  const helpWithWord = useCallback(
    (help: WordHelp) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === help.verse) ?? null;
      const scope = { title: TITLE, chapter, verse };
      const focus = { form: help.form, lemma: help.lemma, parse: help.parse, kind: help.kind };
      publish({ kind: 'word-help', help: help.kind, form: focus.form, lemma: focus.lemma, parse: focus.parse, chapter: CHAPTER, verse: help.verse });
      voice.abort();
      setTalkAbout(help.verse);
      const state = talkStates[talkRef(BOOK, CHAPTER, help.verse)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      if (help.kind === 'sound') speakWord(help.form, 'greek', true);
      say(scope, helpQuestion(focus, scopeTitle(scope)), focus);
    },
    [chapter, talkStates, voice, say],
  );
  // Ask the tutor on a Grammar sheet: the Talk sheet on the verse of the word the term was tapped on, the first question sent.
  const askAboutTerm = useCallback(
    (ask: TermAsk) => {
      if (!chapter) return;
      const verse = chapter.verses.find((v) => v.n === ask.verse) ?? null;
      const scope = { title: TITLE, chapter, verse };
      voice.abort();
      setTalkAbout(ask.verse);
      const state = talkStates[talkRef(BOOK, CHAPTER, ask.verse)];
      if (state?.phase === 'sending' || state?.phase === 'waiting') return;
      say(scope, termQuestion(ask.term, scopeTitle(scope)), { term: ask.term, kind: 'grammar-term' });
    },
    [chapter, talkStates, voice, say],
  );
  const verseTalk: VerseTalk = { onHold: holdTalk, onRelease: () => void voice.release(), onDrop: voice.abort };
  // The Read button of a verse: holding it on a verse that is not selected selects it, so its result shows below it.
  const readOf = (verse: Verse): ReadHold => {
    const phase = checks.states[verse.n]?.phase;
    return {
      onPress: () => {
        if (selected !== verse.n) publish({ kind: 'verse-selected', chapter: CHAPTER, verse: verse.n });
        checks.press(verse);
      },
      onRelease: checks.release,
      onDrop: checks.drop,
      disabled: phase === 'sending' || phase === 'waiting',
    };
  };
  const weaving = view === 'english' && weave === 'solid';
  const woven = useMemo(
    () => (chapter && weaving ? chapter.verses.map((v) => weaveVerse(v, solid ?? EMPTY_LEMMAS)) : null),
    [chapter, weaving, solid],
  );
  // What is read is what is shown: the plan follows the view and the weave.
  const plan = useMemo(() => (chapter && view ? planOf(chapter.verses, view, woven) : null), [chapter, view, woven]);
  const readFrom = useCallback(
    (from: number, continuous: boolean) => {
      if (plan) startReading({ chapter: CHAPTER, plan, from, continuous });
    },
    [plan],
  );
  const chapterReading = reading.status !== 'idle' && reading.answer === null;
  const readingVerse = chapterReading ? reading.verse : null;
  const blocks = useMemo(() => (chapter && layout ? blocksOf(chapter.verses, layout) : []), [chapter, layout]);
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
    const { view: shown } = current.current;
    if (here.view && shown && here.view !== shown) void setReaderView(here.view);
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
    if (plan) updatePlan(plan);
  }, [plan]);
  // Leaving the reader stops the reading.
  useEffect(() => {
    void warmVoices();
    return () => stopReading();
  }, []);
  // The verse being read is kept in view, by moving this box and nothing else.
  useEffect(() => {
    const box = main.current;
    const el = readingVerse === null ? null : box?.querySelector<HTMLElement>(`[data-verse="${readingVerse}"]`);
    if (!box || !el) return;
    const margin = 16;
    const bar = box.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    if (rect.top < bar.top + margin || rect.bottom > bar.bottom - margin) box.scrollTop += rect.top - bar.top - margin;
  }, [readingVerse]);

  useEffect(() => {
    if (layout) publish({ kind: 'layout-changed', layout });
  }, [layout]);
  useEffect(() => {
    if (headings) publish({ kind: 'headings-changed', headings });
  }, [headings]);

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
      <header className="flex shrink-0 items-center gap-1 border-b border-line px-2 py-2">
        {/* While the chapter is read the header gives its room to Pause and Stop; the title stays for screen readers. */}
        <h1 className={`chrome-title min-w-0 truncate px-1 font-semibold ${chapterReading ? 'sr-only' : 'flex-1'}`}>{TITLE}</h1>
        {chapterReading ? <span className="flex-1" /> : null}
        {view ? <ViewSwitch view={view} /> : null}
        {plan ? <ReadFromButton from={selected} reading={reading} onRead={() => readFrom(selected ?? 1, true)} /> : null}
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('settings')}
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg text-accent active:bg-line"
        >
          <GearIcon />
        </button>
      </header>
      <ReadingBar reading={reading} />
      {woven ? (
        <p data-testid="weave-count" className="shrink-0 border-b border-line px-3 py-1 text-right text-sm text-muted">
          {wovenCount} {wovenCount === 1 ? 'word' : 'words'} in Greek
        </p>
      ) : null}
      <main ref={mainRef} data-reader data-view={view} data-weave={weave} data-layout={layout} data-headings={headings} className="screen min-h-0 flex-1 px-1 pt-2">
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
        ) : chapter && view && layout && headings ? (
          <>
            {blocks.map((block) => {
              const first = block[0];
              const wovenOf = (v: Verse) => woven?.[chapter.verses.indexOf(v)] ?? null;
              const withSelection = block.some((v) => v.n === selected);
              const pick = block.find((v) => v.n === selected);
              return (
                <Fragment key={first.n}>
                  {headings === 'on' && first.h ? <SectionHeading text={first.h} /> : null}
                  {layout === 'paragraph' ? (
                    <ParagraphView
                      verses={block}
                      view={view}
                      woven={block.map(wovenOf)}
                      selected={selected}
                      reading={readingVerse}
                      onSelect={selectVerse}
                      onPlay={(n) => readFrom(n, false)}
                      onLook={setLookup}
                      talk={verseTalk}
                      readOf={readOf}
                    />
                  ) : (
                    <VerseView
                      verse={first}
                      view={view}
                      woven={wovenOf(first)}
                      selected={selected === first.n}
                      reading={readingVerse === first.n}
                      onSelect={() => selectVerse(first.n)}
                      onPlay={() => readFrom(first.n, false)}
                      onLook={setLookup}
                      talk={verseTalk}
                      read={readOf(first)}
                    />
                  )}
                  {withSelection && selected !== null && pick ? (
                    <>
                      <ReadCheckPanel
                        verse={pick}
                        view={view}
                        book={BOOK}
                        chapter={CHAPTER}
                        checks={checks}
                        hold={readOf(pick)}
                        onRetry={() => checks.retry(pick)}
                      />
                      <AnswerCards verse={selected} book={BOOK} chapter={CHAPTER} />
                      <AskBox
                        chapter={chapter}
                        asks={asks}
                        onAsk={(verse, question) => {
                          setPrefill(null);
                          ask(verse, question);
                        }}
                        reveal={tapped === selected}
                        prefill={prefill}
                      />
                    </>
                  ) : null}
                </Fragment>
              );
            })}
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
      {chapter ? (
        <TalkBar
          hold={{
            onPress: stopReading,
            onTap: () => setTalkAbout(selected),
            onHold: () => holdTalk(selected),
            onRelease: () => void voice.release(),
            onDrop: voice.abort,
          }}
        />
      ) : null}
      {talkScope && talkAbout !== undefined ? (
        <TalkSheet
          scope={talkScope}
          talkRef={talkRef(BOOK, CHAPTER, talkAbout)}
          state={talkStates[talkRef(BOOK, CHAPTER, talkAbout)]}
          voice={voice}
          onSay={(message) => say(talkScope, message)}
          onHelp={helpWithWord}
          onAskTerm={askAboutTerm}
          onClose={() => {
            voice.abort();
            voice.clearNotice();
            setTalkAbout(undefined);
          }}
        />
      ) : null}
      {chapter && lookup ? <WordSheet chapter={chapter} lookup={lookup} onClose={closeSheet} onHelp={helpWithWord} onAskTerm={askAboutTerm} /> : null}
    </>
  );
}
