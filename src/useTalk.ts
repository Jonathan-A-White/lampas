// src/useTalk.ts — the Bible talk's messages in flight, by conversation. A message keeps waiting when he closes the sheet; its
// answer is kept when it comes and `onAnswered` is told, so a sheet still open can read it aloud. They all stop when the
// reader goes away.
import { useCallback, useEffect, useRef, useState } from 'react';
import { addLemmaToLearn } from './data/answerWord';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { requestsForTutor } from './data/requestsForTutor';
import { learnerProfile } from './data/learnerProfile';
import { learnerSummary } from './data/learnerSummary';
import { learnFromTalk } from './data/repositories/profile';
import { addTurn, getGreekPronunciation, getQuizGoal, getStudyResources, listSolidHeadwords, listStudyWay, listTurns } from './data/repositories';
import { resourcesForTutor } from './resources/tutorLinks';
import { getDeviceKeyBytes } from './services/deviceKey';
import { TutorError } from './services/tutor';
import { checkedSyllables } from './speech/greekSyllables';
import { stopAnswer } from './speech/readAloud';
import { wasSpoken } from './speech/spoken';
import { readGo, type GoPlace } from './talk/go';
import { applyChanges, currentSettings, offeredChange } from './settings/registry';
import { pendingOfferOf, settleOffer } from './talk/offers';
import { filesOf, type OutgoingPicture } from './talk/pictures';
import { askTalk, buildTalkRequest, MAX_LINKS, scopeRef, type TalkAnswer, type TalkFocus, type TalkScope } from './services/talk';
import type { HebrewSounds } from './data/db';
import type { AskState } from './useAsks';

type Talks = Record<string, AskState | undefined>;

export interface UseTalk {
  /** what the message of each conversation (by its ref) is doing now */
  states: Talks;
  /** says `message` in the conversation `scope` names; `focus` is the word the message asks help with; `pictures` go with it as the grist's
   * attachments and are kept with the turn. A message sent again unchanged (Retry) keeps the focus and the pictures it was first sent with. */
  say: (scope: TalkScope, message: string, focus?: TalkFocus, pictures?: OutgoingPicture[]) => void;
}

/** What `onAnswered` is told besides the answer's text: the focus the message had and the syllables the answer lists. */
export interface AnswerInfo {
  focus?: TalkFocus;
  syllables?: string[];
}

/** Puts the lemmas an answer asked for on his words-to-learn list, once each, with the lexicon's gloss; says which were new, which
 * were there already and which the lexicon does not know (those are not added). */
async function addWords(scope: TalkScope, lemmas: string[]): Promise<{ added: string[]; already: string[]; unknown: string[] }> {
  const added: string[] = [];
  const already: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const lemma of lemmas) {
    const { headword, result } = await addLemmaToLearn(scope, lemma);
    if (!headword || seen.has(headword)) continue;
    seen.add(headword);
    if (result === 'added') added.push(headword);
    else if (result === 'already') already.push(headword);
    else if (result === 'unknown') unknown.push(headword);
  }
  return { added, already, unknown };
}

/** The setting change an answer offers, if the registry would take it: just its key and value. */
function settingOfferOf(answer: TalkAnswer): { key: string; value: string | number } | undefined {
  const offered = offeredChange(answer.setting_offer);
  return offered ? { key: offered.key, value: offered.value } : undefined;
}

/** The pronunciation guide of an answer to a Hebrew word's sound question: its syllables over how each sounds; none for any other answer. */
function hebrewGuideOf(focus: TalkFocus | undefined, answer: TalkAnswer): HebrewSounds | undefined {
  if (!focus || !('form' in focus) || focus.kind !== 'sound' || focus.language !== 'he' || !answer.syllables?.length) return undefined;
  return { word: focus.form, syllables: answer.syllables, sounds: answer.transliteration ?? [] };
}

/** The syllables of a Greek word's sound answer as they are read aloud: the tutor's when they spell the word and cut no diphthong, else the app's own cut of the word (mw-5r3p30.241). Hebrew's and every other answer's are left alone. */
function readableSyllables(focus: TalkFocus | undefined, syllables: string[] | undefined): string[] | undefined {
  if (!syllables?.length || !focus || !('form' in focus) || focus.kind !== 'sound' || focus.language) return syllables;
  return checkedSyllables(focus.form, syllables);
}

/** How the Reader lets an answer take him to a chapter (mw-5r3p30.172): `allowed(ref)` is true while the sheet of that conversation is open, the only time he is
 * there to be taken; `open(place)` opens the chapter once the answer is kept; `here(place)` (the Reader's) is true for the chapter he is on, where nothing moves
 * and the answer says 'Already on ...' (mw-5r3p30.199). */
export interface GoTo {
  allowed: (ref: string) => boolean;
  here?: (place: GoPlace) => boolean;
  open: (place: GoPlace) => void;
}

