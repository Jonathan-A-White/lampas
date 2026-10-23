// src/Talk.tsx — Bible talk: the Talk bar at the bottom of the reader and the bottom sheet it opens, a conversation about the
// chapter or the selected verse. The sheet shows the turns so far (kept per chapter and per verse, src/data/repositories/talks.ts),
// and, last at the foot, voice-kit's Composer (Postern's compose button, as in Ask the tutor: Hold to talk, Type a message, Attach a picture, Take a photo, mw-06ggew.15);
// what a message is doing is src/useTalk.ts's. He can talk instead of typing: the Composer's own bar, or (src/talk/useTalkHold.ts over voice-kit's TalkBar) the Talk bar held
// for half a second or a verse number held; his words show live while he holds and go on release. Each answer can be heard (read aloud through
// src/speech/readAloud.ts, a Stop while it plays) and its Greek words open the word sheet.
import { useLiveQuery } from 'dexie-react-hooks';
import { Composer, type ComposerLabels, type ComposerMessage, type SendSlot } from 'voice-kit/composer';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Waiting } from './Ask';
import { addLemmaToLearn, findGreekWord, glossOf } from './data/answerWord';
import type { GreekWord } from './data/chapter';
import type { AnswerWord } from './data/db';
import { addTurnChanges, addWordToLearn, keepStudyWayLine, deleteTurns, listStudyWay, listTurns, markChangeUndone, markQuizGoalChoice, markUnopenedOpened, setQuizGoal, STUDY_WAY_MAX, wordIsListed, type TalkTurn } from './data/repositories';
import { Markdown } from './markdown/Markdown';
import { openedByTutor } from './nav/readerRequest';
import { openRequests } from './nav/route';
import { TutorLinks } from './TutorLinks';
import { offeredChange, settingOf, undoChange, type AppliedChange } from './settings/registry';
import { BridgeIdeaHost, BridgeOffer } from './talk/BridgeOffer';
import { KeyPointsLine } from './talk/KeyPointsLine';
import { revealFoot, revealLines } from './ui/keepInView';
import { GreekOfferButton } from './talk/GreekOfferButton';
import { RustyOffer } from './talk/RustyOffer';
import { TodayOffer } from './talk/TodayOffer';
import { registerTalkLeave } from './talk/rustyOffer';
import { registerGreekWordOpener } from './talk/greekOffer';
import { sendMakersOffer, takeBridgeOffer, takeSettingOffer, useOfferSending } from './talk/offers';
import { isTooLong } from './ui/lengthLimit';
import { LengthNote } from './ui/LengthNote';
import { hebrewSoundAsk, MAX_TALK_CHARS, scopeTitle, type TalkFocus, type TalkScope } from './services/talk';
import { HebrewSoundGuide } from './script/HebrewGuide';
import { HebrewAskContext } from './script/hebrewSpeech';
import { FAILURE_TITLES, TutorError, type TutorFailure } from './services/tutor';
import { dataUrlOf, isTalkPicture, NOT_A_PICTURE_LINE, PICTURE_ONLY_QUESTION, preparePictures, TALK_MAX_PICTURES, TOO_MANY_TO_SEND_LINE, type OutgoingPicture } from './talk/pictures';
import { PictureThumbs, TurnPictures } from './talk/TurnPictures';
import { holdBegan, holdEnded } from './talk/holding';
import { registerKeeper } from './talk/keptWords';
import { askTranscriber } from './speech/askTranscriber';
import { tapWord, useTalkSettings } from './talkSettings';
import { stopAnswer, stopAnswerSpeech } from './speech/readAloud';
import { stopOnTap } from './speech/tutorVoice';
import { SEND_A_SCREENSHOT } from './tutor/screen';
import { ReadAloud } from './speech/ReadAloud';
import { BarSlot } from './speech/SpeakingBarSlot';
import { answerRuns } from './speech/answerRuns';
import { focusQuietly } from './ui/focus';
import { readDraft, talkDraftKey, writeDraft } from './ui/unsentDraft';
import { HeldTalkBar } from './talk/Bars';
import type { TalkHold } from './talk/useTalkHold';
import { PendingQuestion } from './ui/PendingQuestion';
import { CopyExchange } from './share/CopyExchange';
import { CopyText } from './share/CopyText';
import { QuestionRow } from './talk/QuestionRow';
import { YouSaid } from './ui/YouSaid';
import type { SharedContent } from './share/shared';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';
import { setPending, talkKey, type AskState } from './pending/pendingAsks';
import { WordSheet, type Lookup, type TermAsk, type WordHelp } from './WordSheet';
import { GREEK_LANG } from './script/greekLang';
import { announce, plainText } from './ui/live';

