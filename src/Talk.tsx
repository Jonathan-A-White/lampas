// src/Talk.tsx — Bible talk: the Talk bar at the bottom of the reader and the bottom sheet it opens, a conversation about the
// chapter or the selected verse. The sheet shows the turns so far (kept per chapter and per verse, src/data/repositories/talks.ts),
// a field, Send and, last at the foot, Postern's hold-to-talk bar; what a message is doing is src/useTalk.ts's. He can talk instead of typing
// (src/useVoice.ts): the Talk bar held for half a second, a verse number held, or the sheet's own hold-to-talk bar; his words
// show live while he holds and go on release. Each answer can be heard (read aloud through
// src/speech/readAloud.ts, a Stop while it plays) and its Greek words open the word sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Waiting } from './Ask';
import { addLemmaToLearn, findGreekWord, glossOf } from './data/answerWord';
import type { AnswerWord } from './data/db';
import { addWordToLearn, keepStudyWayLine, listStudyWay, listTurns, markChangeUndone, STUDY_WAY_MAX, wordIsListed, type TalkTurn } from './data/repositories';
import { Markdown } from './markdown/Markdown';
import { TutorLinks } from './TutorLinks';
import { settingOf, undoChange, type AppliedChange } from './settings/registry';
import { hebrewSoundAsk, MAX_TALK_CHARS, scopeTitle, type TalkFocus, type TalkScope } from './services/talk';
import { HebrewSoundGuide } from './script/HebrewGuide';
import { HebrewAskContext } from './script/hebrewSpeech';
import { FAILURE_TITLES } from './services/tutor';
import { startAnswer, stopAnswer, useReading } from './speech/readAloud';
import { stopOnTap } from './speech/tutorVoice';
import { Icon } from './speech/ReadControls';
import { answerRuns } from './speech/answerRuns';
import { focusOnMount, focusQuietly } from './ui/focus';
import { HoldBar } from './ui/HoldBar';
import type { HoldHandlers } from './ui/holdPress';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import type { AskState } from './useAsks';
import type { Voice } from './useVoice';
import { WordSheet, type Lookup, type TermAsk, type WordHelp } from './WordSheet';

/** The bar pinned at the bottom of the reader: Postern's big hold-to-talk bar (src/ui/HoldBar.tsx) labelled Talk. A tap opens
 * the sheet; a hold (half a second) opens it and listens, and what he says goes on release. It is the lowest bar, so it alone
 * keeps the safe-area inset. */
export function TalkBar({ hold }: { hold: HoldHandlers }) {
  return (
    <div data-talk-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
      <HoldBar hold={hold} name="Talk" label="Talk" />
    </div>
  );
}

/** What the sheet's bar says, as Postern's does: Hold to talk, Starting the mic…, Release to send. */
const barLabel = (voice: Voice): string => (voice.listening ? (voice.ready ? 'Release to send' : 'Starting the mic…') : 'Hold to talk');

