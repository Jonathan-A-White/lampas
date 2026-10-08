// src/DrillScreen.tsx — the Parsing drill: ten words of the chapter he reads whose lemma he knows, each asked step by
// step (part of speech first, then tense, voice and mood, or case, number and gender ...) with four choices. A step shows at
// once whether it was right; a miss shows the right choice and the full parsing, and so does the last step of a word.
// Every question has Ask the tutor and Talk about it, which send him to the Reader on that verse (src/nav/readerRequest.ts).
// The words come from src/data/drill.ts; each answer is kept per word and step (src/data/repositories/drills.ts).
import { useEffect, useRef, useState } from 'react';
import { loadChapter } from './data/chapter';
import { drawDrill, type DrillQuestion } from './data/drill';
import { clearDrill, readDrill, saveDrill, type SavedDrill } from './data/drillKeep';
import type { Random } from './data/quiz';
import { READER_CHAPTER } from './data/readerChapter';
import { listWords, recordDrillStep, seedWordsIfFirstOpen } from './data/repositories';
import { askInReader, talkInReader } from './nav/readerRequest';
import { navigate } from './nav/route';
import { HeaderButton, ScreenHeader } from './ScreenHeader';
import { focusOnMount } from './ui/focus';

interface Session {
  status: 'loading' | 'offer' | 'failed' | 'ready';
  questions: DrillQuestion[];
  /** the word, and the step of it, he is on; a word number past the last is the end of the round */
  question: number;
  step: number;
  picked: string | null;
  missed: number[];
  asked: number;
  right: number;
}

const FRESH: Omit<Session, 'status'> = { questions: [], question: 0, step: 0, picked: null, missed: [], asked: 0, right: 0 };

const restored = ({ questions, question, step, picked, missed, asked, right }: SavedDrill): Session => ({
  status: 'ready',
  questions,
  question,
  step,
  picked,
  missed,
  asked,
  right,
});

/** He is back from the Reader (Ask the tutor, Talk about it) if he left it within this long. */
const BACK_FROM_READER_MS = 15 * 60 * 1000;

/** A round left half done is picked up where it stopped when he went to the Reader from it a moment ago; otherwise it is offered (Resume | New round). */
function opening(): Session {
  const saved = readDrill();
  if (!saved) return { status: 'loading', ...FRESH };
  const back = saved.away !== null && Date.now() - saved.away < BACK_FROM_READER_MS;
  return back ? restored(saved) : { ...restored(saved), status: 'offer' };
}

const keep = (s: Session, away: number | null = null): void =>
  saveDrill({ questions: s.questions, question: s.question, step: s.step, picked: s.picked, missed: s.missed, asked: s.asked, right: s.right, away });

async function drawRound(random: Random): Promise<DrillQuestion[]> {
  // A first open seeds the words; wait for it so a drill opened straight away has words to ask.
  await seedWordsIfFirstOpen();
  const [words, chapter] = await Promise.all([listWords(), loadChapter(READER_CHAPTER.book, READER_CHAPTER.chapter)]);
  return drawDrill(chapter, words, random);
}

const OPTION_BASE = 'block min-h-14 w-full rounded-xl border px-4 py-3 text-left text-lg first-letter:uppercase disabled:opacity-100';
const OPTION_LOOK = {
  idle: 'border-line bg-surface',
  right: 'border-good bg-good/20 font-medium',
  wrong: 'border-bad bg-bad/20 font-medium',
  other: 'border-line bg-surface text-muted',
};

