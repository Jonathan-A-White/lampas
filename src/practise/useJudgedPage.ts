// src/practise/useJudgedPage.ts — the asking Copywork and Dictation share (mw-5r3p30.899, .900): a photographed page is cut down on the phone as a talk's are (src/talk/pictures.ts) and sent with the verse's
// words to the copywork grind (copywork.ts); what comes back is where the page is (`Judged`), which JudgedPage.tsx draws.
import { useEffect, useRef, useState } from 'react';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, TutorError } from '../services/tutor';
import { filesOf, isTalkPicture, NOT_A_PICTURE_LINE, preparePicture } from '../talk/pictures';
import { COPYWORK_KIND, type CopyworkAnswer, type CopyworkRequest, isCopyworkAnswer, markedWords, type MarkedWord } from './copywork';

const MISFIT_LINE = 'The tutor’s answer did not fit this verse. Try again.';

export type Judged = { status: 'idle' } | { status: 'working' } | { status: 'failed'; line: string } | { status: 'unreadable'; fix: string } | { status: 'done'; words: MarkedWord[]; fix: string };

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
