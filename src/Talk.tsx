// src/Talk.tsx — Bible talk: the Talk bar at the bottom of the reader and the bottom sheet it opens, a conversation about the
// chapter or the selected verse. The sheet shows the turns so far (kept per chapter and per verse, src/data/repositories/talks.ts),
// a field, a hold-to-talk button and Send; what a message is doing is src/useTalk.ts's. He can talk instead of typing
// (src/useVoice.ts): the Talk button held for half a second, a verse number held, or the sheet's own mic button; his words
// show live while he holds and go on release. Each answer can be heard (read aloud through
// src/speech/readAloud.ts, a Stop while it plays) and its Greek words open the word sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Waiting } from './Ask';
import { findGreekWord } from './data/answerWord';
import { listTurns, type TalkTurn } from './data/repositories';
import { MAX_TALK_CHARS, scopeTitle, type TalkScope } from './services/talk';
import { FAILURE_TITLES } from './services/tutor';
import { startAnswer, stopAnswer, useReading } from './speech/readAloud';
import { Icon } from './speech/ReadControls';
import { answerRuns } from './speech/answerRuns';
import { focusOnMount, focusQuietly } from './ui/focus';
import { type HoldHandlers, useHoldPress } from './ui/holdPress';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import type { AskState } from './useAsks';
import type { Voice } from './useVoice';
import { WordSheet, type Lookup } from './WordSheet';

function BubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.6-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** The bar pinned at the bottom of the reader: one Talk button. A tap opens the sheet; a hold (half a second) opens it and
 * listens, and what he says goes on release. It is the lowest bar, so it alone keeps the safe-area inset. */
export function TalkBar({ hold }: { hold: HoldHandlers }) {
  const press = useHoldPress(hold);
  return (
    <div data-talk-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        {...press}
        className="flex min-h-12 w-full touch-none select-none items-center justify-center gap-2 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg [-webkit-touch-callout:none]"
      >
        <BubbleIcon />
        Talk
      </button>
    </div>
  );
}

/** The hold-to-talk button beside Send: listens from the first touch (or Space / Enter held) and sends on release. */
function HoldToTalk({ voice, disabled }: { voice: Voice; disabled: boolean }) {
  const press = useHoldPress({ onHold: voice.press, onRelease: () => void voice.release(), onDrop: voice.abort }, 0);
  return (
    <button
      type="button"
      aria-label="Hold to talk"
      aria-pressed={voice.listening}
      disabled={disabled}
      {...press}
      onClick={undefined}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        if (!e.repeat) voice.press();
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') void voice.release();
      }}
      className={`inline-flex min-h-12 min-w-14 shrink-0 touch-none select-none items-center justify-center rounded-xl text-accent-fg [-webkit-touch-callout:none] disabled:opacity-40 ${voice.listening ? 'bg-bad' : 'bg-accent'}`}
    >
      <MicIcon />
    </button>
  );
}

/** Hear the answer, or Stop while it is being read. */
function AnswerSpeaker({ turn }: { turn: TalkTurn }) {
  const reading = useReading();
  const id = turn.id as number;
  const playing = reading.status === 'reading' && reading.answer === id;
  return (
    <button
      type="button"
      aria-label={playing ? 'Stop' : 'Hear the answer'}
      aria-pressed={playing}
      onClick={() => (playing ? stopAnswer() : startAnswer(id, answerRuns(turn.a)))}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-accent active:bg-line"
    >
      <Icon kind={playing ? 'stop' : 'play'} />
    </button>
  );
}

