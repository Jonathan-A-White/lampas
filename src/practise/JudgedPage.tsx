// src/practise/JudgedPage.tsx — what Copywork and Dictation share (mw-5r3p30.899, .900): a photographed page is cut down on the phone as a talk's are (src/talk/pictures.ts), sent with the verse's words to the
// copywork grind (copywork.ts) and what comes back is drawn as the verse with each word marked: right, missing or wrong (with what is wrong, and for a dictated page whether it sounds like the verse's word), and
// the one line on what to fix first. A mark is never colour alone: a wrong word has a cross and a line under it, a missing one is struck out and dashed. A page the tutor cannot read says so and marks nothing.
// useJudgedPage is the asking, JudgedView the drawing, PhotoControls the buttons that bring the picture (Attach a picture in the pane, the foot's camera).
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, TutorError } from '../services/tutor';
import { filesOf, isTalkPicture, NOT_A_PICTURE_LINE, preparePicture, TALK_PICTURE_MIMES } from '../talk/pictures';
import { copyAttrs, COPYWORK_KIND, type CopyLanguage, type CopyworkAnswer, type CopyworkRequest, isCopyworkAnswer, markedWords, type MarkedWord } from './copywork';

const WORKING_LINE = 'Reading your page…';
const UNREADABLE_LINE = 'The tutor could not read your page.';
const MISFIT_LINE = 'The tutor’s answer did not fit this verse. Try again.';

export type Judged = { status: 'idle' } | { status: 'working' } | { status: 'failed'; line: string } | { status: 'unreadable'; fix: string } | { status: 'done'; words: MarkedWord[]; fix: string };

const WORD: Record<MarkedWord['mark'], string> = {
  right: 'border-line',
  wrong: 'border-accent underline decoration-wavy underline-offset-4',
  missing: 'border-dashed border-muted line-through',
};
const MARK_GLYPH: Record<MarkedWord['mark'], string> = { right: '✓', wrong: '✗', missing: '–' };
const MARK_SAYS: Record<MarkedWord['mark'], string> = { right: 'right', wrong: 'wrong', missing: 'missing' };
/** The foot's one filled control: the size and place of the hold bars, not a hold. */
export const FOOT = 'mx-auto flex h-24 w-full max-w-xl select-none items-center justify-center rounded-3xl bg-accent chrome-text font-semibold text-accent-fg disabled:opacity-50';
export const QUIET = 'min-h-11 rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line disabled:opacity-50';

