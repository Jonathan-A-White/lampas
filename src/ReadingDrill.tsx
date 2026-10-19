// src/ReadingDrill.tsx — the reading drill (mw-neuq78.5, docs/reading-ladder.md 'Drills'): a sheet over the Verse view for a sound (Greek) or the words (English) he keeps missing.
// A card with the one thing to remember (the sounds tier's rule, with a speaker; or the words), then five short New Testament words (Greek: heavy in that sound, easiest first;
// English: his misread words), each read aloud with the same verse-read grist at word size, then back to the ladder. Nothing read here goes into his reading history or
// the miss tally; finishing the drill puts the unit on the schedule as a review of kind `sound` (src/review/kinds.ts SOUND). The offer is DrillOffer, the button 'Drill this sound' / 'Drill these words'.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Verse } from './data/chapter';
import { unitId } from './data/passage';
import { loadFrequency } from './data/frequency';
import { ideaSound } from './data/grammar/lessons';
import { drillWhy, drillWords, ideaOfSound, reviewIdsOf, type DrillOffer } from './data/readingDrill';
import { scheduleSounds } from './data/repositories';
import { FAILURE_TITLES } from './services/tutor';
import { plainQuotes, RESULT_HEADINGS, type ReadingView, type VerseReadAnswer } from './services/reading';
import { SpeakButton } from './speech/SpeakButton';
import { focusOnMount } from './ui/focus';
import { HoldBar } from './ui/HoldBar';
import { NextBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { useElapsed } from './ui/useElapsed';
import { useReadChecks, type ReadState } from './useReadChecks';
import { GREEK_LANG, langOf } from './script/greekLang';

const BUTTON = 'min-h-12 w-full rounded-xl border border-line px-5 text-lg font-medium';
const PRIMARY = 'min-h-12 w-full rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg';

/** A practice word as a one-word verse, so the reading check's own recorder and grist read it (nothing of it is kept as a reading). */
const wordVerse = (word: string, index: number): Verse => ({
  n: index + 1,
  g: [{ t: word, tr: '', s: '', l: word, p: '' }],
  e: [{ t: word, g: [0] }],
});

const NO_WORDS: string[] = [];

type Words = { status: 'loading' } | { status: 'ready'; words: string[] } | { status: 'failed' };

/** The practice words: the Greek ones found from the frequency table (the sound's idea names the letters), the English ones are the offer's. */
function usePracticeWords(offer: DrillOffer): Words {
  const [found, setFound] = useState<Words>(offer.kind === 'words' ? { status: 'ready', words: offer.words } : { status: 'loading' });
  useEffect(() => {
    if (offer.kind === 'words') return;
    const idea = ideaOfSound(offer.unit);
    let live = true;
    loadFrequency().then(
      (entries) => live && setFound(idea ? { status: 'ready', words: drillWords(idea, entries) } : { status: 'failed' }),
      () => live && setFound({ status: 'failed' }),
    );
    return () => {
      live = false;
    };
  }, [offer]);
  return found;
}

/** What the reading of the word is doing, in words. */
function WordStatus({ state, onRetry }: { state: ReadState | undefined; onRetry: () => void }) {
  if (!state) return null;
  if (state.phase === 'recording') return <p role="status" className="text-base font-semibold text-accent">Listening… let go when you finish</p>;
  if (state.phase === 'tap') return <p role="status" className="text-base text-muted">Hold while you say the word</p>;
  if (state.phase === 'short') return <p role="status" className="text-base text-muted">Hold the bar a little longer while you say the word</p>;
  if (state.phase === 'dropped') return <p role="status" className="text-base text-muted">Dropped. Hold to try again</p>;
  if (state.phase !== 'failed') return <Waiting state={state} />;
  const title = state.failure === 'mic' ? 'Could not record' : FAILURE_TITLES[state.failure];
  const canRetry = state.recording !== undefined && state.failure !== 'mic' && state.failure !== 'not-sent';
  return (
    <div role="alert" className="space-y-2">
      <p className="text-base font-semibold text-bad">{title}</p>
      <p className="break-words text-sm text-muted">{state.detail}</p>
      {canRetry ? (
        <button type="button" onClick={onRetry} className="min-h-12 rounded-xl border border-line px-5 text-base font-medium">
          Retry
        </button>
      ) : null}
    </div>
  );
}

function Waiting({ state }: { state: Extract<ReadState, { phase: 'sending' | 'waiting' }> }) {
  const seconds = useElapsed(state.startedAt);
  return (
    <p role="status" className="text-base text-muted">
      {state.phase === 'sending' ? 'Sending…' : `Waiting for the tutor… ${seconds} s`}
    </p>
  );
}

/** How the word went: the verdict's heading and note, and each word to fix in pieces with its tip and a speaker. */
function WordResult({ answer, view }: { answer: VerseReadAnswer; view: ReadingView }) {
  const greek = view === 'greek';
  return (
    <div data-drill-result={answer.verdict} className="space-y-2">
      <h3 className="text-lg font-semibold">{RESULT_HEADINGS[answer.verdict]}</h3>
      <p className="break-words text-base">{plainQuotes(answer.note)}</p>
      {answer.focus_words.map((fix, i) => (
        <div key={i} className="space-y-1">
          <p {...langOf(greek)} className={`break-words text-2xl font-semibold tracking-wide ${greek ? 'font-greek' : ''}`}>
            {fix.chunks.join(' · ')}
          </p>
          <p className="break-words text-base text-muted">{plainQuotes(fix.tip)}</p>
          <SpeakButton text={fix.say ?? fix.word} id={`drill-fix-${i}`} label={`Hear ${fix.word}`} kind="speaker" language={greek ? 'greek' : 'english'} />
        </div>
      ))}
    </div>
  );
}

/** The drill's sheet. `view` is the language the panel reads in; `pronunciation` is the setting the reading check scores Greek by. */
export function ReadingDrill({ offer, pronunciation, onClose }: { offer: DrillOffer; pronunciation: unknown; onClose: () => void }) {
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const view: ReadingView = offer.kind === 'sound' ? 'greek' : 'english';
  const found = usePracticeWords(offer);
  const words = found.status === 'ready' ? found.words : NO_WORDS;
  const verses = useMemo(() => words.map(wordVerse), [words]);
  // -1 is the card with the thing to remember; 0..n-1 the words; n the end
  const [at, setAt] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, VerseReadAnswer>>({});
  const checks = useReadChecks('drill', 0, offer.kind === 'sound' ? `Drill ${offer.glyphs}` : 'Drill words', view, typeof pronunciation === 'string' ? pronunciation : undefined, (verse, answer) =>
    setAnswers((before) => ({ ...before, [unitId(verse)]: answer })),
  );
  const done = found.status === 'ready' && words.length > 0 && at >= words.length;
  const scheduled = useRef(false);
  useEffect(() => {
    if (!done || scheduled.current) return;
    scheduled.current = true;
    void scheduleSounds(reviewIdsOf(offer)).catch((error: unknown) => console.error('could not schedule the drill', error));
  }, [done, offer]);

  const word = at >= 0 && at < words.length ? words[at] : undefined;
  const verse = word === undefined ? undefined : verses[at];
  const key = verse ? unitId(verse) : '';
  const state = checks.states[key];
  const answer = answers[key];
  const sent = state?.phase === 'sending' || state?.phase === 'waiting';
  const recording = state?.phase === 'recording';
  const last = at === words.length - 1;
  // the next word's Skip this word is the button Next word was, in the same place: a second tap of a double tap on Next word waits for the new word to
  // settle (src/ui/settle.ts, mw-5r3p30.430)
  const settled = useSettled(at);
  const lang = langOf(view === 'greek');
  const idea = offer.kind === 'sound' ? ideaOfSound(offer.unit) : undefined;
  const title = offer.kind === 'sound' ? `Drill: ${offer.glyphs}` : 'Drill: words you keep missing';

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reading drill"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div {...handle} className="flex min-h-12 shrink-0 touch-none items-center justify-between gap-3 px-4 pt-2">
          <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-line" />
          <button type="button" ref={focusOnMount} onClick={onClose} className="absolute right-2 top-1 min-h-11 min-w-11 rounded-lg px-3 text-base font-medium text-accent">
            Done
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
          <h2 className="pr-14 text-2xl font-bold">{title}</h2>
          {found.status === 'loading' ? <p role="status" className="text-base text-muted">Finding words…</p> : null}
          {found.status === 'failed' ? <p role="alert" className="text-base text-bad">Could not find words for this drill. Try again later.</p> : null}

          {found.status === 'ready' && at < 0 ? (
            <div data-drill-intro className="space-y-3">
              {offer.kind === 'sound' && idea ? (
                <>
                  <p data-drill-rule className="text-2xl">
                    <span {...GREEK_LANG} className="font-greek text-3xl">{idea.pair}</span> says {ideaSound(idea)}
                  </p>
                  <SpeakButton text={idea.pair ?? ''} id={`drill-rule-${offer.unit}`} label={`Hear ${idea.pair}`} kind="speaker" />
                  <p className="text-base text-muted">{drillWhy(offer)} You will read {words.length} short words with it, easiest first.</p>
                </>
              ) : (
                <>
                  <p data-drill-rule className="text-2xl font-semibold">{words.join(', ')}</p>
                  <p className="text-base text-muted">{drillWhy(offer)} Say each one slowly, a piece at a time, then read it aloud.</p>
                </>
              )}
              {words.length > 0 ? (
                <button type="button" onClick={() => setAt(0)} className={PRIMARY}>
                  Start the drill
                </button>
              ) : (
                <p className="text-base text-muted">There are no practice words for this one yet.</p>
              )}
            </div>
          ) : null}

          {word !== undefined && verse ? (
            <div data-drill-card className="space-y-3">
              <p className="text-sm text-muted">
                Word {at + 1} of {words.length}
              </p>
              <p data-drill-word {...lang} className={`break-words text-5xl ${view === 'greek' ? 'font-greek' : 'font-semibold'}`}>
                {word}
              </p>
              <SpeakButton text={word} id={`drill-word-${word}`} label={`Hear ${word}`} kind="speaker" language={view === 'greek' ? 'greek' : 'english'} />
              <p className="text-sm text-muted">Hold the bar below and say the word. Let go to send.</p>
              <WordStatus state={state} onRetry={() => checks.retry(verse)} />
              {answer && !sent && state?.phase !== 'failed' ? <WordResult answer={answer} view={view} /> : null}
              <NextBar where="sheet">
                <button type="button" onClick={() => settled() && setAt(at + 1)} className={answer ? PRIMARY : BUTTON}>
                  {answer ? (last ? 'Finish' : 'Next word') : 'Skip this word'}
                </button>
              </NextBar>
            </div>
          ) : null}

          {done ? (
            <div data-drill-done className="space-y-3">
              <p className="text-xl font-semibold">Drilled {offer.kind === 'sound' ? offer.glyphs : words.join(', ')}.</p>
              <p className="text-base">It comes back in Review tomorrow, and again a little later each time you get it right.</p>
              <button type="button" onClick={onClose} className={PRIMARY}>
                Back to the ladder
              </button>
            </div>
          ) : null}

          {found.status === 'ready' && words.length === 0 && at >= 0 ? (
            <button type="button" onClick={onClose} className={BUTTON}>
              Back to the ladder
            </button>
          ) : null}
        </div>
        {word !== undefined && verse ? (
          <div className="shrink-0 border-t border-line px-4 pb-[var(--lp-bar-inset)] pt-3">
            <HoldBar
              hold={{ onHold: () => checks.press(verse), onRelease: checks.release, onDrop: checks.drop }}
              holdMs={0}
              name={`Hold to read ${word}`}
              label={recording ? 'Release to send' : `Hold to read ${word}`}
              listening={recording}
              disabled={sent}
              compactWhenShort
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
