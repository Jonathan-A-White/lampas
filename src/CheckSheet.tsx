// src/CheckSheet.tsx — Check on a passage lesson (mw-z370x5.2, docs/grammar.md 'Passage lessons'): a full screen over the Verse view that passes the lesson by reading it. It asks up to CHECK_QUESTIONS
// of Lampas's own questions on the verses of the range (src/data/grammar/passageCheck.ts: a meaning and a parsing of each verse, easiest first), one at a time as Review draws them (GrammarCard).
// Each answer is a grammar answer on its idea (recordGrammarAnswer) credited to what it shows of the letters (noteAnswer), as Try it records one. At PASS_SHARE or more the end card says
// 'Passed: 7 of 8' and the lesson is passed (Learn next moves on); under it 'Read: 4 of 8' names the weak ideas, the lesson is read, and 'Try again tomorrow' puts it on the schedule
// ('Due today: 1 lesson' in Review) and 'Quiz me' hands it to the tutor (a grind). Only a Check writes: opening the view marks nothing, and Stop leaves with the answers kept.
import { useEffect, useRef, useState } from 'react';
import type { Chapter } from './data/chapter';
import { drillSeed } from './data/grammar/drillSeed';
import { CHECK_QUESTIONS, PASS_SHARE, passes, weakIdeas } from './data/grammar/passageCheck';
import type { GrammarQuestion } from './data/grammar/questions';
import { mulberry32 } from './data/quiz';
import { lessonCheckPassed, markPassed, markRead, noteAnswer, recordDrillStep, recordGrammarAnswer, tryAgainTomorrow } from './data/repositories';
import { GrammarCard } from './GrammarCard';
import { drawCheck } from './review/lessonCheck';
import { focusOnMount } from './ui/focus';
import { FootBar } from './ui/NextBar';
import { useSettled } from './ui/settle';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose } from './ui/sheetDrag';

const BUTTON = 'min-h-12 w-full rounded-xl border text-lg font-medium';

/** What a Check has to ask: the passage lesson's key, the range ('1 John 1:1-4'), its ideas and the chapter that holds it. */
export interface CheckLesson {
  key: string;
  label: string;
  from: number;
  to: number;
  ideas: string[];
  chapter: Chapter;
}

type Drawn = GrammarQuestion[] | 'none' | null;

