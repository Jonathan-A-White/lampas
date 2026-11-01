// src/practise/DictationPane.tsx — Dictation in the Verse view's Practise (mw-5r3p30.900, his grilling mw-6ww.146): Susan Wise Bauer's dictation is writing a sentence from hearing it read. The verse is HIDDEN
// (VerseView draws a line in its text box instead, until the page is judged); the app reads it aloud a phrase at a time in the language's voice (dictation.ts cuts the phrases, speech/greek.ts speakPhrase says one
// and waits): the foot's 'Start dictation' says the first, 'Next' the next, and 'Again' (in the pane) says this one again. After the last phrase the foot is 'Take a photo' as in Copywork (the page is judged by the
// copywork grind with `mode: 'dictation'`, JudgedPage.tsx); after the result the verse is shown beside the marks (`onRevealed`) and the foot's 'Try again' starts over, the verse hidden again.
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { noVoiceHelp, speakPhrase, stopPhrase } from '../speech/greek';
import type { SpeechLanguage } from '../speech/languages';
import { buildCopyworkRequest, type CopyLanguage, MAX_COPY_WORDS } from './copywork';
import { phrasesOf } from './dictation';
import { FOOT, JudgedView, PhotoControls, QUIET, useJudgedPage } from './JudgedPage';

const TOO_LONG_LINE = 'That is a long passage to write from hearing. Open a verse or a shorter passage to practise dictation.';

/** The voice a language is read in. */
const VOICE_OF: Record<CopyLanguage, SpeechLanguage> = { en: 'english', grc: 'greek', hbo: 'hebrew' };

export interface DictationPaneProps {
  /** what he writes: 'John 1:1' */
  reference: string;
  language: CopyLanguage;
  /** the verse's text in `language`: what is read, a phrase at a time, and the words the grind marks */
  text: string;
  /** the foot of the Verse view, where the filled control stands */
  slot: HTMLElement | null;
  /** the page has been judged: the verse may be shown (and hidden again when he starts over) */
  onRevealed: (revealed: boolean) => void;
}

export function DictationPane({ reference, language, text, slot, onRevealed }: DictationPaneProps) {
  const phrases = useMemo(() => phrasesOf(text, language), [text, language]);
  const request = buildCopyworkRequest(reference, language, text, 'dictation');
  const { state, judge, reset } = useJudgedPage();
  /** the phrase last said (0 for the first); -1 before dictation starts */
  const [at, setAt] = useState(-1);
  const [noVoice, setNoVoice] = useState(false);
  const tooLong = request.words.length > MAX_COPY_WORDS;
  const done = state.status === 'done';
  const working = state.status === 'working';
  const heardAll = at >= phrases.length - 1 && at >= 0;
  const writing = heardAll && !done;

  const reveal = useRef(onRevealed);
  reveal.current = onRevealed;
  useEffect(() => {
    reveal.current(done);
  }, [done]);
  useEffect(() => stopPhrase, []);

  const say = (n: number) => {
    setAt(n);
    setNoVoice(speakPhrase(phrases[n], VOICE_OF[language]) === 'no-voice');
  };
  const restart = () => {
    stopPhrase();
    reset();
    setAt(-1);
    setNoVoice(false);
  };

  const foot = (label: string, onClick: () => void): ReactNode => (
    <button type="button" disabled={tooLong || phrases.length === 0} onClick={onClick} className={FOOT}>
      {label}
    </button>
  );

  return (
    <div data-dictation className="flex flex-col gap-2">
      {at < 0 ? (
        <p data-phrase-total={phrases.length} className="px-1 text-sm text-muted">
          The app reads {reference} aloud in {phrases.length === 1 ? 'one phrase' : `${phrases.length} phrases`}, one at a time, in {language === 'en' ? 'English' : language === 'grc' ? 'Greek' : 'Hebrew'}. Write each as you hear it; the verse stays hidden until your page is judged.
        </p>
      ) : (
        <p data-phrase-total={phrases.length} data-phrase-count aria-live="polite" className="px-1 text-base font-medium">
          Phrase {at + 1} of {phrases.length}
        </p>
      )}
      {tooLong ? <p className="px-1 text-sm text-muted">{TOO_LONG_LINE}</p> : null}
      {noVoice ? (
        <p role="alert" className="px-1 text-sm text-muted">
          {noVoiceHelp(VOICE_OF[language])}
        </p>
      ) : null}
      {at >= 0 && !done && !working ? (
        <div>
          <button type="button" onClick={() => say(at)} className={QUIET}>
            Again
          </button>
        </div>
      ) : null}
      <JudgedView state={state} language={language} />
      {writing ? <PhotoControls disabled={working || tooLong} label="Take a photo" onFile={(file) => void judge(file, request)} slot={slot} /> : null}
      {slot && !writing ? createPortal(done ? foot('Try again', restart) : at < 0 ? foot('Start dictation', () => say(0)) : foot('Next', () => say(at + 1)), slot) : null}
    </div>
  );
}