function Turn({ turn, scope, onLook }: { turn: TalkTurn; scope: TalkScope; onLook: (lookup: Lookup) => void }) {
  return (
    <article data-turn className="space-y-2">
      <p data-talk-q className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg">
        {turn.q}
      </p>
      <div data-talk-a className="rounded-2xl border border-line px-3 py-2">
        <p className="break-words text-lg leading-snug">{turn.a}</p>
        {turn.words.length > 0 ? (
          <dl data-talk-words className="mt-2 space-y-1 border-t border-line pt-2">
            {turn.words.map((w, i) => {
              const found = findGreekWord(scope, w);
              return (
                <div key={i} className="flex items-start gap-3">
                  <dt className="shrink-0">
                    {found ? (
                      <button
                        type="button"
                        lang="grc"
                        onClick={() => onLook({ words: [found], english: found.e === undefined ? undefined : scope.chapter.verses.find((v) => v.g.includes(found))?.e[found.e]?.t, fromEnglish: false })}
                        className="min-h-11 break-words rounded-lg px-1 text-left font-greek text-2xl text-accent active:bg-line"
                      >
                        {w.greek}
                      </button>
                    ) : (
                      <span lang="grc" className="block min-h-11 break-words px-1 font-greek text-2xl leading-[44px]">
                        {w.greek}
                      </span>
                    )}
                  </dt>
                  <dd className="min-w-0 flex-1 break-words pt-2 text-base">
                    <span lang="grc" className="font-greek text-lg">
                      {w.lemma}
                    </span>
                    <span className="text-muted"> — {w.note}</span>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
        <div className="-mb-1 mt-1 flex justify-end">
          <AnswerSpeaker turn={turn} />
        </div>
      </div>
    </article>
  );
}

/** The sheet: the conversation `scope` names, the field, Send, and what the last message is doing. */
export function TalkSheet({ scope, talkRef: ref, state, voice, onSay, onClose }: {
  scope: TalkScope;
  /** the key the conversation is kept under (src/data/repositories/talks.ts talkRef) */
  talkRef: string;
  /** what the last message of this conversation is doing; undefined when it is done */
  state: AskState | undefined;
  /** push-to-talk: his words live while he holds, and what went wrong */
  voice: Voice;
  onSay: (message: string) => void;
  onClose: () => void;
}) {
  const title = `Talk about ${scopeTitle(scope)}`;
  const titleId = useId();
  const turns = useLiveQuery(() => listTurns(ref), [ref]);
  const [text, setText] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const closeWord = useCallback(() => setLookup(null), []);
  const { drag, handle } = useSheetDrag(onClose);
  // The word sheet above this one takes the Escape.
  useEscapeToClose(onClose, lookup === null);
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  const list = useRef<HTMLDivElement>(null);
  // The newest turn is kept in view by moving this box and nothing else.
  const turnCount = turns?.length ?? 0;
  useEffect(() => {
    const box = list.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [turnCount, state?.phase]);
  // Closing the sheet takes its answer's speech with it.
  useEffect(() => () => stopAnswer(), []);
  // A phone with no recogniser sends a hold to the typed field.
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (voice.typing > 0) focusQuietly(field.current);
  }, [voice.typing]);

  const send = (message: string): void => {
    if (!message.trim() || busy) return;
    onSay(message);
    setText('');
  };

  return (
    <>
      <div className="fixed inset-0 z-10 flex flex-col justify-end">
        <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
          className="relative flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
        >
          <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
            <div className="flex min-h-12 w-full items-center gap-2">
              <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-semibold">
                {title}
              </h2>
              <button
                type="button"
                ref={focusOnMount}
                onClick={onClose}
                className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent"
              >
                Done
              </button>
            </div>
          </div>
          <div ref={list} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-line px-4 py-3">
            {turns?.length === 0 && !state ? (
              <p data-talk-empty className="text-base text-muted">
                Nothing said yet. Ask about a word, a verse or what is on your mind.
              </p>
            ) : null}
            {turns?.map((turn) => (
              <Turn key={turn.id} turn={turn} scope={scope} onLook={setLookup} />
            ))}
            {state ? (
              <div data-talk-pending className="space-y-2">
                <p className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg">{state.question}</p>
                {state.phase === 'failed' ? (
                  <div role="alert" className="space-y-2">
                    <p className="text-base font-semibold text-bad">{FAILURE_TITLES[state.failure]}</p>
                    <p className="break-words text-sm text-muted">{state.detail}</p>
                    {state.failure === 'not-sent' ? null : (
                      <button
                        type="button"
                        onClick={() => onSay(state.question)}
                        className="min-h-12 rounded-xl border border-line px-5 text-base font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ) : (
                  <Waiting state={state} />
                )}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 space-y-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {voice.listening ? (
              <div data-talk-live role="status" className="rounded-2xl border border-bad px-3 py-2">
                <p className="text-sm font-medium text-bad">{voice.ready ? 'Listening… let go to send, slide away to cancel' : 'Starting the microphone…'}</p>
                <p className="min-h-7 break-words text-lg">{voice.transcript}</p>
              </div>
            ) : null}
            {voice.notice ? (
              <p role="alert" className="break-words text-base text-bad">
                {voice.notice.message}
              </p>
            ) : null}
            <textarea
              ref={field}
              aria-label="Your message"
              rows={2}
              maxLength={MAX_TALK_CHARS}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              className="block w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg"
            />
            <div className="flex gap-2">
              <HoldToTalk voice={voice} disabled={busy} />
              <button
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => send(text)}
                className="min-h-12 min-w-0 flex-1 rounded-xl bg-accent px-6 text-lg font-medium text-accent-fg disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      {lookup ? <WordSheet chapter={scope.chapter} lookup={lookup} onClose={closeWord} /> : null}
    </>
  );
}