/** `onAnswered(ref, turnId, answer, info)` is called once an answer has been kept, unless the answer took him to another chapter (`goTo.open`). */
export function useTalk(
  book: string,
  chapter: number,
  onAnswered: (ref: string, turnId: number, answer: string, info: AnswerInfo) => void,
  goTo?: GoTo,
): UseTalk {
  const [states, setStates] = useState<Talks>({});
  const live = useRef<AbortController>(new AbortController());
  const answered = useRef(onAnswered);
  const going = useRef(goTo);
  // The last message of each conversation that carried a focus, so that Retry (the same text again) sends it again.
  const focused = useRef<Record<string, { text: string; focus: TalkFocus } | undefined>>({});
  // The pictures of a message that has not been answered, so that Retry (the same text again) sends them again.
  const pictured = useRef<Record<string, { text: string; pictures: OutgoingPicture[] } | undefined>>({});
  useEffect(() => {
    answered.current = onAnswered;
    going.current = goTo;
  });

  useEffect(() => {
    // React strict mode runs the effect twice: the controller made while the screen was away is replaced here.
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => {
      controller.abort();
    };
  }, []);

  const say = useCallback(
    (scope: TalkScope, message: string, focusOf?: TalkFocus, picturesOf?: OutgoingPicture[]) => {
      const text = message.trim();
      if (!text) return;
      const ref = scopeRef(book, chapter, scope);
      const kept = focused.current[ref];
      const focus = focusOf ?? (kept?.text === text ? kept.focus : undefined);
      focused.current[ref] = focus ? { text, focus } : undefined;
      const pictures = picturesOf?.length ? picturesOf : pictured.current[ref]?.text === text ? pictured.current[ref].pictures : [];
      pictured.current[ref] = pictures.length ? { text, pictures } : undefined;
      // a new message ends the speech of the last response
      stopAnswer();
      const signal = live.current.signal;
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setStates((all) => ({ ...all, [ref]: state }));
      };
      const startedAt = Date.now();
      set({ phase: 'sending', question: text, startedAt });
      void (async () => {
        try {
          const [turns, solid, settings, learner, grammar, way, chosen, goal, requests, profile, pronunciation] = await Promise.all([
            listTurns(ref),
            listSolidHeadwords(),
            currentSettings(),
            learnerSummary(),
            learnerGrammar().catch(() => undefined),
            scope.quiz ? listStudyWay() : Promise.resolve([]),
            getStudyResources().catch(() => ({ on: [], options: {} })),
            scope.quiz ? getQuizGoal() : Promise.resolve(''),
            requestsForTutor().catch(() => []),
            learnerProfile().catch(() => undefined),
            getGreekPronunciation(),
          ]);
          // an offer still waiting for his tap rides with this message: the grind decides from his words whether it is a yes, a no or a request to hear it
          const waiting = pendingOfferOf(turns);
          // a goal he chose Just this time for earlier in this quiz is sent for this quiz alone
          const once = turns.findLast((t) => t.quizGoalChoice === 'once')?.quizGoalOffer;
          const answer = await askTalk(buildTalkRequest(scope, text, turns, solid, settings, focus, learner, grammar, way, resourcesForTutor(chosen), pictures.length, { kept: goal, once }, waiting?.offer, requests, profile, pronunciation, wasSpoken(text)), {
            key: getDeviceKeyBytes(),
            files: pictures.length ? filesOf(pictures) : undefined,
            signal,
            onSent: () => set({ phase: 'waiting', question: text, startedAt }),
          });
          // The settings he asked for are applied at once (the registry checks each), then kept with the turn for its Undo.
          const { applied, refused } = await applyChanges(answer.settings_changes);
          // What his words did to the offer that waited (mw-5r3p30.186): a yes does what its tap does, a no withdraws it, a request to hear it changes nothing.
          const settled = await settleOffer(waiting ? answer.offer_reply : undefined, waiting, scope);
          applied.push(...settled.applied);
          refused.push(...settled.refused);
          // What the tutor learned of him as a student is kept beside his profile (checked and never over what he set); it never fails the talk.
          if (answer.profile_update || answer.profile_question) await learnFromTalk(ref, answer.profile_update ?? [], answer.profile_question).catch(() => undefined);
          const { added, already, unknown } = await addWords(scope, answer.words_to_add ?? []);
          // A chapter he asked to be taken to: opened only while this talk's sheet is open. The chapter he is on stays (said so); one that came after he closed the
          // sheet is kept to open with a tap (said so); any other go is said not to have happened.
          const go = readGo(answer.go);
          const door = going.current;
          const place = go?.ok && door?.allowed(ref) && !door.here?.(go.place) ? go.place : undefined;
          const stayed = go?.ok && door?.here?.(go.place) ? go.place.title : undefined;
          const unopened = go?.ok && door && !door.allowed(ref) && !stayed ? go.place : undefined;
          if (go && !place && !stayed && !unopened) refused.push(`Could not open ${go.ok ? go.place.title : go.title}`);
          const id = await addTurn(ref, text, answer.answer, answer.words, Date.now(), { opened: place?.title, stayed, unopened, changes: applied, refused, added, already, unknown, links: answer.links?.slice(0, MAX_LINKS), studyWayLine: scope.quiz ? answer.study_way_line : undefined, quizGoalOffer: scope.quiz ? answer.quiz_goal_offer : undefined, guide: hebrewGuideOf(focus, answer), feedbackOffer: answer.feedback_offer?.summary, settingOffer: settingOfferOf(answer), cleanQ: answer.question, pictures });
          pictured.current[ref] = undefined;
          set(undefined);
          if (signal.aborted) return;
          if (place) going.current?.open(place);
          else answered.current(ref, id, answer.answer, { focus, syllables: readableSyllables(focus, answer.syllables) });
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set({ phase: 'failed', question: text, failure, detail: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      })();
    },
    [book, chapter],
  );

  return { states, say };
}
