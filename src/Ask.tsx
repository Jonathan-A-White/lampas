// src/Ask.tsx — the Verse view's 'Ask the tutor' action (src/VerseView.tsx): the answers kept, what the last question is doing, and the composer that asks.
// AskComposer is bsv-kit's Composer (Hold to ask, Type a question; mw-jtzpw0.3), drawn at the foot of the view; AskStatus the Sending and Waiting lines and
// the failures; AnswerCards the kept answers (the tutor writes Markdown, src/markdown/). The questions in flight are src/useAsks.ts.
import { useLiveQuery } from 'dexie-react-hooks';
import { Composer, type ComposerLabels, type ComposerMessage } from 'bsv-kit/composer';
import { useEffect, useRef } from 'react';
import type { Verse } from './data/chapter';
import { unitId } from './data/passage';
import { listAnswers, verseRef, type TutorAnswer } from './data/repositories';
import { FAILURE_TITLES, MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './useAsks';
import { Markdown } from './markdown/Markdown';
import { CopyExchange } from './share/CopyExchange';
import { answerRuns } from './speech/answerRuns';
import { askTranscriber } from './speech/askTranscriber';
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
      <p data-answer-question className="break-words text-sm text-muted">{answer.cleanQuestion ?? answer.question}</p>
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
      <div className="-mb-1 mt-1 flex justify-end">
        <CopyExchange place={answer.ref} question={answer.cleanQuestion ?? answer.question} answer={answer.answer} />
      </div>
    </article>
  );
}

/** What the question for `verse` (or a passage) is doing: its failure, with Retry, and the question shown above Waiting until the answer comes. */
export function AskStatus({ verse, state, onAsk }: { verse: Verse; state: AskState | undefined; onAsk: (verse: Verse, question: string) => void }) {
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  if (state?.phase === 'failed') {
    return (
      <div role="alert" data-ask-failed={unitId(verse)} className="mb-3 space-y-2 px-1">
        <p className="text-base font-semibold text-bad">{FAILURE_TITLES[state.failure]}</p>
        <p className="break-words text-sm text-muted">{state.detail}</p>
        {state.failure === 'not-sent' ? null : (
          <button type="button" onClick={() => onAsk(verse, state.question)} className="min-h-12 rounded-xl border border-line px-5 text-base font-medium">
            Retry
          </button>
        )}
      </div>
    );
  }
  if (!busy) return null;
  // his question stays shown, as in the Talk sheet, until the answer card arrives
  return (
    <div data-ask-pending className="mb-3 space-y-2 px-1">
      <PendingQuestion text={state.question} />
      <Waiting state={state} />
    </div>
  );
}

/** The composer for `verse` (or a passage, src/data/passage.ts): bsv-kit's Composer in speak mode, drawn at the foot of the Verse view. Hold to ask streams
 * his words as he speaks and a release asks; Type a question brings out the field and Send asks. The tutor takes no photo or file, so there is no attach
 * or camera. A question that failed comes back into the field to be sent again. */
export function AskComposer({ verse, state, onAsk, prefill = null }: {
  verse: Verse;
  state: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  /** a question to put in the field when the composer opens on that verse (the Parsing drill's link); he sends it himself */
  prefill?: { verse: number; text: string } | null;
}) {
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const failed = state?.phase === 'failed' ? state.question : '';
  const prefilled = verse.to === undefined && prefill?.verse === verse.n ? prefill.text : '';
  const send = ({ text }: ComposerMessage): boolean => {
    const question = text.trim();
    if (!question || busy) return false;
    if (question.length > MAX_QUESTION_CHARS) throw new Error(`A question can be at most ${MAX_QUESTION_CHARS} characters; yours is ${question.length}.`);
    onAsk(verse, question);
    return true;
  };
  return (
    <section aria-label="Ask the tutor" data-ask={unitId(verse)}>
      {/* a failed question remounts the composer with it in the field */}
      <Composer
        key={`${unitId(verse)}:${failed}`}
        mode="speak"
        transcriber={askTranscriber}
        lang="en-US"
        appName="Lampas"
        labels={ASK_LABELS}
        initialText={failed || prefilled}
        disabled={busy}
        onSend={send}
      />
    </section>
  );
}

/** The composer's words for asking the tutor. */
const ASK_LABELS: Partial<ComposerLabels> = {
  hold: 'Hold to ask',
  typeInstead: 'Type a question',
  placeholder: 'Type a question',
  message: 'Your question',
  speak: 'Ask by speaking',
};