/** The bar pinned at the bottom of the reader: voice-kit's hold-to-talk bar (src/talk/Bars.tsx) labelled Talk. A tap opens
 * the sheet; a hold (half a second) opens it and listens, and what he says goes on release. It is the lowest bar, so it alone
 * keeps the safe-area inset. In a short window (a phone held sideways) the bar is a 56 px row (mw-5r3p30.182). */
export function ReaderTalkBar({ hold, onPress, onTap }: { hold: TalkHold; onPress: () => void; onTap: () => void }) {
  return (
    <div data-talk-bar className="shrink-0 border-t border-line bg-surface px-3 pt-2 pb-[calc(0.5rem+var(--lp-bar-inset))]">
      <HeldTalkBar hold={hold} onPress={onPress} onTap={onTap} labels={TALK_BAR_LABELS} fit="compact" />
    </div>
  );
}

/** The Reader's bar says Talk whatever it is doing, a finger slid off it too (it is the colour that changes, and the sheet over it says what to do). */
const TALK_BAR_LABELS = { hold: 'Talk', release: 'Talk', starting: 'Talk', tryAgain: 'Talk', stop: 'Talk', drop: 'Talk' };

/** A picture in flight: what draws it under his question. */
interface InFlight {
  key: number;
  url: string;
}

/** The sheet's words for the kit's Composer: Postern's, with the names the sheet has always had for its field and its picture buttons. */
const TALK_LABELS: Partial<ComposerLabels> = {
  hold: 'Hold to talk', // tapWord makes it Tap to talk while Talk is Tap
  tryAgain: 'Hold to talk', // the bar keeps its name after a failed hold too, as the notice says why
  message: 'Your message',
  typeInstead: 'Type a message',
  placeholder: 'Type a message',
  attach: 'Attach a picture',
  camera: 'Take a photo',
  toSend: 'Pictures to send',
};

/** The kit's Send arrow, drawn here so the button can point at the count that says why it is off (aria-describedby): the kit's own Send cannot. */
function SendArrow({ slot, why }: { slot: SendSlot; why: string | undefined }) {
  return (
    <button
      type="button"
      aria-label={slot.label}
      aria-describedby={why}
      disabled={slot.busy || slot.disabled || slot.blocked || !slot.canSend}
      onClick={slot.send}
      className={`bk-composer__button ${slot.placement === 'bar' ? 'bk-composer__bar-send' : 'bk-composer__send'}`}
    >
      <svg className="bk-composer__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Zm8 1.5L20 4" />
      </svg>
    </button>
  );
}

/** Only pictures of the kinds the grind takes go in the composer's waiting row. */
const refuseNonPicture = (file: { type: string }): string | undefined => (isTalkPicture(file) ? undefined : NOT_A_PICTURE_LINE);

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
          <span {...GREEK_LANG} className="font-greek text-lg">
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
 * through the one sender (src/services/feedback.ts): his words, the summary, the screen's name and what it showed; then the turn reads Sent, 'The answer will come back.' and a link to Your requests, where it does (mw-5r3p30.677). */
