// src/ipa/IpaDrill.tsx — the drill and the pass check of the course 'Learn the IPA sounds' (mw-5r3p30.356). The drill: rounds over the sounds whose card he has opened, the
// weakest first, a sound with its confusable partner, both ways; each answer is told at once, and a wrong one comes back until it is right twice running (./drill.ts).
// The pass check: every sound both ways, once each, nothing told until the end (./course.ts checkResult). Every answer is kept (data/repositories/ipaCourse.ts).
import { useMemo, useState } from 'react';
import { mulberry32 } from '../data/random';
import { noteIpaAnswer } from '../data/repositories';
import { greekMarked } from '../ui/GreekMarked';
import { focusOnMount } from '../ui/focus';
import { NextBar } from '../ui/NextBar';
import { chosenPronunciation } from '../speech/greek';
import type { SoundId } from '../speech/sounds';
import { passCheckQuestions, type CheckAnswer, type CourseSound } from './course';
import { answerDrill, currentQuestion, drawRound, isRoundOver, questionFor, startRound, type DrillState } from './drill';
import { QuestionCard } from './QuestionCard';
import { ipaSeed } from './seed';
import { strengthOf, type IpaProgress } from './progress';

export const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';
export const PRIMARY = `${BUTTON} border-accent bg-accent text-accent-fg`;
export const PLAIN = `${BUTTON} border-line text-accent active:bg-line`;

/** The drill: `pool` is the sounds whose card he has opened. */
export function IpaDrill({ progress, sounds, onDone }: { progress: IpaProgress; sounds: readonly CourseSound[]; onDone: () => void }) {
  const scheme = chosenPronunciation();
  // the sounds he has opened when the drill starts: a card opened meanwhile joins the next drill
  const [pool] = useState(() => progress.learned);
  const [start] = useState(progress);
  const [seed] = useState(() => ipaSeed.next());
  const [round, setRound] = useState(1);
  const [state, setState] = useState<DrillState>(() => startRound(drawRound(pool, (id) => strengthOf(start, id), mulberry32(seed))));
  const [picked, setPicked] = useState<SoundId | null>(null);
  const item = currentQuestion(state);
  const question = useMemo(() => (item ? questionFor(item, state.asked, seed + round, pool, sounds, scheme) : null), [item, state.asked, seed, round, pool, sounds, scheme]);
  const lesson = question ? sounds.find((s) => s.id === question.right) : undefined;

  const pick = (id: SoundId): void => {
    if (!question || picked !== null) return;
    setPicked(id);
    void noteIpaAnswer(question.sound, question.direction, id === question.right);
  };
  const next = (): void => {
    if (!question || picked === null) return;
    setState(answerDrill(state, picked === question.right));
    setPicked(null);
  };
  const another = (): void => {
    setRound(round + 1);
    setState(startRound(drawRound(pool, (id) => strengthOf(start, id), mulberry32(seed + round + 1))));
  };

  if (isRoundOver(state)) {
    return (
      <main className="screen min-h-0 flex-1 px-4 pt-4" data-testid="ipa-round-result">
        <h2 className="text-2xl font-bold">
          {state.rights} of {state.asked} right
        </h2>
        <p className="mt-2 text-base text-muted">
          {state.missed.length === 0 ? 'Nothing missed this round.' : `Missed and put right: ${[...new Set(state.missed.map((k) => k.split(':')[0]))].join('  ')}`}
        </p>
        <div className="mt-5 flex flex-col gap-2 pb-[var(--lp-end-inset)]">
          <button type="button" data-testid="ipa-another" ref={focusOnMount} onClick={another} className={PRIMARY}>
            Another round
          </button>
          <button type="button" data-testid="ipa-done" onClick={onDone} className={PLAIN}>
            Done
          </button>
        </div>
      </main>
    );
  }
  const right = picked === question?.right;
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4">
      <p data-testid="ipa-step" className="mb-2 text-sm text-muted">
        Round {round} · {state.queue.length} to go
      </p>
      {question ? <QuestionCard key={`${round}:${state.asked}`} question={question} picked={picked} onPick={pick} tell /> : null}
      {picked !== null && question && lesson ? (
        <div role="status" data-testid="ipa-told" data-result={right ? 'right' : 'wrong'} className="mt-3 text-lg">
          <p className={`font-medium ${right ? 'text-good' : 'text-bad'}`}>{right ? 'Right.' : 'Not quite. It comes back.'}</p>
          <p className="mt-1">
            {greekMarked(lesson.word)} has {lesson.id}, {lesson.keyWord}.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-base text-muted">Tap an answer.</p>
      )}
      {picked !== null ? (
        <NextBar>
          <button type="button" data-testid="ipa-next" ref={focusOnMount} onClick={next} className={PRIMARY}>
            Next
          </button>
        </NextBar>
      ) : null}
      <div className="pb-4" />
    </main>
  );
}

/** The pass check; `onResult` is told how it went when the last question is answered. */
export function IpaCheck({ sounds, onResult }: { sounds: readonly CourseSound[]; onResult: (answers: CheckAnswer[]) => void }) {
  const scheme = chosenPronunciation();
  const [questions] = useState(() => passCheckQuestions(sounds, mulberry32(ipaSeed.next()), scheme));
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<CheckAnswer[]>([]);
  const [picked, setPicked] = useState<SoundId | null>(null);
  const question = questions[at];
  const pick = (id: SoundId): void => {
    if (picked === null) setPicked(id);
  };
  const next = (): void => {
    if (picked === null) return;
    const answer: CheckAnswer = { sound: question.sound, direction: question.direction, right: picked === question.right };
    void noteIpaAnswer(answer.sound, answer.direction, answer.right);
    const all = [...answers, answer];
    setAnswers(all);
    setPicked(null);
    if (at + 1 >= questions.length) onResult(all);
    else setAt(at + 1);
  };
  return (
    <main className="screen min-h-0 flex-1 px-4 pt-4">
      <p data-testid="ipa-step" className="mb-2 text-sm text-muted">
        Pass check · Question {at + 1} of {questions.length}
      </p>
      <QuestionCard key={at} question={question} picked={picked} onPick={pick} tell={false} />
      {picked === null ? <p className="mt-3 text-base text-muted">Tap an answer. Nothing is told until the end.</p> : null}
      {picked !== null ? (
        <NextBar>
          <button type="button" data-testid="ipa-next" ref={focusOnMount} onClick={next} className={PRIMARY}>
            {at + 1 >= questions.length ? 'Finish' : 'Next'}
          </button>
        </NextBar>
      ) : null}
      <div className="pb-4" />
    </main>
  );
}