/** The result: the verse with each word marked, the problems in words, and the one thing to fix first. */
function Result({ words, fix, language }: { words: MarkedWord[]; fix: string; language: CopyLanguage }) {
  const face = language === 'hbo' ? 'script-he text-2xl' : language === 'grc' ? 'font-greek text-2xl' : 'text-lg';
  const faults = words.filter((w) => w.mark !== 'right');
  return (
    <div data-copywork-result className="flex flex-col gap-2 px-1">
      <p {...copyAttrs(language)} className={`flex flex-wrap gap-1.5 leading-snug ${face}`}>
        {words.map((w, i) => (
          <span key={i} data-copy-word data-mark={w.mark} className={`rounded-md border px-1.5 ${WORD[w.mark]}`}>
            {w.word}
            <span className="sr-only"> ({MARK_SAYS[w.mark]})</span>
            <span aria-hidden="true" className="ms-1 align-middle font-sans text-xs text-muted">
              {MARK_GLYPH[w.mark]}
            </span>
          </span>
        ))}
      </p>
      {faults.length === 0 ? <p className="text-sm text-muted">Every word is right.</p> : null}
      <p data-fix-first className="text-base font-medium">
        {fix}
      </p>
      {faults.length > 0 ? (
        <ul className="flex flex-col gap-0.5 text-sm text-muted">
          {faults.map((w, i) => (
            <li key={i}>
              <span {...copyAttrs(language)} className="font-medium text-fg">
                {w.word}
              </span>
              {w.mark === 'missing' ? ': missing' : `: ${w.problem ?? 'not as the verse has it'}`}
              {w.soundsAlike ? (
                <span data-sounds-alike className="font-medium text-fg">
                  {' '}
                  (sounds alike)
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Asks the copywork grind to judge a picture of a page against `request`'s words; `state` is where it is. A new ask, or leaving, stops the one in flight. */
export function useJudgedPage(): { state: Judged; judge: (file: File, asked: CopyworkRequest) => Promise<void>; reset: () => void } {
  const [state, setState] = useState<Judged>({ status: 'idle' });
  const stop = useRef<AbortController | null>(null);
  useEffect(() => () => stop.current?.abort(), []);

  async function judge(file: File, asked: CopyworkRequest) {
    if (!isTalkPicture(file)) {
      setState({ status: 'failed', line: NOT_A_PICTURE_LINE });
      return;
    }
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    setState({ status: 'working' });
    try {
      const picture = await preparePicture(file, 0);
      const answer: CopyworkAnswer = await askGrind(COPYWORK_KIND, asked, isCopyworkAnswer, { key: getDeviceKeyBytes(), files: filesOf([picture]), signal: controller.signal, untimed: true });
      if (controller.signal.aborted) return;
      if (!answer.readable) {
        setState({ status: 'unreadable', fix: answer.fix_first });
        return;
      }
      const words = markedWords(asked, answer);
      setState(words ? { status: 'done', words, fix: answer.fix_first } : { status: 'failed', line: MISFIT_LINE });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ status: 'failed', line: err instanceof TutorError ? err.message : err instanceof Error ? err.message : 'Something went wrong. Try again.' });
    }
  }

  const reset = () => {
    stop.current?.abort();
    setState({ status: 'idle' });
  };
  return { state, judge, reset };
}

/** The working line, a failure, a page that could not be read, or the marked result. */
export function JudgedView({ state, language }: { state: Judged; language: CopyLanguage }) {
  return (
    <>
      {state.status === 'working' ? (
        <p role="status" className="px-1 text-base">
          {WORKING_LINE}
        </p>
      ) : null}
      {state.status === 'failed' ? (
        <p role="alert" className="px-1 text-base">
          {state.line}
        </p>
      ) : null}
      {state.status === 'unreadable' ? (
        <div data-copywork-result className="flex flex-col gap-1 px-1">
          <p className="text-base">{UNREADABLE_LINE}</p>
          <p data-fix-first className="text-base font-medium">
            {state.fix}
          </p>
        </div>
      ) : null}
      {state.status === 'done' ? <Result words={state.words} fix={state.fix} language={language} /> : null}
    </>
  );
}

export interface PhotoControlsProps {
  /** a picture is being judged, or there is nothing to judge */
  disabled: boolean;
  /** the foot's control: 'Take a photo' (the camera), or what it says after a result */
  label: string;
  /** the picture picked or taken */
  onFile: (file: File) => void;
  /** the foot of the Verse view, where the filled control stands; what the foot does instead of the camera is drawn by the caller (`foot`) */
  slot: HTMLElement | null;
  /** the foot's own control in place of the camera's, when it is not the camera that is wanted now */
  foot?: ReactNode;
}

/** 'Attach a picture' in the pane (the gallery) and the camera at the foot, which opens a picture's taker; both give the picture to `onFile`. */
export function PhotoControls({ disabled, label, onFile, slot, foot }: PhotoControlsProps) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const picked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };
  const inputProps = { type: 'file' as const, accept: TALK_PICTURE_MIMES.join(','), onChange: picked, className: 'hidden', tabIndex: -1 };
  return (
    <>
      <div>
        <button type="button" disabled={disabled} onClick={() => gallery.current?.click()} className={QUIET}>
          Attach a picture
        </button>
      </div>
      <input {...inputProps} ref={gallery} aria-label="Picture of your page" />
      <input {...inputProps} ref={camera} capture="environment" aria-label="Photo of your page" />
      {slot
        ? createPortal(
            foot ?? (
              <button type="button" disabled={disabled} onClick={() => camera.current?.click()} className={FOOT}>
                {label}
              </button>
            ),
            slot,
          )
        : null}
    </>
  );
}
