// src/Ask.tsx — the Verse view's 'Ask the tutor' action (src/VerseView.tsx): the Ask box and the answers kept above it. AskBox is the field,
// the Sending and Waiting lines and the failures; AnswerCards the kept answers (the tutor writes Markdown, src/markdown/). The questions in
// flight are src/useAsks.ts; the hold bar that asks by voice is the Verse view's.
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import type { Verse } from './data/chapter';
import { listAnswers, verseRef, type TutorAnswer } from './data/repositories';
import { FAILURE_TITLES, MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './useAsks';
import { Markdown } from './markdown/Markdown';
import { useElapsed } from './ui/useElapsed';

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
      <div className="mt-1 break-words text-lg leading-snug">
        <Markdown text={answer.answer} />
      </div>
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

/** The Ask box for `verse`: the field, with what its last question is doing. */
export function AskBox({ verse, state, onAsk, prefill = null }: {
  verse: Verse;
  state: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  /** a question to put in the field when the box opens on that verse (the Parsing drill's link); he sends it himself */
  prefill?: { verse: number; text: string } | null;
}) {
  return <AskField key={verse.n} verse={verse} state={state} initial={prefill?.verse === verse.n ? prefill.text : ''} onAsk={(question) => onAsk(verse, question)} />;
}

/** The field and the Ask button for one verse, with what its last question is doing. */
function AskField({ verse, state, initial, onAsk }: { verse: Verse; state: AskState | undefined; initial: string; onAsk: (question: string) => void }) {
  const [text, setText] = useState(initial);
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const submit = (question: string): void => {
    if (!question.trim() || busy) return;
    onAsk(question);
    setText('');
  };
  return (
    <section aria-label="Ask the tutor" data-ask={verse.n} className="mb-3 space-y-2 px-1">
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
