// src/sermons/SermonReader.tsx — Lampas reads a text sermon aloud in its own sheet (mw-ecpivg5.2, docs/sermons.md 'The reader'): a row of a source the sermon index serves the words of (sermonText.ts TEXT_SOURCES), opened under
// Settings > Study resources > Sermons > Open web sermons in 'Lampas, read aloud', draws this sheet over the Sermons sheet: the title and the paragraphs the service's GET /v1/text answers, read at once in the phone's voice at his
// English speed (the one reading engine, src/speech/readAloud.ts, a paragraph to a 'verse' as a page of prose is read, src/PageActions.tsx). The paragraph being read is marked and kept in view; the controls are Play / Pause,
// Back and Forward a paragraph, Restart and Stop (Close ends it too); 'about N min left' is under the title. His paragraph is kept on this device per sermon (sermonText.ts keepPlace), and reopening goes on there.
// A browser that refuses speech without a tap leaves one big Play button; when the text cannot be had the sermon opens on the web and the sheet says so once. <SermonReaderHost /> is mounted once, in App.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onAndroid } from '../openInApp';
import { getSpeechRates } from '../data/repositories';
import { fetchSermonText } from '../services/sermons';
import { hasGreekVoice, hasVoice, onSpeechRefused, warmVoices } from '../speech/greek';
import { pageRuns } from '../speech/pageRuns';
import { getReading, pauseReading, resumeReading, startReading, stopReading, useListenCompleted, useReading, type PlanVerse } from '../speech/readAloud';
import { Icon } from '../speech/SpeakButton';
import { useNoDoor } from '../tutor/door';
import { useSheetBack } from '../ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from '../ui/sheetDrag';
import { oneTap } from '../ui/settle';
import { webHref } from './openWeb';
import { closeSermonText, forgetPlace, keepPlace, minutesLeft, parseText, readPlace, stepParagraph, timeLeftLine, useOpenedText, type OpenedText, type SermonText } from './sermonText';

/** The id the sermon's reading goes under (reading.answer): far below any stored answer's, a page's (PageActions) or a named one's (ReadAloud), so no Talk turn takes it for its own. */
export const SERMON_READING_ID = -2_500_000_000;

/** What the sheet says when the text cannot be had; the sermon opens on the web at the same time. */
export const NO_TEXT_NOTICE = 'Lampas could not get the words of this sermon, so it opens on the web.';

const BUTTON_BASE = 'inline-flex min-w-12 items-center justify-center gap-1 rounded-xl border border-line px-3 text-accent';
/** the small buttons, Restart and Stop (and the link): 48 px; the three above them, Back, Play / Pause and Forward, are 64 px */
const BUTTON = `${BUTTON_BASE} min-h-12 text-base font-medium active:bg-line`;
const BUTTON_BIG = `${BUTTON_BASE} min-h-16 text-base font-medium active:bg-line`;

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}

type Load = { status: 'loading' } | { status: 'ready'; text: SermonText } | { status: 'failed' };

/** The sheet's frame: the backdrop, the handle and Close, the title; the phone's Back, Escape and a swipe down on the handle close it as every sheet does. */
function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  const { drag, handle } = useSheetDrag(closeSermonText);
  useEscapeToClose(closeSermonText, true);
  useSheetBack(closeSermonText);
  useNoDoor(); // nothing on it to ask about, and the floating ? would sit over the controls
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div aria-hidden="true" onClick={closeSermonText} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-sermon-reader
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" onClick={closeSermonText} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Close
          </button>
        </div>
        <h2 className="shrink-0 px-4 pr-20 text-lg font-semibold break-words">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** The paragraphs, the time left and the controls of a sermon whose text is in hand. It starts reading when it appears, from his place. */