export function CheckSheet({ lesson, onClose, onQuiz }: { lesson: CheckLesson; onClose: () => void; onQuiz?: () => void }) {
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const [drawn, setDrawn] = useState<Drawn>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<GrammarQuestion[]>([]);
  const [right, setRight] = useState(0);
  const [back, setBack] = useState<'tomorrow' | null>(null);
  // the writes follow one another, so the last answer is on the schedule before the lesson is marked
  const writing = useRef<Promise<unknown>>(Promise.resolve());
  const marked = useRef(false);
  const settled = useSettled(index);
  const questions = drawn && drawn !== 'none' ? drawn : null;
  const total = questions?.length ?? 0;
  const over = questions !== null && index >= total;
  const question = questions && !over ? questions[index] : null;
  const passed = over && passes(right, total);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const asked = await drawCheck(lesson.chapter, lesson.from, lesson.to, lesson.ideas, mulberry32(drillSeed.next()));
        if (alive) setDrawn(asked.length > 0 ? asked.slice(0, CHECK_QUESTIONS) : 'none');
      } catch (error) {
        console.error('could not draw the check', error);
        if (alive) setDrawn('none');
      }
    })();
    return () => {
      alive = false;
    };
    // the questions are drawn once, when the sheet opens: they do not change under his thumb as his levels do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The end of the Check marks the lesson: passed at PASS_SHARE or more, else read. Once.
  useEffect(() => {
    if (!over || marked.current) return;
    marked.current = true;
    void writing.current
      .then(async () => {
        if (passed) {
          await markPassed(lesson.key, right / total);
          await lessonCheckPassed(lesson.key);
        } else await markRead(lesson.key);
      })
      .catch((error: unknown) => console.error('could not mark the lesson', error));
  }, [over, passed, right, total, lesson.key]);

  const pick = (option: string): void => {
    if (!question || picked !== null) return;
    const wasRight = option === question.right;
    setPicked(option);
    if (wasRight) setRight((n) => n + 1);
    else setWrong((w) => [...w, question]);
    writing.current = writing.current
      .then(async () => {
        await recordGrammarAnswer(question.ideaId, wasRight);
        // a form read right shows its letters, sounds and marks; a miss on a letter or sound counts against it
        await noteAnswer(question, wasRight);
      })
      .catch((error: unknown) => console.error('could not record the answer', error));
  };
  const step = (parsing: { id: string }, wasRight: boolean): void => {
    const lemma = question?.lemma;
    if (!lemma) return;
    writing.current = writing.current.then(() => recordDrillStep(lemma, parsing.id, wasRight)).catch((error: unknown) => console.error('could not record the step', error));
  };
  const next = (): void => {
    setIndex((n) => n + 1);
    setPicked(null);
  };
  const tryTomorrow = (): void => {
    writing.current = writing.current
      .then(() => tryAgainTomorrow(lesson.key))
      .then(() => setBack('tomorrow'))
      .catch((error: unknown) => console.error('could not put the lesson on the schedule', error));
  };
  const weak = weakIdeas(wrong);

  return (
    <div role="dialog" aria-modal="true" aria-label="Check" className="fixed inset-0 z-40 flex flex-col bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-1">
        <div className="min-w-0 flex-1">
          <h2 data-testid="check-title" className="truncate text-lg font-bold">
            Check: {lesson.label}
          </h2>
          {questions && !over ? (
            <p data-testid="check-step" className="truncate text-sm text-muted">
              Question {index + 1} of {total}
            </p>
          ) : null}
        </div>
        {over ? null : (
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
            Stop
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">
        {drawn === null ? (
          <p data-testid="check-loading" className="text-lg text-muted">
            Finding the questions…
          </p>
        ) : drawn === 'none' ? (
          <p className="text-lg">No question could be made on {lesson.label}. Read it again later.</p>
        ) : over ? (
          <div data-testid="check-result">
            {passed ? (
              <>
                <h3 className="text-2xl font-bold">
                  Passed: {right} of {total}
                </h3>
                <p className="mt-1 text-base text-muted">You followed {lesson.label}. Learn next moves on.</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold">
                  Read: {right} of {total}
                </h3>
                {weak.length > 0 ? <p className="mt-2 text-lg">Weak: {weak.join(', ')}</p> : null}
                <p className="mt-1 text-base text-muted">
                  {back === 'tomorrow' ? `${lesson.label} comes back tomorrow in Review.` : `You have read ${lesson.label}. It is passed at ${Math.ceil(PASS_SHARE * total)} right of ${total}.`}
                </p>
              </>
            )}
          </div>
        ) : question ? (
          <GrammarCard key={index} question={question} mode="choice" picked={picked} onPick={pick} onStep={step} sideBySide />
        ) : null}
      </div>
      <FootBar>
        {over ? (
          <div className="flex flex-col gap-2">
            {passed ? null : (
              <>
                <button type="button" disabled={back !== null} onClick={() => settled() && tryTomorrow()} className={`${BUTTON} border-accent bg-accent text-accent-fg disabled:opacity-50`}>
                  Try again tomorrow
                </button>
                {onQuiz ? (
                  <button type="button" onClick={() => settled() && onQuiz()} className={`${BUTTON} border-line text-accent active:bg-line`}>
                    Quiz me
                  </button>
                ) : null}
              </>
            )}
            <button type="button" ref={focusOnMount} onClick={() => settled() && onClose()} className={`${BUTTON} ${passed ? 'border-accent bg-accent text-accent-fg' : 'border-line text-accent active:bg-line'}`}>
              Done
            </button>
          </div>
        ) : drawn === 'none' ? (
          <button type="button" ref={focusOnMount} onClick={onClose} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            Done
          </button>
        ) : picked !== null ? (
          <button type="button" data-testid="check-next" ref={focusOnMount} onClick={next} className={`${BUTTON} border-accent bg-accent text-accent-fg`}>
            {index === total - 1 ? 'Finish' : 'Next'}
          </button>
        ) : null}
      </FootBar>
    </div>
  );
}
