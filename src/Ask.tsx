// src/Ask.tsx — the Ask box under the selected verse and the answers kept under it. AskBox is the field, the
// Sending and Waiting lines and the failures; AnswerCards the kept answers. The questions in flight are src/useAsks.ts.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import type { Chapter, Verse } from './data/chapter';
import { useLatest } from './events/bus';
import { listAnswers, verseRef, type TutorAnswer } from './data/repositories';
import { FAILURE_TITLES, MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './useAsks';
import { revealInScrollBox } from './ui/reveal';
import { setVisibleInterval } from './ui/visibleInterval';

/** Whole seconds since `since`, ticking while the page is visible. */
function useElapsed(since: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setVisibleInterval(() => setNow(Date.now()), 1000), []);
  return Math.max(0, Math.floor((now - since) / 1000));
}

export function Waiting({ state }: { state: Extract<AskState, { phase: 'sending' | 'waiting' }> }) {
  const seconds = useElapsed(state.startedAt);
  return (
    <p role="status" className="text-base text-muted">
      {state.phase === 'sending' ? 'Sending…' : `Waiting for the tutor… ${seconds} s`}
    </p>
  );
}

export function AnswerCards({ verse, book, chapter }: { verse: number; book: string; chapter: number }) {
  const ref = verseRef(book, chapter, verse);
  const answers = useLiveQuery(() => listAnswers(ref), [ref]);
  if (!answers?.length) return null;
  return (
    <div data-answers-for={verse} className="mb-2 space-y-2 px-1">
      {answers.map((a) => (
        <AnswerCard key={a.id} answer={a} />
      ))}
    </div>
  );
}

function AnswerCard({ answer }: { answer: TutorAnswer }) {
  return (
    <article data-answer className="rounded-xl border border-line bg-surface p-3">
      <p className="break-words text-sm text-muted">{answer.question}</p>
      <p className="mt-1 break-words text-lg leading-snug">{answer.answer}</p>
      {answer.words.length > 0 ? (
        <dl className="mt-2 space-y-1 border-t border-line pt-2">
          {answer.words.map((w, i) => (
            <div key={i} className="flex gap-3">
              <dt lang="grc" className="min-w-0 shrink-0 break-words font-greek text-2xl">
                {w.greek}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-base">
                <span lang="grc" className="font-greek text-lg">
                  {w.lemma}
                </span>
                <span className="text-muted"> — {w.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

/** The Ask box for the verse the bus says is selected (verse-selected), in `chapter`; nothing when there is none. */
export function AskBox({ chapter, asks, onAsk, reveal }: {
  chapter: Chapter;
  asks: Record<number, AskState | undefined>;
  onAsk: (verse: Verse, question: string) => void;
  /** Scroll the box into view as it appears: when he just tapped the verse; not when the selection was put back by a reopen or Back */
  reveal: boolean;
}) {
  const selected = useLatest('verse-selected');
  const verse = selected?.verse == null || selected.chapter !== chapter.chapter ? undefined : chapter.verses.find((v) => v.n === selected.verse);
  return verse ? <AskField key={verse.n} verse={verse} state={asks[verse.n]} reveal={reveal} onAsk={(question) => onAsk(verse, question)} /> : null;
}

/** The field and the Ask button for one verse, with what its last question is doing. */
function AskField({ verse, state, reveal, onAsk }: { verse: Verse; state: AskState | undefined; reveal: boolean; onAsk: (question: string) => void }) {
  const [text, setText] = useState('');
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reveal) revealInScrollBox(section.current);
    // Once, as the box appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = (question: string): void => {
    if (!question.trim() || busy) return;
    onAsk(question);
    setText('');
  };
  return (
    <section ref={section} aria-label="Ask the tutor" data-ask={verse.n} className="mb-3 space-y-2 rounded-xl border border-line px-3 py-3">
      <label className="block text-sm text-muted" htmlFor={`ask-${verse.n}`}>
        Ask the tutor about verse {verse.n}
      </label>
      <textarea
        id={`ask-${verse.n}`}
        aria-label="Your question"
        rows={2}
        maxLength={MAX_QUESTION_CHARS}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        className="block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg"
      />
      {state?.phase === 'failed' ? (
        <div role="alert" className="space-y-2">
          <p className="text-base font-semibold text-bad">{FAILURE_TITLES[state.failure]}</p>
          <p className="break-words text-sm text-muted">{state.detail}</p>
          {state.failure === 'not-sent' ? null : (
            <button
              type="button"
              onClick={() => onAsk(state.question)}
              className="min-h-12 rounded-xl border border-line px-5 text-base font-medium"
            >
              Retry
            </button>
          )}
        </div>
      ) : null}
      {busy ? <Waiting state={state} /> : null}
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => submit(text)}
        className="min-h-12 w-full rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg disabled:opacity-40"
      >
        Ask
      </button>
    </section>
  );
}