/** Postern's bar at the foot of the sheet: listens from the first touch (or Space / Enter held) and sends on release. */
function HoldToTalk({ voice, disabled }: { voice: Voice; disabled: boolean }) {
  return (
    <HoldBar
      hold={{ onHold: voice.press, onRelease: () => void voice.release(), onDrop: voice.abort }}
      holdMs={0}
      name="Hold to talk"
      label={barLabel(voice)}
      listening={voice.listening}
      disabled={disabled}
      keys
    />
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

/** One setting the answer changed: 'Changed: Greek speed 0.8x' with Undo, or, once undone, what it was put back to. */
function ChangeRow({ turn, change, index }: { turn: TalkTurn; change: AppliedChange; index: number }) {
  const [busy, setBusy] = useState(false);
  const undo = async (): Promise<void> => {
    setBusy(true);
    try {
      await undoChange(change);
      if (turn.id !== undefined) await markChangeUndone(turn.id, index);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li data-talk-change className="flex min-h-11 items-center gap-2">
      {change.undone ? (
        <span className="min-w-0 flex-1 break-words text-base text-muted">Put back: {settingOf(change.key)?.show(change.from) ?? change.label}</span>
      ) : (
        <>
          <span className="min-w-0 flex-1 break-words text-base">Changed: {change.shown}</span>
          <button
            type="button"
            aria-label={`Undo ${change.label}`}
            disabled={busy}
            onClick={() => void undo()}
            className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent active:bg-line disabled:opacity-40"
          >
            Undo
          </button>
        </>
      )}
    </li>
  );
}

/** Add to my words under an explained word: puts its lemma on his words-to-learn list; once it is there the button reads On my list. */
function AddWord({ scope, word }: { scope: TalkScope; word: AnswerWord }) {
  const listed = useLiveQuery(() => wordIsListed(word.lemma), [word.lemma]);
  const [busy, setBusy] = useState(false);
  if (listed === undefined) return null;
  const add = async (): Promise<void> => {
    setBusy(true);
    try {
      // The lexicon's gloss and part of speech; a word it lacks still goes in with the gloss the chapter has, as he asked.
      const { result } = await addLemmaToLearn(scope, word.lemma);
      if (result === 'unknown') await addWordToLearn(word.lemma, glossOf(scope, word));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      data-add-word={word.lemma}
      disabled={listed || busy}
      onClick={() => void add()}
      className={`mt-1 block min-h-11 rounded-lg border px-3 text-base font-medium ${listed ? 'border-line text-muted' : 'border-accent text-accent active:bg-line'}`}
    >
      {listed ? 'On my list' : 'Add to my words'}
    </button>
  );
}

/** The lemmas of a words_to_add, written in Greek type: 'Added σάρξ to your words'. */
function WordsLine({ lemmas, before, after }: { lemmas: string[]; before: string; after: string }) {
  return (
    <li data-talk-added className="py-1 text-base">
      {before}
      {lemmas.map((l, i) => (
        <span key={l}>
          {i > 0 ? (i === lemmas.length - 1 ? ' and ' : ', ') : ''}
          <span lang="grc" className="font-greek text-lg">
            {l}
          </span>
        </span>
      ))}
      {after}
    </li>
  );
}

/** The line the tutor proposes for his study way (mw-5r3p30.76): shown with Keep this, and kept only by his tap; once it is on the list it reads Kept. */
function StudyWayProposal({ line }: { line: string }) {
  const lines = useLiveQuery(listStudyWay, []);
  const [busy, setBusy] = useState(false);
  const isKept = lines?.includes(line) === true;
  const full = lines !== undefined && !isKept && lines.length >= STUDY_WAY_MAX;
  const keep = async (): Promise<void> => {
    setBusy(true);
    try {
      await keepStudyWayLine(line);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-study-way className="mt-2 border-t border-line pt-2">
      <p className="text-sm text-muted">For your study way</p>
      <p className="break-words text-lg">{line}</p>
      {lines === undefined ? (
        // the room the answer takes once the list is read, so the sheet does not grow after it has scrolled to the newest turn
        <div aria-hidden="true" className="mt-1 min-h-11" />
      ) : isKept ? (
        <p className="min-h-11 py-2 text-base font-medium text-muted">Kept</p>
      ) : full ? (
        <p className="py-1 text-base text-muted">Your study way is full: delete a line in Settings &gt; My study way.</p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void keep()}
          className="mt-1 min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line disabled:opacity-40"
        >
          Keep this
        </button>
      )}
    </div>
  );
}

function Turn({ turn, scope, onLook, onLeave }: { turn: TalkTurn; scope: TalkScope; onLook: (lookup: Lookup) => void; onLeave: () => void }) {
  return (
    <article data-turn className="space-y-2">
      <p data-talk-q className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg">
        {turn.q}
      </p>
      <div data-talk-a onClick={stopOnTap} className="rounded-2xl border border-line px-3 py-2">
        <div data-answer-text className="break-words text-lg leading-snug">
          <Markdown text={turn.a} />
        </div>
        {turn.changes?.length || turn.refused?.length || turn.added?.length || turn.already?.length || turn.unknown?.length ? (
          <ul data-talk-changes className="mt-2 border-t border-line pt-1">
            {turn.changes?.map((c, i) => (
              <ChangeRow key={i} turn={turn} change={c} index={i} />
            ))}
            {turn.refused?.map((r, i) => (
              <li key={`r${i}`} className="py-1 text-base text-muted">
                {r}
              </li>
            ))}
            {turn.added?.length ? <WordsLine lemmas={turn.added} before="Added " after=" to your words" /> : null}
            {turn.already?.length ? <WordsLine lemmas={turn.already} before="" after={turn.already.length === 1 ? ' is already on your words' : ' are already on your words'} /> : null}
            {turn.unknown?.length ? <WordsLine lemmas={turn.unknown} before="I do not know " after="" /> : null}
          </ul>
        ) : null}
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
                    <AddWord scope={scope} word={w} />
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
        {turn.guide ? <HebrewSoundGuide guide={turn.guide} /> : null}
        {turn.links?.length ? <TutorLinks links={turn.links} onLeave={onLeave} /> : null}
        {turn.studyWayLine ? <StudyWayProposal line={turn.studyWayLine} /> : null}
        <div className="-mb-1 mt-1 flex justify-end">
          <AnswerSpeaker turn={turn} />
        </div>
      </div>
    </article>
  );
}

/** The sheet: the conversation `scope` names, the field, Send, and what the last message is doing. */
export function TalkSheet({ scope, talkRef: ref, state, voice, suggestions, onSay, onHelp, onAskTerm, onClose }: {
  scope: TalkScope;
  /** the key the conversation is kept under (src/data/repositories/talks.ts talkRef) */
  talkRef: string;
  /** what the last message of this conversation is doing; undefined when it is done */
  state: AskState | undefined;
  /** push-to-talk: his words live while he holds, and what went wrong */
  voice: Voice;
  /** questions fitted to where he asks from (src/tutor/screen.ts): shown as buttons while nothing has been said, a tap sends one */
  suggestions?: string[];
  onSay: (message: string, focus?: TalkFocus) => void;
  /** a word of an answer was opened and he asked for Grammar or Sound it out on it */
  onHelp: (help: WordHelp) => void;
  /** a word of an answer was opened, a grammar word of its Parsing too, and he asked the tutor about it */
  onAskTerm: (ask: TermAsk) => void;
  onClose: () => void;
}) {
  const title = scope.screen ? `Ask the tutor: ${scope.screen.name}` : scope.quiz ? `Quiz on ${scopeTitle(scope)}` : `Talk about ${scopeTitle(scope)}`;
  const titleId = useId();
  const turns = useLiveQuery(() => listTurns(ref), [ref]);
  const [text, setText] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const closeWord = useCallback(() => setLookup(null), []);
  const { drag, handle } = useSheetDrag(onClose);
  // The word sheet above this one takes the Escape.
  useEscapeToClose(onClose, lookup === null);
  useSheetBack(onClose);
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
  // A Hebrew word of an answer, in its guide, asks how it is said: a sound question with the word as its focus (mw-5r3p30.98).
  const hebrew = useMemo(
    () => ({
      busy,
      ask: (word: string): void => {
        const { message, focus } = hebrewSoundAsk(word);
        onSay(message, focus);
      },
    }),
    [busy, onSay],
  );

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
                {scope.quiz ? 'Nothing said yet. Say “Quiz me” to begin.' : scope.screen ? 'Nothing said yet. Ask about this screen or about where you are.' : 'Nothing said yet. Ask about a word, a verse or what is on your mind.'}
              </p>
            ) : null}
            {turns?.length === 0 && !state && suggestions?.length ? (
              <ul data-suggestions aria-label="Suggested questions" className="space-y-2">
                {suggestions.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      data-suggestion
                      onClick={() => send(question)}
                      className="min-h-12 w-full rounded-xl border border-accent px-4 py-2 text-left text-lg text-accent active:bg-line"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <HebrewAskContext.Provider value={hebrew}>
              {turns?.map((turn) => (
                <Turn key={turn.id} turn={turn} scope={scope} onLook={setLookup} onLeave={onClose} />
              ))}
            </HebrewAskContext.Provider>
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
          <div className="shrink-0 space-y-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))]">
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
            <div className="flex items-end gap-2">
              <textarea
                ref={field}
                aria-label="Your message"
                rows={2}
                maxLength={MAX_TALK_CHARS}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                className="block min-w-0 flex-1 resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-lg"
              />
              <button
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => send(text)}
                className="min-h-12 shrink-0 rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <HoldToTalk voice={voice} disabled={busy} />
          </div>
        </div>
      </div>
      {lookup ? <WordSheet chapter={scope.chapter} lookup={lookup} onClose={closeWord} onHelp={onHelp} onAskTerm={onAskTerm} /> : null}
    </>
  );
}
