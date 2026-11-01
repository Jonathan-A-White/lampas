// src/practise/NarrationPane.tsx — Narration in the Verse view's Practise (mw-5r3p30.901): the verse (or passage) is shown in English in the view's text box to read first, then he holds the bar at the foot
// and tells it back in his own words. The phone's English dictation (useTalkHold, en-US) hears him; the words are written down as a parent would (narration.ts writtenDown) and shown, and the narration grind
// answers with the points he caught in the passage's order, the points he missed and one gentle question. The written-down narration, with the answer, is kept in the PracticeState, so it can be taken to
// Copywork or Dictation ('Use as copywork', 'Use as dictation': her method) and come back. Narration is in English only: the line at the top of the pane says so.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, TutorError } from '../services/tutor';
import { forgetSpoken } from '../speech/spoken';
import { HeldTalkBar } from '../talk/Bars';
import { useTalkHold } from '../talk/useTalkHold';
import { buildNarrationRequest, isNarrationAnswer, NARRATION_KIND, type Narrated, narrationRefusal, writtenDown } from './narration';
import { QUIET } from './JudgedPage';

const SCOPE_LINE = 'Narration is in English. Telling it back in Greek or Hebrew is not offered yet.';
const WORKING_LINE = 'The tutor is listening to your narration…';
/** The words on the hold bar: before he has told anything, and once he has (to tell it again). */
const FIRST_LABELS = { hold: 'Hold and tell it back', release: 'Let go when you have told it', starting: 'Starting the mic…', tryAgain: 'Hold and tell it back' };
const AGAIN_LABELS = { ...FIRST_LABELS, hold: 'Hold to tell it again', tryAgain: 'Hold to tell it again' };

export interface NarrationPaneProps {
  /** what he tells back: 'John 1:1' */
  reference: string;
  /** the verse or passage in English: what the grind compares his narration with */
  passage: string;
  /** what he told, written down, and the tutor's answer once it has come; undefined before he has told anything */
  narration: Narrated | undefined;
  onNarration: (next: Narrated) => void;
  /** take the written-down narration to Copywork or Dictation */
  onUse: (door: 'copywork' | 'dictation') => void;
  /** the foot of the Verse view, where the hold bar stands */
  slot: HTMLElement | null;
}

export function NarrationPane({ reference, passage, narration, onNarration, onUse, slot }: NarrationPaneProps) {
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const stop = useRef<AbortController | null>(null);
  const latest = useRef({ onNarration, reference, passage });
  useEffect(() => {
    latest.current = { onNarration, reference, passage };
  });
  useEffect(() => () => stop.current?.abort(), []);

  /** Writes `heard` down and asks the grind about it. */
  async function ask(text: string) {
    const { onNarration: keep, reference: about, passage: verse } = latest.current;
    keep({ text, answer: null });
    const refusal = narrationRefusal(verse, text);
    if (refusal) {
      setFailure(refusal);
      return;
    }
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setFailure(null);
    setAsking(true);
    try {
      const answer = await askGrind(NARRATION_KIND, buildNarrationRequest(about, verse, text), isNarrationAnswer, { key: getDeviceKeyBytes(), signal: controller.signal, untimed: true });
      if (controller.signal.aborted) return;
      latest.current.onNarration({ text, answer });
    } catch (err) {
      if (controller.signal.aborted) return;
      setFailure(err instanceof TutorError ? err.message : err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      if (!controller.signal.aborted) setAsking(false);
    }
  }

  // The words he told: a hold that ends in a release, or the recogniser giving up with words already heard, is his narration; a slide off or leaving the app is "never mind".
  const heard = (words: string): void => {
    forgetSpoken();
    const text = writtenDown(words);
    if (text) void ask(text);
  };
  const voice = useTalkHold(heard, { onKept: (words, ended) => (ended === 'error' || ended === 'ended' ? heard(words) : undefined) });

  const told = narration?.text;
  const answer = narration?.answer;
  return (
    <div data-narration className="flex flex-col gap-2">
      <p data-narration-scope className="px-1 text-sm text-muted">
        {SCOPE_LINE}
      </p>
      <p className="px-1 text-sm text-muted">
        Read {reference}, then hold the bar and tell it back in your own words. The tutor writes down what you say and tells you what you caught and what you missed.
      </p>
      {voice.notice ? (
        <p role="status" className="px-1 text-sm text-muted">
          {voice.notice}
        </p>
      ) : null}
      {voice.listening && voice.transcript ? (
        <p data-narration-live aria-live="polite" className="lp-live px-1 text-base">
          {voice.transcript}
        </p>
      ) : null}
      {told ? (
        <div data-narration-written-box className="flex flex-col gap-0.5 px-1">
          <p className="text-sm font-medium text-muted">What you said, written down</p>
          <p data-narration-written lang="en" className="text-base">
            {told}
          </p>
        </div>
      ) : null}
      {asking ? (
        <p role="status" className="px-1 text-base">
          {WORKING_LINE}
        </p>
      ) : null}
      {failure ? (
        <div className="flex flex-col items-start gap-1 px-1">
          <p role="alert" className="text-base">
            {failure}
          </p>
          {told ? (
            <button type="button" onClick={() => void ask(told)} className={QUIET}>
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
      {answer ? (
        <div data-narration-result className="flex flex-col gap-2 px-1">
          <div>
            <p className="text-sm font-medium text-muted">You caught</p>
            {answer.caught.length > 0 ? (
              <ol data-narration-caught className="list-decimal ps-5 text-base">
                {answer.caught.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ol>
            ) : (
              <p className="text-base">None of the main points yet.</p>
            )}
            {answer.caught.length > 1 && !answer.in_order ? <p data-narration-order className="text-sm text-muted">You told these in a different order from the passage.</p> : null}
          </div>
          <div>
            <p className="text-sm font-medium text-muted">You missed</p>
            {answer.missed.length > 0 ? (
              <ol data-narration-missed className="list-decimal ps-5 text-base">
                {answer.missed.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ol>
            ) : (
              <p className="text-base">Nothing: you told every main point.</p>
            )}
          </div>
          <p data-narration-question className="text-base font-medium">
            {answer.question}
          </p>
        </div>
      ) : null}
      {told && !asking ? (
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => onUse('copywork')} className={QUIET}>
            Use as copywork
          </button>
          <button type="button" onClick={() => onUse('dictation')} className={QUIET}>
            Use as dictation
          </button>
        </div>
      ) : null}
      {slot ? createPortal(<HeldTalkBar hold={voice} labels={told ? AGAIN_LABELS : FIRST_LABELS} disabled={asking} />, slot) : null}
    </div>
  );
}
