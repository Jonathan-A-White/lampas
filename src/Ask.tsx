// src/Ask.tsx — the Verse view's 'Ask the tutor' action (src/VerseView.tsx): the Ask box and the answers kept above it. AskBox is the field,
// the Sending and Waiting lines and the failures; AnswerCards the kept answers (the tutor writes Markdown, src/markdown/). The questions in
// flight are src/useAsks.ts; the hold bar that asks by voice is the Verse view's.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import type { Verse } from './data/chapter';
import { unitId, unitName } from './data/passage';
import { listAnswers, verseRef, type TutorAnswer } from './data/repositories';
import { FAILURE_TITLES, MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './useAsks';
import { Markdown } from './markdown/Markdown';
import { answerRuns } from './speech/answerRuns';
import { stopAnswer } from './speech/readAloud';
import { askAnswerId, speakTutor, stopOnTap } from './speech/tutorVoice';
import { PendingQuestion } from './ui/PendingQuestion';
import { useElapsed } from './ui/useElapsed';

export function Waiting({ state }: { state: Extract<AskState, { phase: 'sending' | 'waiting' }> }) {
  const seconds = useElapsed(state.startedAt);
  return (
    <p role="status" className="text-base text-muted">
      {state.phase === 'sending' ? 'Sending…' : `Waiting for the tutor… ${seconds} s`}
    </p>
  );
}

/** The answers kept for a verse (its number) or a passage (its unitId, '1-11'). */
export function AnswerCards({ verse, book, chapter }: { verse: number | string; book: string; chapter: number }) {
  const ref = verseRef(book, chapter, verse);
  const answers = useLiveQuery(() => listAnswers(ref), [ref]);
  // An answer that is stored while these cards are on screen is read aloud (the setting, src/speech/tutorVoice.ts); the answers already kept
  // when the cards open are not, and leaving them stops the speech.
  const known = useRef<{ ref: string; ids: Set<number> } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopAnswer();
    };
  }, []);
  useEffect(() => {
    if (!answers) return;
    const stored = answers.flatMap((a) => (a.id === undefined ? [] : [{ id: a.id, answer: a.answer }]));
    if (known.current?.ref !== ref) {
      known.current = { ref, ids: new Set(stored.map((a) => a.id)) };
      return;
    }
    const seen = known.current.ids;
    const fresh = stored.filter((a) => !seen.has(a.id));
    for (const a of fresh) seen.add(a.id);
    const newest = fresh[fresh.length - 1];
    if (newest) speakTutor(askAnswerId(newest.id), answerRuns(newest.answer), () => mounted.current);
  }, [answers, ref]);
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
    <article data-answer onClick={stopOnTap} className="rounded-xl border border-line bg-surface p-3">
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

/** The Ask box for `verse` (or a passage, src/data/passage.ts): the field, with what its last question is doing. */
export function AskBox({ verse, state, onAsk, prefill = null, hearing = null }: {
  verse: Verse;
  state: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  /** while he holds Hold to ask: his words so far fill the field as he speaks (null when he is not holding) */
  hearing?: { transcript: string } | null;
  /** a question to put in the field when the box opens on that verse (the Parsing drill's link); he sends it himself */
  prefill?: { verse: number; text: string } | null;
}) {
  return <AskField key={unitId(verse)} verse={verse} state={state} hearing={hearing} initial={verse.to === undefined && prefill?.verse === verse.n ? prefill.text : ''} onAsk={(question) => onAsk(verse, question)} />;
}

/** The field and the Ask button for one verse, with what its last question is doing. */
function AskField({ verse, state, hearing, initial, onAsk }: { verse: Verse; state: AskState | undefined; hearing: { transcript: string } | null; initial: string; onAsk: (question: string) => void }) {
  // null: nothing typed since the last send, so a question that failed shows in the field (to send again) and otherwise it is empty
  const [typed, setTyped] = useState<string | null>(initial || null);
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const field = useRef<HTMLTextAreaElement>(null);
  const text = typed ?? (state?.phase === 'failed' ? state.question : '');
  const submit = (question: string): void => {
    if (!question.trim() || busy) return;
    onAsk(question);
    setTyped(null);
  };
  // His first word brings the field into view above the hold bar, where he is looking (docs/pwa-best-practices.md section 12).
  const heard = hearing !== null && hearing.transcript !== '';
  useEffect(() => {
    // (jsdom has no scrollIntoView)
    if (heard) field.current?.scrollIntoView?.({ block: 'nearest' });
  }, [heard]);
  return (
    <section aria-label="Ask the tutor" data-ask={unitId(verse)} className="mb-3 space-y-2 px-1">
      <label className="block text-sm text-muted" htmlFor={`ask-${unitId(verse)}`}>
        Ask the tutor about {unitName(verse)}
      </label>
      <textarea
        ref={field}
        id={`ask-${unitId(verse)}`}
        aria-label="Your question"
        rows={2}
        maxLength={MAX_QUESTION_CHARS}
        value={hearing ? hearing.transcript : text}
        placeholder={hearing ? 'Listening…' : undefined}
        readOnly={hearing !== null}
        disabled={busy}
        onChange={(e) => setTyped(e.target.value)}
        className="block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg"
      />
      {state?.phase === 'failed' ? (
        <div role="alert" className="space-y-2">
          <p className="text-base font-semibold text-bad">{FAILURE_TITLES[state.failure]}</p>
          <p className="break-words text-sm text-muted">{state.detail}</p>
          {state.failure === 'not-sent' ? null : (
            <button
              type="button"
              onClick={() => {
                onAsk(state.question);
                setTyped(null);
              }}
              className="min-h-12 rounded-xl border border-line px-5 text-base font-medium"
            >
              Retry
            </button>
          )}
        </div>
      ) : null}
      {busy ? (
        // his question stays shown, as in the Talk sheet, until the answer card arrives
        <div data-ask-pending className="space-y-2">
          <PendingQuestion text={state.question} />
          <Waiting state={state} />
        </div>
      ) : null}
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