/** The verse, with the word asked about marked; the box scrolls (a long verse) to show the word. */
function VerseWithWord({ q }: { q: DrillQuestion }) {
  const box = useRef<HTMLParagraphElement>(null);
  const mark = useRef<HTMLElement>(null);
  useEffect(() => {
    // Scroll the verse's own box, never the page (docs/pwa-best-practices.md section 7).
    if (box.current && mark.current) box.current.scrollTop = Math.max(0, mark.current.offsetTop - box.current.clientHeight / 2);
  }, [q]);
  return (
    <p
      ref={box}
      data-testid="drill-verse"
      lang="grc"
      className="relative max-h-[20dvh] overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface px-3 py-2 font-greek text-2xl leading-snug"
    >
      {q.words.map((w, i) => (
        <span key={i}>
          {i > 0 ? ' ' : ''}
          {i === q.at ? (
            <mark ref={mark} data-testid="drill-word" data-lemma={q.lemma} data-verse={q.verse} data-at={q.at} className="rounded bg-accent px-1 text-accent-fg">
              {w}
            </mark>
          ) : (
            w
          )}
        </span>
      ))}
    </p>
  );
}

export function DrillScreen({ newRandom = () => Math.random }: { newRandom?: () => Random }) {
  const [s, setS] = useState<Session>(opening);

  const another = () => {
    clearDrill();
    setS({ status: 'loading', ...FRESH });
    start();
  };

  const start = () => {
    drawRound(newRandom()).then(
      (questions) => {
        const next: Session = { status: 'ready', ...FRESH, questions };
        if (questions.length > 0) keep(next);
        setS(next);
      },
      () => setS({ status: 'failed', ...FRESH }),
    );
  };

  const resume = () => {
    const saved = readDrill();
    if (!saved) return another();
    setS(restored(saved));
    keep(restored(saved));
  };

  useEffect(() => {
    if (s.status !== 'loading') return;
    start();
    // A round is drawn once, when the screen opens; Another round draws the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = s.questions.length;
  const finished = s.status === 'ready' && total > 0 && s.question >= total;
  const question = s.questions[s.question];
  const step = question?.steps[s.step];
  const reader = READER_CHAPTER;

  const header = (
    <ScreenHeader
      title="Parsing drill"
      subtitle={s.status === 'ready' && question ? `Word ${s.question + 1} of ${total} · step ${s.step + 1} of ${question.steps.length}` : reader.title}
      back={<HeaderButton onClick={() => navigate('test')}>‹ Test</HeaderButton>}
    />
  );

  if (s.status === 'offer') {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-lg">Round left unfinished</p>
          <p className="mt-1 text-muted">Go on where you stopped, or start a new round.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={resume} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
              Resume
            </button>
            <button type="button" onClick={another} className="min-h-12 rounded-xl border border-line text-lg font-medium">
              New round
            </button>
          </div>
        </main>
      </>
    );
  }

  if (s.status === 'loading') return <>{header}<main className="screen min-h-0 flex-1" aria-busy="true" /></>;

  if (s.status === 'failed') {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p role="alert" className="text-lg">Could not load {reader.title}.</p>
          <p className="mt-1 text-muted">Check the connection, then try again.</p>
          <button type="button" onClick={another} className="mt-6 min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg">
            Try again
          </button>
        </main>
      </>
    );
  }

  if (total === 0) {
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-6 pt-8 text-center">
          <p className="text-lg">No words of {reader.title} to drill yet.</p>
          <p className="mt-1 text-muted">Words that are solid or learning are asked here. Add some with Import.</p>
        </main>
      </>
    );
  }

  if (finished) {
    const score = total - s.missed.length;
    return (
      <>
        {header}
        <main className="screen min-h-0 flex-1 px-4 pt-6">
          <p data-testid="score" className="text-center text-4xl font-semibold">
            {score} of {total}
          </p>
          <p className="mt-1 text-center text-muted">words with every step right ({s.right} of {s.asked} steps)</p>
          {s.missed.length > 0 ? (
            <section aria-labelledby="missed-title" className="mt-6">
              <h2 id="missed-title" className="px-1 pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
                Missed
              </h2>
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {s.missed.map((i) => (
                  <li key={i} data-missed={s.questions[i].lemma} className="px-3 py-2">
                    <span lang="grc" className="block break-words font-greek text-2xl">{s.questions[i].form}</span>
                    <span className="block break-words text-sm text-muted">
                      {s.questions[i].reference}: {s.questions[i].parsing}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="mt-6 text-center text-lg">All right. Well done.</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('home')} className="min-h-12 rounded-xl border border-line text-lg font-medium">
              Done
            </button>
            <button type="button" onClick={another} className="min-h-12 rounded-xl bg-accent text-lg font-medium text-accent-fg">
              Another round
            </button>
          </div>
        </main>
      </>
    );
  }

  const answered = s.picked !== null;
  const lastStep = s.step === question.steps.length - 1;
  const lastWord = s.question === total - 1;
  const rightPick = answered && s.picked === step.right;
  const lookOf = (option: string): keyof typeof OPTION_LOOK => {
    if (!answered) return 'idle';
    if (option === step.right) return 'right';
    return option === s.picked ? 'wrong' : 'other';
  };

  const pick = (option: string) => {
    if (answered) return;
    const right = option === step.right;
    const next: Session = {
      ...s,
      picked: option,
      asked: s.asked + 1,
      right: s.right + (right ? 1 : 0),
      missed: right || s.missed.includes(s.question) ? s.missed : [...s.missed, s.question],
    };
    keep(next);
    setS(next);
    void recordDrillStep(question.lemma, step.id, right);
  };

  const goOn = () => {
    const next: Session = lastStep ? { ...s, question: s.question + 1, step: 0, picked: null } : { ...s, step: s.step + 1, picked: null };
    if (lastStep && lastWord) clearDrill();
    else keep(next);
    setS(next);
  };

  const ask = () => {
    keep(s, Date.now());
    askInReader(question.chapter, question.verse, `Parse ${question.form} in ${question.reference}: why is it ${question.parsing}?`);
  };
  const talk = () => {
    keep(s, Date.now());
    talkInReader(question.chapter, question.verse);
  };

  return (
    <>
      {header}
      <main className="screen min-h-0 flex-1 px-4 pt-4">
        <VerseWithWord q={question} />
        <p className="mt-1 text-sm text-muted">{question.reference}</p>
        <p data-testid="drill-step" data-step-id={step.id} className="mt-3 text-center text-xl font-semibold">
          What is the {step.label.toLowerCase()} of{' '}
          <span lang="grc" className="font-greek text-2xl">
            {question.form}
          </span>
          ?
        </p>
        <ul className="mt-3 space-y-3">
          {step.options.map((option) => {
            const look = lookOf(option);
            return (
              <li key={`${s.question}:${s.step}:${option}`}>
                <button
                  type="button"
                  data-option
                  data-result={look === 'right' || look === 'wrong' ? look : undefined}
                  disabled={answered}
                  onClick={() => pick(option)}
                  className={`${OPTION_BASE} ${OPTION_LOOK[look]}`}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>
        <div role="status" data-testid="feedback" className="mt-3 min-h-6 text-center text-lg">
          {!answered ? '' : rightPick ? 'Right.' : `Not quite. It is ${step.right}.`}
        </div>
        {answered && (!rightPick || lastStep) ? (
          <p data-testid="drill-parsing" className="mt-1 text-center text-base">
            <span className="text-muted">Full parsing: </span>
            {question.parsing}
          </p>
        ) : null}
        {answered ? (
          <button
            type="button"
            data-testid="next"
            ref={focusOnMount}
            onClick={goOn}
            className="mt-3 min-h-12 w-full rounded-xl bg-accent text-lg font-medium text-accent-fg"
          >
            {!lastStep ? 'Next step' : lastWord ? 'Finish' : 'Next word'}
          </button>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3 pb-4">
          <button type="button" onClick={ask} className="min-h-12 rounded-xl border border-line text-base font-medium">
            Ask the tutor
          </button>
          <button type="button" onClick={talk} className="min-h-12 rounded-xl border border-line text-base font-medium">
            Talk about it
          </button>
        </div>
      </main>
    </>
  );
}
