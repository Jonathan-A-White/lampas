// src/practise/PractisePane.tsx — the Verse view's Practise action (mw-5r3p30.899, his grilling mw-6ww.146): ONE door on a verse or a passage for the ways of working it, in Susan Wise Bauer's order:
// Copywork, Narration, Dictation, Summary, then the Quiz (the Talk sheet's, which was the Verse view's own Quiz me action until this door held it). Copywork works (CopyworkPane.tsx) and so does Dictation
// (DictationPane.tsx, mw-5r3p30.900), Narration (NarrationPane.tsx, mw-5r3p30.901: his written-down narration can be taken to Copywork or Dictation, which then work on it in English) and Summary (SummaryPane.tsx, mw-5r3p30.902: typed or photographed, in English); the Quiz is offered as before (on an Old Testament verse only with some Hebrew, quizOffered). VerseView keeps which door is open
// (PracticeState, per verse or passage, so a move to the next one starts at the door) and draws the verse to copy in its text box.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CopyworkPane } from './CopyworkPane';
import { COPY_LANGUAGE_NAMES, type CopyLanguage } from './copywork';
import { DictationPane } from './DictationPane';
import { NarrationPane } from './NarrationPane';
import { SummaryPane } from './SummaryPane';
import type { PracticeState } from './practiceState';
import { SHORT_BAR } from '../ui/barClass';

interface Way {
  id: 'copywork' | 'narration' | 'dictation' | 'summary' | 'quiz';
  label: string;
  hint: string;
}

/** The ways, in her order. */
const WAYS: readonly Way[] = [
  { id: 'copywork', label: 'Copywork', hint: 'Copy it by hand, then photograph your page' },
  { id: 'narration', label: 'Narration', hint: 'Tell it back in your own words, aloud' },
  { id: 'dictation', label: 'Dictation', hint: 'Write it as you hear it read' },
  { id: 'summary', label: 'Summary', hint: 'Give the main points in a few sentences' },
  { id: 'quiz', label: 'Quiz', hint: 'The tutor asks, one question at a time' },
];

const ITEM = 'flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-left active:bg-line';
const CELL = 'min-h-11 rounded-xl border px-3 text-sm font-medium leading-tight';
const BACK = 'min-h-11 rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line';

export interface PractisePaneProps {
  state: PracticeState;
  onState: (next: PracticeState) => void;
  /** 'John 1:1' */
  reference: string;
  /** 'John 1:1' with its heading for a passage: what the Quiz help names */
  name: string;
  /** the languages the verse can be copied in, and the text to copy in the one chosen; in Narration the text is the verse in English, and in Copywork or Dictation of his narration it is the narration */
  languages: CopyLanguage[];
  copyText: string;
  /** the Quiz is a door only where there is something to quiz on (Hebrew 0 on an Old Testament verse has none) */
  quizOffered: boolean;
  quiz: { started: boolean; onOpen: () => void };
  /** the foot of the Verse view, where the one filled control stands */
  slot: HTMLElement | null;
}

export function PractisePane({ state, onState, reference, name, languages, copyText, quizOffered, quiz, slot }: PractisePaneProps) {
  // the state as it is now, for an answer that comes after a render (Narration's)
  const now = useRef(state);
  useEffect(() => {
    now.current = state;
  });
  const back = (
    <button
      type="button"
      aria-label="Back to Practise"
      onClick={() => onState(state.fromNarration ? { ...state, door: 'narration', revealed: false, fromNarration: false, language: 'en' } : { ...state, door: 'door', revealed: false })}
      className={BACK}
    >
      ‹ Practise
    </button>
  );
  // Copywork and Dictation of his narration name it as his, not the verse's
  const worked = state.fromNarration ? `My narration of ${reference}` : reference;
  if (state.door === 'copywork' || state.door === 'dictation') {
    const dictation = state.door === 'dictation';
    return (
      <div data-practise-pane={state.door} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {back}
          <div role="group" aria-label={dictation ? 'Dictate in' : 'Copy in'} className="flex flex-wrap gap-1">
            {languages.map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={state.language === language}
                onClick={() => onState({ ...state, language, revealed: false })}
                className={`${CELL} ${state.language === language ? 'border-accent bg-accent/15 text-fg' : 'border-line text-fg active:bg-line'}`}
              >
                {COPY_LANGUAGE_NAMES[language]}
              </button>
            ))}
          </div>
        </div>
        {dictation ? (
          <DictationPane
            key={`${state.key}:${state.language}`}
            reference={worked}
            language={state.language}
            text={copyText}
            slot={slot}
            onRevealed={(revealed) => (state.revealed ?? false) !== revealed && onState({ ...state, revealed })}
          />
        ) : (
          <CopyworkPane key={`${state.key}:${state.language}`} reference={worked} language={state.language} text={copyText} slot={slot} />
        )}
      </div>
    );
  }
  if (state.door === 'narration') {
    return (
      <div data-practise-pane="narration" className="flex flex-col gap-1">
        <div>{back}</div>
        <NarrationPane
          key={state.key}
          reference={reference}
          passage={copyText}
          narration={state.narration}
          onNarration={(narration) => onState({ ...now.current, narration })}
          onUse={(door) => onState({ ...now.current, door, language: 'en', revealed: false, fromNarration: true })}
          slot={slot}
        />
      </div>
    );
  }
  if (state.door === 'summary') {
    return (
      <div data-practise-pane="summary" className="flex flex-col gap-1">
        <div>{back}</div>
        <SummaryPane
          key={state.key}
          reference={reference}
          passage={copyText}
          summary={state.summary}
          onSummary={(summary) => onState({ ...now.current, summary })}
          slot={slot}
        />
      </div>
    );
  }
  if (state.door === 'quiz') {
    return (
      <div data-practise-pane="quiz" className="flex flex-col gap-1">
        <div>{back}</div>
        <p data-action-help className="px-1 text-sm text-muted">
          The tutor asks you about {name} one question at a time, in order, then helps you map how it is built.
        </p>
        {slot
          ? createPortal(
              // Not a hold: the answers are given in the Talk sheet it opens, which has the hold bar for them. Same size and place as the bar.
              <button
                type="button"
                onClick={quiz.onOpen}
                className={`mx-auto flex h-24 w-full max-w-xl select-none items-center justify-center rounded-3xl bg-accent chrome-text font-semibold text-accent-fg ${SHORT_BAR}`}
              >
                {quiz.started ? 'Continue the quiz' : 'Start the quiz'}
              </button>,
              slot,
            )
          : null}
      </div>
    );
  }
  return (
    <ul aria-label="Ways to practise" data-practise-door className="flex flex-col gap-1.5">
      {WAYS.filter((way) => way.id !== 'quiz' || quizOffered).map((way) => (
        <li key={way.id}>
          <button
            type="button"
            aria-label={way.label}
            aria-describedby={`practise-hint-${way.id}`}
            onClick={() => onState({ ...state, door: way.id })}
            className={ITEM}
          >
            <span className="flex flex-col">
              <span className="text-base font-medium text-fg">{way.label}</span>
              <span id={`practise-hint-${way.id}`} className="text-sm text-muted">
                {way.hint}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
