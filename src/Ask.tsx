// src/Ask.tsx — the Verse view's 'Ask the tutor' action (src/VerseView.tsx): the answers kept, what the last question is doing, and the composer that asks.
// AskComposer is voice-kit's Composer (Hold to ask, Type a question; mw-jtzpw0.3), drawn at the foot of the view; AskStatus the Sending and Waiting lines and
// the failures; AnswerCards the kept answers (the tutor writes Markdown, src/markdown/). The questions in flight are src/useAsks.ts.
import { useLiveQuery } from 'dexie-react-hooks';
import { Composer, type ComposerLabels, type ComposerMessage } from 'voice-kit/composer';
import { useEffect, useRef, type FormEvent } from 'react';
import type { Verse } from './data/chapter';
import { unitId } from './data/passage';
import { listAnswers, verseRef, type TutorAnswer } from './data/repositories';
import { askBySetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { FAILURE_TITLES, MAX_QUESTION_CHARS } from './services/tutor';
import type { AskState } from './useAsks';
import { Markdown } from './markdown/Markdown';
import { CopyExchange } from './share/CopyExchange';
import { answerRuns } from './speech/answerRuns';
import { ReadAloud } from './speech/ReadAloud';
import { askTranscriber } from './speech/askTranscriber';
import { tapWord, useTalkSettings } from './talkSettings';
import { failureLine, makersSummary, PICTURES_FOR_THE_MAKERS, sendToMakers } from './talk/makers';
import { preparePictures, refuseNonPicture, TALK_MAX_PICTURES, TOO_MANY_TO_SEND_LINE } from './talk/pictures';
import { SendToMakers } from './talk/SendToMakers';
import { useSendToMakers } from './talk/useSendToMakers';
import { stopAnswerSpeech } from './speech/readAloud';
import { askAnswerId, speakTutor, stopOnTap } from './speech/tutorVoice';
import { BridgeIdeaHost, BridgeOffer } from './talk/BridgeOffer';
import { openBridgeIdea } from './talk/offers';
import { PendingQuestion } from './ui/PendingQuestion';
import { keepPlaced, revealFoot, revealLines } from './ui/keepInView';
import { revealTop } from './ui/reveal';
import { YouSaid } from './ui/YouSaid';
import { useElapsed } from './ui/useElapsed';
import { askDraftKey, readDraft, writeDraft } from './ui/unsentDraft';
import { GREEK_LANG } from './script/greekLang';

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
  const cards = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopAnswerSpeech();
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
    if (newest) {
      speakTutor(askAnswerId(newest.id), answerRuns(newest.answer), () => mounted.current);
      // the answer comes under a long passage: bring its first lines into view, clear of the composer and the speaking bar (mw-5r3p30.170); and under a long question
      // of his own, the first lines of the answer, not the top of his question (mw-5r3p30.493)
      const card = cards.current?.querySelector<HTMLElement>('[data-answer]:last-of-type') ?? null;
      const box = card?.closest<HTMLElement>('.screen');
      const text = card?.querySelector<HTMLElement>('[data-answer-text]');
      if (card && box && text) keepPlaced(box, () => {
        revealTop(card);
        revealLines(box, text, 3);
      }, [card]);
      else revealTop(card);
    }
  }, [answers, ref]);
  if (!answers?.length) return null;
  return (
    <div ref={cards} data-answers-for={verse} className="mb-2 space-y-2 px-1">
      {answers.map((a) => (
        <AnswerCard key={a.id} answer={a} />
      ))}
      <BridgeIdeaHost owner="ask" />
    </div>
  );
}