function FeedbackOffer({ turn, scope, onLeave }: { turn: TalkTurn; scope: TalkScope; onLeave: () => void }) {
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
        <div data-offer-settled>
          <p role="status" className="min-h-11 py-2 text-base font-medium">Sent</p>
          <div className="flex min-h-11 flex-wrap items-center gap-x-2 text-base">
            <p role="status" className="text-muted">The answer will come back.</p>
            <button
              type="button"
              onClick={() => {
                onLeave();
                openRequests('settings');
              }}
              className="min-h-11 text-base font-medium text-accent underline"
            >
              Your requests
            </button>
          </div>
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
  // a tap keeps its change on this turn, and its row below says Changed or Put back; a spoken yes keeps it on the next turn, so only then does this line say Changed
  if (turn.settingChoice === 'taken' && turn.changes?.length) return null;
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
      {/* what he said, word for word (not the tidied line above), so a question can be handed on whole */}
      <QuestionRow shown={turn.cleanQ ?? turn.q} copyText={turn.q} />
      <YouSaid spoken={turn.spoken} said={turn.q} shown={turn.cleanQ} />
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
                    if (turn.id !== undefined) void markUnopenedOpened(turn.id);
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
                        {...GREEK_LANG}
                        onClick={() => onLook(lookupFor(scope, found))}
                        className="min-h-11 break-words rounded-lg px-1 text-left font-greek text-2xl text-accent active:bg-line"
                      >
                        {w.greek}
                      </button>
                    ) : (
                      <span {...GREEK_LANG} className="block min-h-11 break-words px-1 font-greek text-2xl leading-[44px]">
                        {w.greek}
                      </span>
                    )}
                  </dt>
                  <dd className="min-w-0 flex-1 break-words pt-2 text-base">
                    <span {...GREEK_LANG} className="font-greek text-lg">
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
        <FeedbackOffer turn={turn} scope={scope} onLeave={onLeave} />
        {turn.bridge ? <BridgeOffer bridge={turn.bridge} onTake={() => void takeBridgeOffer(turn)} /> : null}
        <GreekOfferButton turn={turn} />
        <RustyOffer turn={turn} />
        <TodayOffer turn={turn} />
        <div className="-mb-1 mt-1 flex flex-wrap items-start justify-end gap-1">
          <CopyExchange place={turn.ref} question={turn.cleanQ ?? turn.q} answer={turn.a} />
          <AnswerSpeaker turn={turn} />
        </div>
      </div>
      {turn.keyPoints ? <KeyPointsLine keyPoints={turn.keyPoints} /> : null}
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
export function TalkSheet({ scope, talkRef: ref, state, opened, suggestions, shared, onSay, onResume, onHelp, onAskTerm, onSkip, onClose }: {
  scope: TalkScope;
  /** the key the conversation is kept under (src/data/repositories/talks.ts talkRef) */
  talkRef: string;
  /** what the last message of this conversation is doing; undefined when it is done */
  state: AskState | undefined;
  /** the hold that opened the sheet (the Reader's Talk bar or a verse number): its words show live too, and what went wrong with it */
  opened?: TalkHold;
  /** questions fitted to where he asks from (src/tutor/screen.ts): shown as buttons while nothing has been said, a tap sends one */
  suggestions?: string[];
  /** what came in through Share > Lampas (mw-y3qno5.2): its pictures wait in the composer and its words in the field, as he opened the sheet, NOT sent */
  shared?: SharedContent;
  onSay: (message: string, focus?: TalkFocus, pictures?: OutgoingPicture[]) => void;
  /** a message that a page or screen that went away left waiting is waited for again once its sheet is open (src/pending/pendingAsks.ts) */
  onResume?: () => void;
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
  const countId = useId();
  const turns = useLiveQuery(() => listTurns(ref), [ref]);
  // His unsent words are kept for this conversation, so Back or Done does not lose a long prayer (src/ui/unsentDraft.ts); a send, which empties the box, drops them
  const draftKey = talkDraftKey(ref);
  const [text, setText] = useState(() => shared?.text ?? readDraft(draftKey));
  // the words that came in by Share are his to keep only once he has changed them: left as shared they go with the share (mw-y3qno5.2)
  const sharedText = useRef(shared?.text);
  useEffect(() => {
    if (text === sharedText.current) return;
    sharedText.current = undefined;
    writeDraft(draftKey, text);
  }, [draftKey, text]);
  // What the message is doing is kept apart from this sheet (src/pending/pendingAsks.ts): opened on a message that was left waiting, the sheet waits for it again.
  const resumeRef = useRef(onResume);
  useEffect(() => {
    resumeRef.current = onResume;
  });
  useEffect(() => resumeRef.current?.(), [ref]);
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
  // Taking the tutor's offer to move the rust back or to open Today, by a tap or a spoken yes, closes this sheet: Review or Today opens (src/talk/rustyOffer.ts, todayOffer.ts)
  useEffect(() => registerTalkLeave(onClose), [onClose]);
  const { drag, handle } = useSheetDrag(onClose);
  // The word sheet above this one takes the Escape.
  useEscapeToClose(onClose, lookup === null);
  useSheetBack(onClose);
  // the hold that opened the sheet (the Talk bar, a verse number) is drawn here; the sheet's own hold is the Composer's, which draws its own words and notice
  const live = opened?.listening ? opened : undefined;
  const notice = opened?.notice;
  const talkSettings = useTalkSettings();
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
  // The tutor's answer, when it arrives, is said to a screen reader through the app's one live region (src/ui/live.ts). The turns that were there when the sheet
  // opened are not news, and neither is a turn that changes (an offer settled): only a newer last turn is announced.
  const announced = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!turns) return;
    const newest = turns[turns.length - 1];
    if (announced.current === undefined) {
      announced.current = newest?.id ?? null;
      return;
    }
    if (newest?.id === undefined || newest.id === announced.current) return;
    announced.current = newest.id;
    announce(`The tutor says: ${plainText(newest.a)}`);
  }, [turns]);
  useEffect(() => {
    if (waiting) offersOpen.current = new Set((keptTurns.current ?? []).filter((t) => t.id !== undefined && t.feedbackOffer && !t.feedbackSent && !t.feedbackWithdrawn).map((t) => t.id as number));
  }, [waiting]);
  useEffect(() => {
    const box = list.current;
    if (!box) return;
    const newest = waiting ? null : Array.from(box.querySelectorAll<HTMLElement>('[data-turn]')).pop();
    // a failed send: its red message and Copy are what he needs, not the end of the box (suggestions may stand under them)
    const failed = waiting ? box.querySelector<HTMLElement>('[data-talk-failed]') : null;
    const followed = newest ?? failed;
    if (!followed) {
      box.scrollTop = box.scrollHeight;
      return;
    }
    const settledIds = (keptTurns.current ?? []).filter((t) => t.id !== undefined && offersOpen.current.has(t.id) && (t.feedbackSent || t.feedbackWithdrawn)).map((t) => t.id);
    // His question stays in view too: the mark is shown only when it and the start of the newest turn fit the box together.
    const showSettled = () => {
      if (!newest) return;
      const room = box.getBoundingClientRect();
      for (const id of [...settledIds].reverse()) {
        const mark = box.querySelector<HTMLElement>(`[data-turn-id="${id}"] [data-offer-settled]`);
        if (!mark) continue;
        const gap = newest.getBoundingClientRect().top - mark.getBoundingClientRect().top;
        // it and the first three lines of the newest answer (72 px) must fit; the half of the box it once took was met to the pixel by a mark a link's height taller (mw-5r3p30.677)
        if (gap + 72 > room.height - 8) continue;
        box.scrollTop += mark.getBoundingClientRect().top - room.top - 8;
        return;
      }
    };
    // The control an answer is for, which he must not have to scroll to find: the goal offer's buttons (mw-5r3p30.196, no further than the question's top, the quiz
    // question after it may sit below) or the bridge's Take me there (mw-1vuvq6.9, no further than the offer's top).
    const MUST = '[data-quiz-goal-buttons], [data-bridge-take]';
    const keeping = newest ? newest.querySelector(MUST) !== null : failed !== null;
    const align = () => {
      if (!newest) {
        if (failed) revealFoot(box, failed, failed, true);
        return;
      }
      // the newest turn's top at the box's padding edge, where the first turn of a talk stands: nothing moves when its answer lands (mw-5r3p30.489)
      box.scrollTop += newest.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientTop - (parseFloat(getComputedStyle(box).paddingTop) || 8);
      // sideways a two-line question and the speaking bar leave an answer under two lines: it is read from its first three (mw-5r3p30.488)
      const text = newest.querySelector<HTMLElement>('[data-answer-text]');
      if (text) revealLines(box, text, 3);
      const must = newest.querySelector<HTMLElement>(MUST);
      if (!must) return;
      revealFoot(box, must, newest.querySelector<HTMLElement>('[data-quiz-goal-question], [data-bridge-offer]') ?? must);
    };
    const place = () => {
      align();
      showSettled();
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    // The sheet and the answer settle for a moment after they draw (the speaking bar comes up under the box as the answer is read): keep it in view until they have, or until he scrolls himself.
    const settle = new ResizeObserver(place);
    settle.observe(box);
    settle.observe(followed);
    const stopSettling = () => settle.disconnect();
    const timer = window.setTimeout(stopSettling, 1500);
    box.addEventListener('wheel', stopSettling, { once: true });
    box.addEventListener('touchstart', stopSettling, { once: true });
    // For as long as an offer waits for his choice or a failure for his Retry, a change in the box's height (the phone turned, the keyboard, the microphone line) brings it
    // back into view (mw-5r3p30.211, mw-5r3p30.443). Only the box's own height: the answer growing under his reading must not take the scroll from him.
    let height = box.clientHeight;
    const follow = new ResizeObserver(() => {
      if (box.clientHeight === height) return;
      height = box.clientHeight;
      place();
    });
    if (keeping) follow.observe(box);
    return () => {
      window.clearTimeout(timer);
      box.removeEventListener('wheel', stopSettling);
      box.removeEventListener('touchstart', stopSettling);
      stopSettling();
      follow.disconnect();
    };
  }, [turnCount, state?.phase, waiting]);
  // A tap on a setting offer adds its change to a turn already on screen: its foot (Changed: ..., Undo, Copy) is brought into the box, which the speaking bar
  // and the composer leave about 190 px at 390 x 844, so the confirmation is not left under the bar (mw-5r3p30.224). The Changed line stays the first thing seen.
  const changeCounts = useRef<Map<number, number> | null>(null);
  useEffect(() => {
    if (turns === undefined) return;
    const now = new Map<number, number>();
    for (const t of turns) if (t.id !== undefined) now.set(t.id, t.changes?.length ?? 0);
    const before = changeCounts.current;
    changeCounts.current = now;
    const box = list.current;
    if (!before || !box) return;
    const grown = [...now].filter(([id, n]) => before.has(id) && n > (before.get(id) as number)).map(([id]) => id).pop();
    if (grown === undefined) return;
    const turn = box.querySelector<HTMLElement>(`[data-turn-id="${grown}"]`);
    const card = turn?.querySelector<HTMLElement>('[data-talk-a]');
    const line = turn?.querySelector<HTMLElement>('[data-talk-change]');
    if (!card || !line) return;
    const room = box.getBoundingClientRect();
    box.scrollTop += Math.min(Math.max(0, card.getBoundingClientRect().bottom - room.bottom + 8), line.getBoundingClientRect().top - room.top - 8);
  }, [turns]);
  // Closing the sheet takes its answer's speech with it; an answer that waits for his return keeps its bar (mw-5r3p30.323).
  useEffect(() => () => stopAnswerSpeech(), []);
  // The words of a hold that did not end in a release (a slide off the Talk bar, the recogniser failing) wait in the field, unsent (src/talk/keptWords.ts).
  const composer = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      registerKeeper((words) =>
        setText((now) => {
          const kept = now.trim() ? `${now.trim()} ${words}` : words;
          return kept;
        }),
      ),
    [],
  );
  // A phone with no recogniser sends a hold to the typed field.
  useEffect(() => {
    if ((opened?.typing ?? 0) > 0) focusQuietly(composer.current?.querySelector('textarea') ?? null);
  }, [opened?.typing]);

  // The pictures in flight, from Send until the answer, shown under his question. The ones waiting to go are the Composer's: it adds a picked, taken or pasted file to its
  // row; each is cut down on the phone as Send is pressed (src/talk/pictures.ts preparePictures), and a message that cannot go keeps them in the row.
  const [inFlight, setInFlight] = useState<InFlight[]>([]);
  // The shared pictures wait in the composer, once (Composer.incomingFiles adds each new list once).
  const sharedFiles = shared?.files;
  // 'Send a screenshot' (a suggestion) opens the picker where the composer's attach button would, and sends no words
  const openPicker = (): void => composer.current?.querySelector<HTMLButtonElement>(`button[aria-label="${TALK_LABELS.attach}"]`)?.click();
  // a question past the cap stays in the box, never cut; Send is off and the count says why (src/services/requestBudget.ts MAX_QUESTION_CHARS)
  const tooLong = isTooLong(text, MAX_TALK_CHARS);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const sendMessage = async ({ text: said, files }: ComposerMessage): Promise<boolean> => {
    const message = said.trim();
    if ((!message && files.length === 0) || message.length > MAX_TALK_CHARS || busy) return false;
    if (files.length > TALK_MAX_PICTURES) throw new Error(TOO_MANY_TO_SEND_LINE);
    // the pictures are cut down first (an Error says which could not be used, and the row keeps them); a message of pictures alone asks what the pictures say
    const pictures = await preparePictures(files);
    if (!mounted.current) return false;
    if (pictures.length > 0) setInFlight(pictures.map((p, i) => ({ key: i, url: dataUrlOf(p.bytes, p.mime) })));
    onSay(message || PICTURE_ONLY_QUESTION, undefined, pictures);
    return true;
  };
  const ask = (question: string): void => {
    if (question === SEND_A_SCREENSHOT) openPicker();
    else if (question.trim() && !busy) onSay(question.trim());
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
        >
          <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
            <div className="flex min-h-12 w-full flex-wrap items-center gap-x-2 short:min-h-11">
              <h2 id={titleId} className="min-w-[8rem] flex-1 text-xl font-semibold text-balance break-words short:truncate">
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
                    // a failure he clears with New talk is not shown again, nor after a reload
                    setPending(talkKey(ref), undefined);
                    void deleteTurns(ref);
                  }}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent"
                >
                  New talk
                </button>
              ) : null}
              <button
                type="button"
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
            {turns?.length === 0 && !state && suggestions?.length ? <Suggestions questions={suggestions} onAsk={ask} /> : null}
            <HebrewAskContext.Provider value={hebrew}>
              {turns?.map((turn) => (
                <Turn key={turn.id} turn={turn} scope={scope} onLook={setLookup} onLeave={onClose} />
              ))}
            </HebrewAskContext.Provider>
            {state ? (
              <div data-talk-pending className="space-y-2">
                {inFlight.length > 0 ? <PictureThumbs pictures={inFlight.map((p) => ({ key: p.key, url: p.url }))} /> : null}
                {state.phase === 'failed' ? (
                  <PendingQuestion text={state.question} />
                ) : (
                  <QuestionRow shown={state.question} copyText={state.question} />
                )}
                {state.phase === 'failed' ? (
                  <div role="alert" data-talk-failed className="space-y-2">
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
                  <Waiting state={state} />
                )}
              </div>
            ) : null}
            {turns && !busy && (turns.length > 0 || state) && more.length > 0 ? <Suggestions questions={more} onAsk={ask} label="Ask something else" /> : null}
          </div>
          <BarSlot level={3} />
          <div ref={composer} data-composer className="shrink-0 space-y-2 border-t border-line px-4 pt-2 short:pt-0 pb-[calc(0.75rem+var(--lp-bar-inset))]">
            {live?.listening ? (
              <div data-talk-live role="status" className="rounded-2xl border border-bad px-3 py-2">
                <p className="text-sm font-medium text-bad">{live.ready ? 'Listening… let go to send, slide away to cancel' : 'Starting the microphone…'}</p>
                <p className="min-h-7 break-words text-lg">{live.transcript}</p>
              </div>
            ) : null}
            {notice ? (
              <p role="alert" className="break-words text-base text-bad">
                {notice}
              </p>
            ) : null}
            <LengthNote id={countId} text={text} max={MAX_TALK_CHARS} what="question" />
            {/* The kit's Composer, as Ask the tutor draws it: Hold to talk (or Tap to talk, Settings > Talk), Type a message, Attach a picture, Take a photo. Anything playing aloud is paused
                while he holds (src/speech/askTranscriber.ts), and an answer that arrives meanwhile waits (src/talk/holding.ts). A question over the cap is kept, not sent (sendBlocked). */}
            <Composer
              settings={{ ...talkSettings, attach: true, camera: true }}
              transcriber={askTranscriber}
              lang="en-US"
              appName="Lampas"
              labels={{ ...TALK_LABELS, hold: tapWord('Hold to talk', talkSettings.talk), tryAgain: tapWord('Hold to talk', talkSettings.talk) }}
              text={text}
              onTextChange={setText}
              incomingFiles={sharedFiles}
              refuseFile={refuseNonPicture}
              sendBlocked={tooLong}
              renderSend={(slot) => <SendArrow slot={slot} why={tooLong ? countId : undefined} />}
              disabled={busy}
              onHoldStart={holdBegan}
              onHoldEnd={holdEnded}
              onSend={sendMessage}
            />
          </div>
        </div>
      </div>
      {lookup ? <WordSheet chapter={scope.chapter} lookup={lookup} onClose={closeWord} onHelp={onHelp} onAskTerm={onAskTerm} /> : null}
      <BridgeIdeaHost owner="talk" />
    </>
  );
}
