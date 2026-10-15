// src/Talk.tsx — Bible talk: the Talk bar at the bottom of the reader and the bottom sheet it opens, a conversation about the
// chapter or the selected verse. The sheet shows the turns so far (kept per chapter and per verse, src/data/repositories/talks.ts),
// a field, Send and, last at the foot, Postern's hold-to-talk bar; what a message is doing is src/useTalk.ts's. He can talk instead of typing
// (src/useVoice.ts): the Talk bar held for half a second, a verse number held, or the sheet's own hold-to-talk bar; his words
// show live while he holds and go on release. Each answer can be heard (read aloud through
// src/speech/readAloud.ts, a Stop while it plays) and its Greek words open the word sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Waiting } from './Ask';
import { addLemmaToLearn, findGreekWord, glossOf } from './data/answerWord';
import type { GreekWord } from './data/chapter';
import type { AnswerWord } from './data/db';
import { addTurnChanges, addWordToLearn, keepStudyWayLine, deleteTurns, listStudyWay, listTurns, markChangeUndone, markQuizGoalChoice, setQuizGoal, STUDY_WAY_MAX, wordIsListed, type TalkTurn } from './data/repositories';
import { Markdown } from './markdown/Markdown';
import { openedByTutor } from './nav/readerRequest';
import { TutorLinks } from './TutorLinks';
import { offeredChange, settingOf, undoChange, type AppliedChange } from './settings/registry';
import { BridgeIdeaHost, BridgeOffer } from './talk/BridgeOffer';
import { GreekOfferButton } from './talk/GreekOfferButton';
import { RustyOffer } from './talk/RustyOffer';
import { registerTalkLeave } from './talk/rustyOffer';
import { registerGreekWordOpener } from './talk/greekOffer';
import { sendMakersOffer, takeBridgeOffer, takeSettingOffer, useOfferSending } from './talk/offers';
import { hebrewSoundAsk, MAX_TALK_CHARS, scopeTitle, type TalkFocus, type TalkScope } from './services/talk';
import { HebrewSoundGuide } from './script/HebrewGuide';
import { HebrewAskContext } from './script/hebrewSpeech';
import { FAILURE_TITLES, TutorError, type TutorFailure } from './services/tutor';
import { registerOutbox } from './talk/outbox';
import { pastedPictures, PICTURE_ONLY_QUESTION, type OutgoingPicture } from './talk/pictures';
import { PictureControls } from './talk/PictureControls';
import { PictureThumbs, TurnPictures } from './talk/TurnPictures';
import { usePictureBox, type BoxPicture } from './talk/usePictureBox';
import { stopAnswer } from './speech/readAloud';
import { stopOnTap } from './speech/tutorVoice';
import { ReadAloud } from './speech/ReadAloud';
import { BarSlot } from './speech/SpeakingBarSlot';
import { answerRuns } from './speech/answerRuns';
import { focusOnMount, focusQuietly } from './ui/focus';
import { HoldBar } from './ui/HoldBar';
import { PendingQuestion } from './ui/PendingQuestion';
import type { HoldHandlers } from './ui/holdPress';
import { CopyExchange } from './share/CopyExchange';
import { CopyText } from './share/CopyText';
import type { SharedContent } from './share/shared';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import type { AskState } from './useAsks';
import type { Voice } from './useVoice';
import { WordSheet, type Lookup, type TermAsk, type WordHelp } from './WordSheet';

/** The bar pinned at the bottom of the reader: Postern's big hold-to-talk bar (src/ui/HoldBar.tsx) labelled Talk. A tap opens
 * the sheet; a hold (half a second) opens it and listens, and what he says goes on release. It is the lowest bar, so it alone
 * keeps the safe-area inset. In a short window (a phone held sideways) the bar is a 56 px row (mw-5r3p30.182). */
export function TalkBar({ hold }: { hold: HoldHandlers }) {
  return (
    <div data-talk-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
      <HoldBar hold={hold} name="Talk" label="Talk" compactWhenShort />
    </div>
  );
}

/** What the sheet's bar says, as Postern's does: Hold to talk, Starting the mic…, Release to send. */
const barLabel = (voice: Voice): string => (voice.listening ? (voice.ready ? 'Release to send' : 'Starting the mic…') : 'Hold to talk');