function AnswerCard({ answer }: { answer: TutorAnswer }) {
  const { bridge } = answer;
  return (
    <article data-answer onClick={stopOnTap} className="rounded-xl border border-line bg-surface p-3">
      <p data-answer-question className="break-words text-sm text-muted">{answer.cleanQuestion ?? answer.question}</p>
      <YouSaid spoken={answer.spoken} said={answer.question} shown={answer.cleanQuestion} />
      <div data-answer-text className="mt-1 break-words text-lg leading-snug">
        <Markdown text={answer.answer} />
      </div>
      {answer.changes?.map((change) => (
        <p key={change.key} data-answer-change className="mt-1 text-base text-muted">
          Changed: {change.shown}
        </p>
      ))}
      {answer.words.length > 0 ? (
        <dl className="mt-2 space-y-1 border-t border-line pt-2">
          {answer.words.map((w, i) => (
            <div key={i} className="flex gap-3">
              <dt {...GREEK_LANG} className="min-w-0 shrink-0 break-words font-greek text-2xl">
                {w.greek}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-base">
                <span {...GREEK_LANG} className="font-greek text-lg">
                  {w.lemma}
                </span>
                <span className="text-muted"> — {w.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {bridge ? <BridgeOffer bridge={bridge} onTake={(next) => openBridgeIdea(next, 'ask')} /> : null}
      <div className="-mb-1 mt-1 flex flex-wrap items-start justify-end gap-1">
        <CopyExchange place={answer.ref} question={answer.cleanQuestion ?? answer.question} answer={answer.answer} />
        {answer.id === undefined ? null : <ReadAloud id={askAnswerId(answer.id)} runs={answerRuns(answer.answer)} />}
      </div>
    </article>
  );
}

/** What the question for `verse` (or a passage) is doing: its failure, with Retry, and the question shown above Waiting until the answer comes. */
export function AskStatus({ verse, state, onAsk }: { verse: Verse; state: AskState | undefined; onAsk: (verse: Verse, question: string) => void }) {
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const pending = useRef<HTMLDivElement>(null);
  const sentAt = state?.phase === 'sending' || state?.phase === 'waiting' ? state.startedAt : undefined;
  // after Send his question and the wait stand in view of the verse box, above the composer, however short the window (a phone held sideways, mw-5r3p30.437): the foot of the
  // block is brought in, no further than the wait's own line at the box's top
  useEffect(() => {
    const block = pending.current;
    const box = block?.closest<HTMLElement>('.screen');
    const wait = block?.querySelector<HTMLElement>('[role="status"]');
    if (!block || !box || !wait) return;
    return keepPlaced(box, () => revealFoot(box, block, wait), [block]);
  }, [sentAt]);
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
    <div ref={pending} data-ask-pending className="mb-3 space-y-2 px-1">
      <PendingQuestion text={state.question} />
      <Waiting state={state} />
    </div>
  );
}

/** The composer for `verse` (or a passage, src/data/passage.ts): voice-kit's Composer, speak-first or, by the setting Ask by, type-first, drawn at the foot of the Verse view. Hold to ask streams
 * his words as he speaks and a release asks; Type a question brings out the field and Send asks. It has Attach a picture and Take a photo (mw-5r3p30.760), but this
 * tutor does not look at pictures: they go with Send to the makers (src/talk/SendToMakers.tsx), which files what is in the composer as a request to the makers, and Send
 * with a picture in the row says so and sends nothing. A question that failed comes back into the field to be sent again, and words typed or pasted and not sent are kept for the verse and put back when the
 * composer opens again (src/ui/unsentDraft.ts, mw-5r3p30.495). */
export function AskComposer({ book, chapter, verse, reference, state, onAsk, prefill = null }: {
  book: string;
  chapter: number;
  verse: Verse;
  /** what the Verse view is about: 'Romans 8:1-11' */
  reference: string;
  state: AskState | undefined;
  onAsk: (verse: Verse, question: string) => void;
  /** a question to put in the field when the composer opens on that verse (the Parsing drill's link); he sends it himself */
  prefill?: { verse: number; text: string } | null;
}) {
  const askBy = useSetting(askBySetting) ?? 'speaking';
  const talkSettings = useTalkSettings();
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const failed = state?.phase === 'failed' ? state.question : '';
  const prefilled = verse.to === undefined && prefill?.verse === verse.n ? prefill.text : '';
  // The Composer holds its words itself and says nothing of them until Send, so the draft is read off its field: from what he types or pastes (input bubbles
  // up to the section), and, for words a hold left in the field, when the composer goes away. A sent question clears the draft and the field is not read again.
  const draftKey = askDraftKey(book, chapter, unitId(verse));
  const section = useRef<HTMLElement>(null);
  const sent = useRef(false);
  // a question that failed comes back into the field unsent, and is a draft again
  useEffect(() => {
    sent.current = false;
  }, [failed]);
  const keep = (field: HTMLTextAreaElement | null): void => {
    if (field && !sent.current) writeDraft(draftKey, field.value);
  };
  const onInput = (e: FormEvent<HTMLElement>): void => {
    if (e.target instanceof HTMLTextAreaElement) {
      sent.current = false;
      keep(e.target);
    }
  };
  useEffect(() => {
    const box = section.current;
    return () => keep(box?.querySelector('textarea') ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  const makers = useSendToMakers();
  const sendToTheMakers = async ({ text, files }: ComposerMessage): Promise<void> => {
    const message = text.trim();
    if (message.length > MAX_QUESTION_CHARS) throw new Error(`${message.length} of ${MAX_QUESTION_CHARS}: the message is too long to send. Shorten it; nothing has been cut.`);
    if (files.length > TALK_MAX_PICTURES) throw new Error(TOO_MANY_TO_SEND_LINE);
    const pictures = await preparePictures(files);
    try {
      await sendToMakers({ text: message || PICTURES_FOR_THE_MAKERS, summary: makersSummary(message), screen: 'Verse view', reference, pictures });
    } catch (err) {
      throw new Error(failureLine(err));
    }
    sent.current = true;
    writeDraft(draftKey, '');
  };
  const send = ({ text, files }: ComposerMessage): boolean => {
    const question = text.trim();
    if (files.length > 0) throw new Error(PICTURES_NEED_THE_MAKERS);
    if (!question || busy) return false;
    if (question.length > MAX_QUESTION_CHARS) throw new Error(`${question.length} of ${MAX_QUESTION_CHARS}: the question is too long to send. Shorten it; nothing has been cut.`);
    onAsk(verse, question);
    sent.current = true;
    writeDraft(draftKey, '');
    return true;
  };
  return (
    <section ref={section} aria-label="Ask the tutor" data-ask={unitId(verse)} onInput={onInput}>
      <SendToMakers action={makers} host={section} />
      {/* a failed question remounts the composer with it in the field */}
      <Composer
        key={`${unitId(verse)}:${failed}`}
        mode={askBy === 'typing' ? 'type' : 'speak'}
        settings={{ ...talkSettings, attach: true, camera: true }}
        refuseFile={refuseNonPicture}
        transcriber={askTranscriber}
        lang="en-US"
        appName="Lampas"
        labels={{ ...ASK_LABELS, hold: tapWord('Hold to ask', talkSettings.talk) }}
        initialText={failed || prefilled || readDraft(draftKey)}
        disabled={busy}
        onSend={(message) => makers.dispatch(message, sendToTheMakers, send)}
      />
    </section>
  );
}

/** The composer's words for asking the tutor. */
const ASK_LABELS: Partial<ComposerLabels> = {
  hold: 'Hold to ask', // tapWord makes it Tap to ask while Talk is Tap
  typeInstead: 'Type a question',
  placeholder: 'Type a question',
  message: 'Your question',
  speak: 'Ask by speaking',
  attach: 'Attach a picture',
  camera: 'Take a photo',
  toSend: 'Pictures to send',
};

/** Said when Send has a picture in the row: the tutor here does not look at pictures, and a picture is never dropped without his knowing. */
const PICTURES_NEED_THE_MAKERS = 'The tutor here does not look at pictures. Tap Send to the makers to send them, or take them out and ask again.';