function Reading({ opened, text }: { opened: OpenedText; text: SermonText }) {
  const { source, id } = opened;
  const count = text.paragraphs.length;
  const listenKey = `sermon:${source}:${id}`;
  const reading = useReading();
  const completed = useListenCompleted();
  const mine = reading.status !== 'idle' && reading.answer === SERMON_READING_ID;
  const paused = mine && reading.status === 'paused';
  const finished = !mine && completed === listenKey;
  const [at, setAt] = useState(() => readPlace(source, id, count));
  const [rate, setRate] = useState(1);
  const [refused, setRefused] = useState(false);
  const [help, setHelp] = useState<string | null>(null);
  /** the reading that began by itself and has not yet been heard to start or been refused */
  const byItself = useRef(false);
  const items = useRef<(HTMLElement | null)[]>([]);

  // the paragraph being read is his place: kept as it changes, and the one the sheet marks
  const heard = mine && reading.verse !== null ? reading.verse - 1 : null;
  // the place follows the voice, and stays where it stopped (Stop, the phone's refusal)
  if (heard !== null && heard !== at) setAt(heard);
  const current = heard ?? at;
  useEffect(() => {
    if (heard !== null) keepPlace(source, id, heard);
  }, [heard, source, id]);
  // a sermon read to its end is not kept: the next time starts at the top
  useEffect(() => {
    if (finished) forgetPlace(source, id);
  }, [finished, source, id]);
  // the marked paragraph is kept in view
  useEffect(() => {
    items.current[current]?.scrollIntoView?.({ block: 'start' });
  }, [current]);
  // his English speed, for the time left
  useEffect(() => {
    let live = true;
    void getSpeechRates().then((rates) => live && setRate(rates.english));
    return () => {
      live = false;
    };
  }, []);

  const plan = useMemo<PlanVerse[]>(() => text.paragraphs.map((p, i) => ({ n: i + 1, runs: pageRuns(p) })), [text]);

  /** Starts reading at paragraph `from` (0 is the first). Called from a tap where it can be (docs/pwa-best-practices.md section 12). */
  const begin = (from: number) => {
    setRefused(false);
    setHelp(null);
    if (hasVoice('english') === false) {
      setHelp('No voice on this phone to read aloud');
      return;
    }
    // a phone with no Greek voice would say Greek in the English one: the Greek is left out, as ReadAloud does
    const say = hasGreekVoice() === false ? plan.map((p) => ({ ...p, runs: p.runs.filter((run) => run.language !== 'greek') })) : plan;
    startReading({ chapter: 0, plan: say, from: from + 1, continuous: true, answer: SERMON_READING_ID, listen: listenKey, title: false });
  };
  const beginRef = useRef(begin);
  useEffect(() => {
    beginRef.current = begin;
  });

  // it starts by itself, from his place; leaving the sheet ends its own reading, and only that
  useEffect(() => {
    void warmVoices();
    byItself.current = true;
    beginRef.current(at);
    return () => {
      byItself.current = false;
      if (getReading().answer === SERMON_READING_ID) stopReading();
    };
    // once for this sermon: his place at the time it opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a browser that refuses speech without a tap (the error 'not-allowed'): the Play button is one big, pulsing button
  useEffect(
    () =>
      onSpeechRefused(() => {
        if (!byItself.current || getReading().answer !== SERMON_READING_ID) return;
        byItself.current = false;
        setRefused(true);
      }),
    [],
  );

  const go = (by: -1 | 1) => {
    byItself.current = false;
    const to = stepParagraph(current, count, by);
    // reading: it goes on from the paragraph he went to; stopped: the mark moves and Play starts there
    if (mine) return begin(to);
    setAt(to);
    keepPlace(source, id, to);
  };
  const play = () => {
    byItself.current = false;
    if (paused) return resumeReading();
    if (mine) return pauseReading();
    if (finished) {
      forgetPlace(source, id);
      setAt(0);
      return begin(0);
    }
    begin(current);
  };
  const restart = () => {
    byItself.current = false;
    forgetPlace(source, id);
    setAt(0);
    begin(0);
  };
  const stop = () => {
    byItself.current = false;
    stopReading();
  };

  const playing = mine && !paused;
  const left = timeLeftLine(finished ? 0 : minutesLeft(text.paragraphs, current, rate));
  return (
    <>
      <p data-sermon-left role="status" className="shrink-0 px-4 pb-1 text-sm text-muted">
        {left}
      </p>
      <div data-sermon-text className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        {text.paragraphs.map((paragraph, i) => (
          <p
            key={i}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-sermon-paragraph
            {...(!finished && i === current ? { 'data-reading': '' } : {})}
            className="mb-3 scroll-mt-2 rounded-md px-1 text-lg leading-relaxed break-words data-[reading]:bg-accent/20"
          >
            {paragraph}
          </p>
        ))}
      </div>
      {help ? (
        <p role="status" className="shrink-0 px-4 pt-2 text-sm text-muted">
          {help}
        </p>
      ) : null}
      <div data-sermon-controls role="group" aria-label="Reading controls" className="flex shrink-0 flex-col gap-2 border-t border-line px-4 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
        <div className="flex w-full items-center gap-2">
          <button type="button" data-repeat aria-label="Back a paragraph" onClick={() => go(-1)} className={BUTTON_BIG}>
            <span aria-hidden="true">‹ Back</span>
          </button>
          <button
            type="button"
            onClick={() => oneTap('sermon-reader-play', play)}
            {...(refused ? { 'data-sermon-refused': '' } : {})}
            className={`${BUTTON_BASE} min-h-16 min-w-0 flex-1 bg-accent text-xl font-semibold text-surface active:bg-accent ${refused ? 'motion-safe:animate-pulse' : ''}`}
          >
            {playing ? <PauseIcon /> : <Icon kind="play" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" data-repeat aria-label="Forward a paragraph" onClick={() => go(1)} className={BUTTON_BIG}>
            <span aria-hidden="true">Forward ›</span>
          </button>
        </div>
        <div className="flex w-full items-center gap-2">
          <button type="button" onClick={() => oneTap('sermon-reader-restart', restart)} className={`${BUTTON} flex-1`}>
            Restart
          </button>
          <button type="button" onClick={() => oneTap('sermon-reader-stop', stop)} className={`${BUTTON} flex-1`}>
            Stop
          </button>
        </div>
      </div>
    </>
  );
}

/** The sheet for the sermon being read: it asks the service for the text, then reads it; when the text cannot be had it opens the sermon on the web and says so. */
function ReaderSheet({ opened }: { opened: OpenedText }) {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const failedOnce = useRef(false);
  useEffect(() => {
    let gone = false;
    fetchSermonText(opened.source, opened.id).then(
      (answer) => {
        if (gone) return;
        const text = parseText(answer);
        setLoad(text ? { status: 'ready', text } : { status: 'failed' });
      },
      () => {
        if (!gone) setLoad({ status: 'failed' });
      },
    );
    return () => {
      gone = true;
    };
  }, [opened.source, opened.id]);

  // the sermon opens where it always did, once; the sheet keeps a link for a phone that blocks a window opened by itself
  const href = webHref(opened.url, 'browser', onAndroid());
  useEffect(() => {
    if (load.status !== 'failed' || failedOnce.current) return;
    failedOnce.current = true;
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [load.status, href]);

  const title = load.status === 'ready' ? load.text.title : opened.title;
  return (
    <Frame title={title}>
      {load.status === 'ready' ? <Reading opened={opened} text={load.text} /> : null}
      {load.status === 'loading' ? (
        <p role="status" className="px-4 py-3 text-base text-muted">
          Getting the sermon…
        </p>
      ) : null}
      {load.status === 'failed' ? (
        <div className="px-4 py-3 pb-[calc(0.75rem+var(--lp-bar-inset))]">
          <p role="status" className="pb-3 text-base">
            {NO_TEXT_NOTICE}
          </p>
          <a href={href} target="_blank" rel="noopener noreferrer" className={`${BUTTON} w-full`}>
            Open on the web
          </a>
        </div>
      ) : null}
    </Frame>
  );
}

/** Draws the sheet for the sermon openSermonText was last called with; mounted once, in App. */
export function SermonReaderHost() {
  const opened = useOpenedText();
  return opened ? <ReaderSheet key={`${opened.source}:${opened.id}`} opened={opened} /> : null;
}