/** Postern's bar at the foot of the sheet: listens from the first touch (or Space / Enter held) and sends on release. */
function HoldToTalk({ voice, disabled, round }: { voice: Voice; disabled: boolean; round: boolean }) {
  return (
    <HoldBar
      hold={{ onHold: voice.press, onRelease: () => void voice.release(), onDrop: voice.abort }}
      holdMs={0}
      name="Hold to talk"
      label={barLabel(voice)}
      listening={voice.listening}
      disabled={disabled}
      keys
      compactWhenShort
      roundWhenShort={round}
    />
  );
}

/** The speaker under an answer: reads it, or stops it while it is being read (a tutor's answer read by itself is read under the turn's id, so the button knows). */
function AnswerSpeaker({ turn }: { turn: TalkTurn }) {
  return <ReadAloud id={turn.id as number} runs={answerRuns(turn.a)} />;
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

/** The fixed question the buttons answer; the app asks it itself (mw-5r3p30.196) so the offer never stands under an answer that asked him nothing. */
const QUIZ_GOAL_QUESTION = 'Is this how you want me to quiz you from now on?';

/** True when the answer already asks the goal question, whatever Markdown marks or spacing the tutor put around it. */
function asksGoalQuestion(answer: string): boolean {
  const plain = (text: string) => text.replace(/[*_`]/g, '').replace(/\s+/g, ' ').toLowerCase();
  return plain(answer).includes(plain(QUIZ_GOAL_QUESTION));
}

/** The goal the tutor understood from him (mw-5r3p30.185): Yes, from now on keeps it as his Quiz goal (Settings), Just this time keeps nothing; once he has chosen, the turn says which.
 * While he has not chosen, the question they answer stands just above the buttons unless the tutor's answer already asked it. */
function QuizGoalOffer({ turn }: { turn: TalkTurn }) {
  const [busy, setBusy] = useState(false);
  if (!turn.quizGoalOffer || turn.id === undefined) return null;
  const id = turn.id;
  const goal = turn.quizGoalOffer;
  const choose = async (choice: 'kept' | 'once'): Promise<void> => {
    setBusy(true);
    try {
      if (choice === 'kept') await setQuizGoal(goal);
      await markQuizGoalChoice(id, choice);
    } finally {
      setBusy(false);
    }
  };
  const button = 'min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line disabled:opacity-40';
  return (
    <div data-quiz-goal className="mt-2 border-t border-line pt-2">
      <p className="text-sm text-muted">Your quiz goal</p>
      <p className="break-words text-lg">{goal}</p>
      {turn.quizGoalChoice === 'kept' ? (
        <p className="min-h-11 py-2 text-base font-medium text-muted">Kept as your quiz goal</p>
      ) : turn.quizGoalChoice === 'once' ? (
        <p className="min-h-11 py-2 text-base font-medium text-muted">Just this time</p>
      ) : turn.quizGoalChoice === 'declined' ? (
        <p className="min-h-11 py-2 text-base font-medium text-muted">Not kept</p>
      ) : (
        <div data-quiz-goal-buttons className="mt-1">
          {asksGoalQuestion(turn.a) ? null : (
            <p data-quiz-goal-question className="text-lg">
              {QUIZ_GOAL_QUESTION}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void choose('kept')} className={button}>
              Yes, from now on
            </button>
            <button type="button" disabled={busy} onClick={() => void choose('once')} className={button}>
              Just this time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The tutor's offer to pass an ask Lampas cannot meet to the makers: its summary and Send this to the makers. The tap sends one feedback grist
 * through the one sender (src/services/feedback.ts): his words, the summary, the screen's name and what it showed; then the turn reads Sent. */
function FeedbackOffer({ turn, scope }: { turn: TalkTurn; scope: TalkScope }) {
  const [failure, setFailure] = useState<{ failure: TutorFailure; detail: string } | undefined>();
  const sending = useOfferSending(turn.id);
  if (!turn.feedbackOffer) return null;
  const summary = turn.feedbackOffer;
  const send = async (): Promise<void> => {
    if (sending || turn.id === undefined) return;
    setFailure(undefined);
    try {
      await sendMakersOffer(turn, scope);
    } catch (err) {
      const error = err instanceof TutorError ? err : new TutorError('unreachable', err instanceof Error ? err.message : 'Something went wrong.');
      setFailure({ failure: error.failure, detail: error.message });
    }
  };
  return (
    <div data-feedback-offer className="mt-2 border-t border-line pt-2">
      <p className="text-sm text-muted">For the makers</p>
      <p className="break-words text-lg">{summary}</p>
      {turn.feedbackSent ? (
        <div role="status" data-offer-settled>
          <p className="min-h-11 py-2 text-base font-medium">Sent</p>
          <p className="text-base text-muted">The answer will come back.</p>
        </div>
      ) : turn.feedbackWithdrawn ? (
        <p data-offer-settled className="min-h-11 py-2 text-base font-medium text-muted">Not sent</p>
      ) : (
        <>
          {failure && !sending ? (
            <div role="alert" className="space-y-1 pt-1">
              <p className="text-base font-semibold text-bad">{FAILURE_TITLES[failure.failure]}</p>
              <p className="break-words text-sm text-muted">{failure.detail}</p>
            </div>
          ) : null}
          {sending ? (
            <p role="status" className="py-1 text-base text-muted">
              Sending…
            </p>
          ) : null}
          <button
            type="button"
            disabled={sending}
            onClick={() => void send()}
            className="mt-1 min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line disabled:opacity-40"
          >
            {failure ? 'Retry' : 'Send this to the makers'}
          </button>
        </>
      )}
    </div>
  );
}

/** A setting change the tutor offered (mw-5r3p30.186): its text as a button. The tap changes the setting exactly as a spoken yes does, and the turn then shows the change with Undo. */
function SettingOffer({ turn }: { turn: TalkTurn }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const offer = turn.settingOffer ? offeredChange(turn.settingOffer) : undefined;
  if (!offer || turn.id === undefined) return null;
  const id = turn.id;
  const take = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await takeSettingOffer(turn);
      if (result.applied.length > 0) await addTurnChanges(id, result.applied);
      else setProblem(result.refused[0] ?? 'The setting was not changed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-setting-offer className="mt-2 border-t border-line pt-2">
      {turn.settingChoice === 'taken' ? (
        <p className="min-h-11 py-2 text-base font-medium">Changed</p>
      ) : turn.settingChoice === 'declined' ? (
        <p className="min-h-11 py-2 text-base font-medium text-muted">Not changed</p>
      ) : (
        <>
          {problem ? (
            <p role="alert" className="text-base text-bad">
              {problem}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void take()}
            className="min-h-11 rounded-lg border border-accent px-4 text-base font-medium text-accent active:bg-line disabled:opacity-40"
          >
            {offer.text}
          </button>
        </>
      )}
    </div>
  );
}

/** The word sheet's lookup for a word of the text: the word and the English that stands for it. */
function lookupFor(scope: TalkScope, found: GreekWord): Lookup {
  return { words: [found], english: found.e === undefined ? undefined : scope.chapter.verses.find((v) => v.g.includes(found))?.e[found.e]?.t, fromEnglish: false };
}

function Turn({ turn, scope, onLook, onLeave }: { turn: TalkTurn; scope: TalkScope; onLook: (lookup: Lookup) => void; onLeave: () => void }) {
  const { unopened } = turn;
  return (
    <article data-turn data-turn-id={turn.id} className="space-y-2">
      <TurnPictures turnId={turn.id} />
      <p data-talk-q className="ml-auto w-fit max-w-[88%] break-words rounded-2xl bg-accent/15 px-3 py-2 text-lg">
        {turn.cleanQ ?? turn.q}
      </p>
      {/* what he said, word for word (not the tidied line above), so a question can be handed on whole */}
      <CopyText text={turn.q} label="Copy my question" />
      <div data-talk-a onClick={stopOnTap} className="rounded-2xl border border-line px-3 py-2">
        <div data-answer-text className="break-words text-lg leading-snug">
          <Markdown text={turn.a} onOpen={onLeave} />
        </div>
        {turn.changes?.length || turn.refused?.length || turn.opened || turn.stayed || turn.unopened || turn.added?.length || turn.already?.length || turn.unknown?.length ? (
          <ul data-talk-changes className="mt-2 border-t border-line pt-1">
            {turn.changes?.map((c, i) => (
              <ChangeRow key={i} turn={turn} change={c} index={i} />
            ))}
            {turn.refused?.map((r, i) => (
              <li key={`r${i}`} className="py-1 text-base text-muted">
                {r}
              </li>
            ))}
            {turn.opened ? (
              <li data-talk-opened className="py-1 text-base">
                Opened {turn.opened}
              </li>
            ) : null}
            {turn.stayed ? (
              <li data-talk-stayed className="py-1 text-base">
                Already on {turn.stayed}
              </li>
            ) : null}
            {unopened ? (
              <li data-talk-unopened className="py-1 text-base text-muted">
                <p>You closed Talk before this came, so {unopened.title} was not opened</p>
                <button
                  type="button"
                  onClick={() => {
                    onLeave();
                    openedByTutor(unopened.book, unopened.chapter);
                  }}
                  className="mt-1 min-h-11 rounded-lg border border-line px-3 text-base font-medium text-accent active:bg-line"
                >
                  Open {unopened.title}
                </button>
              </li>
            ) : null}
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
                        onClick={() => onLook(lookupFor(scope, found))}
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
        <QuizGoalOffer turn={turn} />
        <SettingOffer turn={turn} />
        <FeedbackOffer turn={turn} scope={scope} />
        {turn.bridge ? <BridgeOffer bridge={turn.bridge} onTake={() => void takeBridgeOffer(turn)} /> : null}
        <GreekOfferButton turn={turn} />
        <RustyOffer turn={turn} />
        <div className="-mb-1 mt-1 flex flex-wrap items-start justify-end gap-1">
          <CopyExchange place={turn.ref} question={turn.cleanQ ?? turn.q} answer={turn.a} />
          <AnswerSpeaker turn={turn} />
        </div>
      </div>
    </article>
  );
}

/** Questions fitted to the screen, as buttons: a tap sends one. */
function Suggestions({ questions, onAsk, label }: { questions: string[]; onAsk: (question: string) => void; label?: string }) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-muted">{label}</p> : null}
      <ul data-suggestions aria-label="Suggested questions" className="space-y-2">
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              data-suggestion
              onClick={() => onAsk(question)}
              className="min-h-12 w-full rounded-xl border border-accent px-4 py-2 text-left text-lg text-accent active:bg-line"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The sheet: the conversation `scope` names, the field, Send, and what the last message is doing. */
export function TalkSheet({ scope, talkRef: ref, state: liveState, voice, suggestions, shared, onSay, onHelp, onAskTerm, onSkip, onClose }: {
  scope: TalkScope;
  /** the key the conversation is kept under (src/data/repositories/talks.ts talkRef) */
  talkRef: string;
  /** what the last message of this conversation is doing; undefined when it is done */
  state: AskState | undefined;
  /** push-to-talk: his words live while he holds, and what went wrong */
  voice: Voice;
  /** questions fitted to where he asks from (src/tutor/screen.ts): shown as buttons while nothing has been said, a tap sends one */
  suggestions?: string[];
  /** what came in through Share > Lampas (mw-y3qno5.2): its pictures wait in the composer and its words in the field, as he opened the sheet, NOT sent */
  shared?: SharedContent;
  onSay: (message: string, focus?: TalkFocus, pictures?: OutgoingPicture[]) => void;
  /** a word of an answer was opened and he asked for Grammar or Sound it out on it */
  onHelp: (help: WordHelp) => void;
  /** a word of an answer was opened, a grammar word of its Parsing too, and he asked the tutor about it */
  onAskTerm: (ask: TermAsk) => void;
  /** the welcome only (mw-yrmkdf.3): Skip in the header ends the interview; missing once it is over */
  onSkip?: () => void;
  onClose: () => void;
}) {
  const title = scope.welcome ? 'Welcome' : scope.free ? 'Talk with the tutor' : scope.screen ? `Ask the tutor: ${scope.screen.name}` : scope.quiz ? `Quiz on ${scopeTitle(scope)}` : `Talk about ${scopeTitle(scope)}`;
  const titleId = useId();
  const turns = useLiveQuery(() => listTurns(ref), [ref]);
  const [text, setText] = useState(shared?.text ?? '');
  // A failure he cleared with New talk is not shown again (the state itself belongs to useTalk).
  const [cleared, setCleared] = useState<AskState | undefined>(undefined);
  const state = liveState === cleared ? undefined : liveState;
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const closeWord = useCallback(() => setLookup(null), []);
  // The Greek word the tutor's offer asked to open, by a tap or a spoken yes (src/talk/greekOffer.ts): opened here, over this sheet
  useEffect(
    () =>
      registerGreekWordOpener((lemma) => {
        const found = findGreekWord(scope, { greek: lemma, lemma, note: '' });
        if (found) setLookup(lookupFor(scope, found));
      }),
    [scope],
  );
  // Taking the tutor's offer to move the rust back, by a tap or a spoken yes, closes this sheet: Review opens (src/talk/rustyOffer.ts)
  useEffect(() => registerTalkLeave(onClose), [onClose]);
  const { drag, handle } = useSheetDrag(onClose);
  // The word sheet above this one takes the Escape.
  useEscapeToClose(onClose, lookup === null);
  useSheetBack(onClose);
  const busy = state?.phase === 'sending' || state?.phase === 'waiting';
  // Once there is a talk the suggestions he has not used are still offered, under the last answer (or the failure of the first question).
  const asked = new Set([...(turns ?? []).map((t) => t.q), ...(state ? [state.question] : [])]);
  const more = (suggestions ?? []).filter((q) => !asked.has(q));
  const list = useRef<HTMLDivElement>(null);
  // The newest turn is kept in view by moving this box and nothing else: a question still waiting shows at the foot; an answer is read from its
  // top (question first), so in a short window the suggestions left under it do not push its first lines out of the box (mw-vtjxh4.44).
  const turnCount = turns?.length ?? 0;
  const waiting = state !== undefined;
  // The makers' offers that waited for his word when the last message left, so the turn that carries his
  // yes or no can tell which offer it settled: that offer's Sent / Not sent is the proof, and it is kept in view beside the reply (mw-5r3p30.210).
  const keptTurns = useRef(turns);
  useEffect(() => {
    keptTurns.current = turns;
  });
  const offersOpen = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (waiting) offersOpen.current = new Set((keptTurns.current ?? []).filter((t) => t.id !== undefined && t.feedbackOffer && !t.feedbackSent && !t.feedbackWithdrawn).map((t) => t.id as number));
  }, [waiting]);
  useEffect(() => {
    const box = list.current;
    if (!box) return;
    const newest = waiting ? null : Array.from(box.querySelectorAll<HTMLElement>('[data-turn]')).pop();
    if (!newest) {
      box.scrollTop = box.scrollHeight;
      return;
    }
    const settledIds = (keptTurns.current ?? []).filter((t) => t.id !== undefined && offersOpen.current.has(t.id) && (t.feedbackSent || t.feedbackWithdrawn)).map((t) => t.id);
    // His question stays in view too: the mark is shown only when it and the start of the newest turn fit the box together.
    const showSettled = () => {
      const room = box.getBoundingClientRect();
      for (const id of settledIds.reverse()) {
        const mark = box.querySelector<HTMLElement>(`[data-turn-id="${id}"] [data-offer-settled]`);
        if (!mark) continue;
        const gap = newest.getBoundingClientRect().top - mark.getBoundingClientRect().top;
        if (gap > room.height / 2) continue;
        box.scrollTop += mark.getBoundingClientRect().top - room.top - 8;
        return;
      }
    };
    // An answer with the goal offer waiting shows the question and both buttons: the box moves on until the offer's foot is in view, and no
    // further than the question's top (mw-5r3p30.196). The quiz question after it may sit below.
    const align = () => {
      box.scrollTop += newest.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
      const offer = newest.querySelector<HTMLElement>('[data-quiz-goal-buttons]');
      if (!offer) return;
      const room = box.getBoundingClientRect();
      const question = (newest.querySelector<HTMLElement>('[data-quiz-goal-question]') ?? offer).getBoundingClientRect().top;
      box.scrollTop += Math.max(0, Math.min(offer.getBoundingClientRect().bottom - room.bottom + 8, question - room.top - 8));
    };
    align();
    showSettled();
    if (!newest.querySelector('[data-quiz-goal-buttons]') || typeof ResizeObserver === 'undefined') return;
    // The sheet and the answer settle for a moment after they draw: keep the offer in view until they have, or until he scrolls himself.
    const settle = new ResizeObserver(align);
    settle.observe(box);
    settle.observe(newest);
    const stopSettling = () => settle.disconnect();
    const timer = window.setTimeout(stopSettling, 1500);
    box.addEventListener('wheel', stopSettling, { once: true });
    box.addEventListener('touchstart', stopSettling, { once: true });
    // For as long as the offer waits for his choice, a change in the box's height (the phone turned, the keyboard, the microphone line) brings it
    // back into view (mw-5r3p30.211). Only the box's own height: the answer growing under his reading must not take the scroll from him.
    let height = box.clientHeight;
    const follow = new ResizeObserver(() => {
      if (box.clientHeight === height) return;
      height = box.clientHeight;
      if (newest.querySelector('[data-quiz-goal-buttons]')) align();
    });
    follow.observe(box);
    return () => {
      window.clearTimeout(timer);
      box.removeEventListener('wheel', stopSettling);
      box.removeEventListener('touchstart', stopSettling);
      stopSettling();
      follow.disconnect();
    };
  }, [turnCount, state?.phase, waiting]);
  // Closing the sheet takes its answer's speech with it.
  useEffect(() => () => stopAnswer(), []);
  // A phone with no recogniser sends a hold to the typed field.
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (voice.typing > 0) focusQuietly(field.current);
  }, [voice.typing]);
  // The box grows upward with his words, line by line (its CSS holds it between one or two lines and five, then it scrolls); it is measured again
  // when the window changes shape, since the same words take other lines in another width.
  useLayoutEffect(() => {
    const grow = (): void => {
      const el = field.current;
      if (!el) return;
      el.style.height = 'auto';
      if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
    };
    grow();
    window.addEventListener('resize', grow);
    return () => window.removeEventListener('resize', grow);
  }, [text]);

  // The pictures waiting to go (attached, taken or pasted) and, from Send until the answer, the ones in flight, shown under his question.
  const box = usePictureBox();
  const [inFlight, setInFlight] = useState<BoxPicture[]>([]);
  const { take } = box;
  const takeWaiting = useCallback((): OutgoingPicture[] => {
    const taken = take();
    if (taken.length > 0) setInFlight(taken);
    return taken;
  }, [take]);
  // The words he holds to say go with the pictures he has put in (src/talk/outbox.ts).
  useEffect(() => registerOutbox(takeWaiting), [takeWaiting]);
  // The pictures that came in through the share sheet wait in the composer, once.
  const { add: addToBox } = box;
  const sharedFiles = shared?.files;
  const placed = useRef<File[] | undefined>(undefined);
  useEffect(() => {
    if (!sharedFiles?.length || placed.current === sharedFiles) return;
    placed.current = sharedFiles;
    addToBox(sharedFiles);
  }, [sharedFiles, addToBox]);
  const hasPictures = box.pictures.length > 0;
  // words or pictures waiting to go: Send is on screen and, in a short window, the hold bar gives way to a round mic button
  const composing = text.length > 0 || hasPictures;
  const send = (message: string): void => {
    if ((!message.trim() && !hasPictures) || busy || box.working) return;
    // a message of pictures alone asks what the pictures say
    onSay(message.trim() || PICTURE_ONLY_QUESTION, undefined, takeWaiting());
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
          className="relative flex h-[85dvh] flex-col short:h-dvh rounded-t-2xl border-t border-line bg-surface"
          onPaste={(e) => {
            // a copied screenshot becomes an attachment; copied text pastes as it always did
            const pasted = pastedPictures(e);
            if (pasted.length === 0) return;
            e.preventDefault();
            box.add(pasted);
          }}
        >
          <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
            <div className="flex min-h-12 w-full items-center gap-2 short:min-h-11">
              <h2 id={titleId} className="min-w-0 flex-1 truncate text-xl font-semibold">
                {title}
              </h2>
              {onSkip ? (
                <button type="button" onClick={onSkip} className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
                  Skip
                </button>
              ) : null}
              {turnCount > 0 && !busy && !scope.welcome ? (
                <button
                  type="button"
                  onClick={() => {
                    stopAnswer();
                    setCleared(liveState);
                    void deleteTurns(ref);
                  }}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent"
                >
                  New talk
                </button>
              ) : null}
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
          <div ref={list} data-talk-list className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-line px-4 py-3 short:space-y-2 short:py-2">
            {turns?.length === 0 && !state ? (
              <p data-talk-empty className="text-base text-muted">
                {scope.welcome ? 'The tutor is about to say hello.' : scope.quiz ? 'Nothing said yet. Say “Quiz me” to begin.' : scope.screen && !scope.free ? 'Nothing said yet. Ask about this screen or about where you are.' : 'Nothing said yet. Ask about a word, a verse or what is on your mind.'}
              </p>
            ) : null}
            {turns?.length === 0 && !state && suggestions?.length ? <Suggestions questions={suggestions} onAsk={send} /> : null}
            <HebrewAskContext.Provider value={hebrew}>
              {turns?.map((turn) => (
                <Turn key={turn.id} turn={turn} scope={scope} onLook={setLookup} onLeave={onClose} />
              ))}
            </HebrewAskContext.Provider>
            {state ? (
              <div data-talk-pending className="space-y-2">
                {inFlight.length > 0 ? <PictureThumbs pictures={inFlight.map((p) => ({ key: p.id, url: p.url }))} /> : null}
                <PendingQuestion text={state.question} />
                {state.phase === 'failed' ? (
                  <div role="alert" className="space-y-2">
                    <p className="text-base font-semibold text-bad">{FAILURE_TITLES[state.failure]}</p>
                    <p className="break-words text-sm text-muted">{state.detail}</p>
                    {/* beside Retry, at the foot, not under a question too long to scroll past */}
                    <div className="flex flex-wrap items-center gap-2">
                      {state.failure === 'not-sent' ? null : (
                        <button
                          type="button"
                          onClick={() => onSay(state.question)}
                          className="min-h-12 rounded-xl border border-line px-5 text-base font-medium"
                        >
                          Retry
                        </button>
                      )}
                      <CopyText text={state.question} label="Copy my question" />
                    </div>
                  </div>
                ) : (
                  <>
                    <CopyText text={state.question} label="Copy my question" />
                    <Waiting state={state} />
                  </>
                )}
              </div>
            ) : null}
            {turns && !busy && (turns.length > 0 || state) && more.length > 0 ? <Suggestions questions={more} onAsk={send} label="Ask something else" /> : null}
          </div>
          <BarSlot level={3} />
          <div data-composer className="shrink-0 space-y-2 border-t border-line px-4 pt-2 pb-[calc(0.75rem+var(--lp-bar-inset))] short:flex short:flex-wrap short:items-end short:gap-x-2 short:space-y-0 short:gap-y-2">
            {voice.listening ? (
              <div data-talk-live role="status" className="rounded-2xl border border-bad px-3 py-2 short:basis-full">
                <p className="text-sm font-medium text-bad">{voice.ready ? 'Listening… let go to send, slide away to cancel' : 'Starting the microphone…'}</p>
                <p className="min-h-7 break-words text-lg">{voice.transcript}</p>
              </div>
            ) : null}
            {voice.notice ? (
              <p role="alert" className="break-words text-base text-bad short:basis-full">
                {voice.notice.message}
              </p>
            ) : null}
            <PictureControls box={box} disabled={busy} />
            {/* One row for the words: the box, Send and the mic. In a short window (the keyboard up, a phone sideways) the mic is the bar beside the box, a round
                button once there are words, and the row is at least 20 rem so the pictures and the two buttons go on a line above it, never beside a squeezed box. */}
            <div data-composer-row className="flex flex-wrap items-end gap-2 short:min-w-[20rem] short:flex-1 short:flex-nowrap">
              <textarea
                ref={field}
                aria-label="Your message"
                rows={1}
                maxLength={MAX_TALK_CHARS}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                className="block min-h-[calc(2*1.75rem+1rem+2px)] max-h-[calc(5*1.75rem+1rem+2px)] min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-line bg-canvas px-3 py-2 text-lg short:min-h-14"
              />
              <button
                type="button"
                disabled={busy || box.working || (!text.trim() && !hasPictures)}
                onClick={() => send(text)}
                className={`min-h-12 shrink-0 rounded-xl bg-accent px-5 text-lg font-medium text-accent-fg disabled:opacity-40 short:order-3 short:min-h-14 short:min-w-14 short:px-3 ${composing ? '' : 'short:hidden'}`}
              >
                Send
              </button>
              <div className={`w-full short:order-2 short:shrink-0 ${composing ? 'short:w-14' : 'short:w-36'}`}>
                <HoldToTalk voice={voice} disabled={busy} round={composing} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {lookup ? <WordSheet chapter={scope.chapter} lookup={lookup} onClose={closeWord} onHelp={onHelp} onAskTerm={onAskTerm} /> : null}
      <BridgeIdeaHost owner="talk" />
    </>
  );
}
