// src/useTalk.ts — the Bible talk's messages in flight, by conversation. A message keeps waiting when he closes the sheet; its
// answer is kept when it comes and `onAnswered` is told, so a sheet still open can read it aloud. They all stop when the
// reader goes away, but what each message was doing is kept (src/pending/pendingAsks.ts): a message that had gone is waited for again, never sent a second time, when its sheet
// is opened on the page that is back (`resume`), and a failure stays with its Retry.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { missingFoundations, resolveBridge } from './data/grammar/bridge';
import { levelsOf } from './data/grammar/goalProgress';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { requestsForTutor } from './data/requestsForTutor';
import { focusLemmaOf, learnerMemory } from './data/learnerMemory';
import { learnerProfile } from './data/learnerProfile';
import { learnerSummary } from './data/learnerSummary';
import { learnFromTalk } from './data/repositories/profile';
import { addTurn, keepFetched, getGreekPronunciation, getReaderView, getQuizGoal, getStudyResources, getTalkSummary, keepTalkSummary, listLevels, listSolidHeadwords, listStudyWay, listTurns, shelfOf } from './data/repositories';
import { resourcesForTutor, worksForTutor } from './resources/tutorLinks';
import { mapsFor } from './maps';
import { getDeviceKeyBytes } from './services/deviceKey';
import type { TalkSession } from './services/mill';
import { TutorError } from './services/tutor';
import { checkedSyllables } from './speech/greekSyllables';
import { stopAnswer } from './speech/readAloud';
import { wasSpoken } from './speech/spoken';
import { readTarget, type GoPlace } from './talk/go';
import { addWord, askBack, askedNames, bibleTalkClient, bibleTalkRegistry, changeSettings, lookingLine, noteLateAsks, withTutorFacts } from './tutor/registry';
import { doneLinesOf } from './talk/doneLines';
import { holdUndo } from './talk/doneUndo';
import { leaveSheetForTutor } from './ui/sheetBack';
import { currentSettings, offeredChange } from './settings/registry';
import { chapterOfferLang, greekOfferOf } from './talk/greekOffer';
import { greekLevelOf } from './settings/definitions/greekInterest';
import { hebrewLevelOf } from './settings/definitions/hebrewInterest';
import { higherInterest } from './services/interestField';
import { rustyOfferOf } from './talk/rustyOffer';
import { quizGoalOfferOf } from './talk/quizGoalOffer';
import { rustyNow } from './data/learnerRusty';
import { todayNow } from './data/learnerToday';
import { todayOfferOf } from './talk/todayOffer';
import { applyMemoryFromAnswer } from './talk/memoryUpdate';
import { finishWelcome } from './data/repositories/welcome';
import { pendingOfferOf, settleOffer } from './talk/offers';
import { filesOf, type OutgoingPicture } from './talk/pictures';
import { answerDrawn } from './services/clientTiming';
import { fetchPassages } from './services/talkFetch';
import { askTalk, buildTalkRequest, fitHistory, MAX_HISTORY_TURNS, MAX_LINKS, scopeRef, scopeTitle, summaryOfKeyPoints, talkNameOf, type TalkAnswer, type TalkFocus, type TalkScope } from './services/talk';
import type { HebrewSounds } from './data/db';
import { isOrphan, pendingOf, setPending, startRunning, talkKey, usePendingAsks, type AskState, type SentRef } from './pending/pendingAsks';

type Talks = Record<string, AskState | undefined>;

export interface UseTalk {
  /** what the message of each conversation (by its ref) is doing now */
  states: Talks;
  /** says `message` in the conversation `scope` names; `focus` is the word the message asks help with; `pictures` go with it as the grist's
   * attachments and are kept with the turn. A message sent again unchanged (Retry) keeps the focus and the pictures it was first sent with. */
  say: (scope: TalkScope, message: string, focus?: TalkFocus, pictures?: OutgoingPicture[]) => void;
  /** Waits again for the message of `scope`'s conversation that a page or screen that went away left waiting (its grist is not sent a second time); none left: nothing happens. */
  resume: (scope: TalkScope) => void;
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
    const { headword, result } = await addWord(scope, lemma);
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

/** How a screen lets an answer take him to a chapter or another place (mw-5r3p30.172, mw-t3xu9a.4): `allowed(ref)` is true while the sheet of that conversation is open, the only time he is
 * there to be taken; `leave()` is called as the place opens, to close the sheet, and may return how to open it again: Back from the place comes to the sheet (src/ui/sheetBack.ts
 * leaveSheetForTutor). The place itself opens through the tutor client's registry (src/tutor/registry.ts), as a pushed entry marked as a tutor go. `here(place)` (the Reader's) is true for the chapter
 * he is on, where nothing moves and the answer says 'Already on ...' (mw-5r3p30.199). */
export interface GoTo {
  allowed: (ref: string) => boolean;
  here?: (place: GoPlace) => boolean;
  leave?: () => (() => void) | void;
}

/** `onAnswered(ref, turnId, answer, info)` is called once an answer has been kept, unless the answer took him to another place (`goTo.leave`). */
export function useTalk(
  book: string,
  chapter: number,
  onAnswered: (ref: string, turnId: number, answer: string, info: AnswerInfo) => void,
  goTo?: GoTo,
): UseTalk {
  const table = usePendingAsks();
  const states = useMemo<Talks>(() => Object.fromEntries(Object.entries(table).filter(([key]) => key.startsWith('talk:')).map(([key, state]) => [key.slice('talk:'.length), state])), [table]);
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

  /** Sends `text` in `scope`'s conversation, or, with `resume` (the grist of this very message that went), waits for the answer to that one; `startedAt` is when it was first said. */
  const run = useCallback(
    (scope: TalkScope, text: string, focus: TalkFocus | undefined, pictures: OutgoingPicture[], spoken: boolean, resume?: SentRef, startedAt = Date.now()) => {
      const ref = scopeRef(book, chapter, scope);
      const key = talkKey(ref);
      const signal = live.current.signal;
      const stopRunning = startRunning(key);
      // a screen that went away stops writing what the message is doing: what was kept stays, to be waited for again
      const set = (state: AskState | undefined): void => {
        if (!signal.aborted) setPending(key, state);
      };
      const withFocus = { ...(focus ? { focus } : {}), ...(spoken ? { spoken: true as const } : {}) };
      set(resume ? { phase: 'waiting', question: text, startedAt, sent: resume, ...withFocus } : { phase: 'sending', question: text, startedAt, ...withFocus });
      void (async () => {
        try {
          const [turns, solid, settings, learner, grammar, way, chosen, goal, requests, profile, pronunciation, memory, levels, readerView, rusty, works, kept, today, chapterMaps] = await Promise.all([
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
            // the notes the app names for this place, word and screen; a talk from a screen is not about a place
            learnerMemory(scope.screen ? undefined : scopeTitle(scope), focusLemmaOf(focus), scope.screen?.name).catch(() => undefined),
            listLevels().catch(() => undefined),
            getReaderView().catch(() => undefined),
            // the solid words and ideas he now slips on or has been away from: the tutor says so once and may offer to move them back (src/data/rusty.ts); not in a quiz
            scope.quiz || scope.welcome ? Promise.resolve(undefined) : rustyNow().catch(() => undefined),
            shelfOf().catch(() => []),
            // the running summary of this talk and how many of its oldest turns it holds (mw-5r3p30.700)
            getTalkSummary(ref).catch(() => undefined),
            // the items behind the Reader's chip 'Today · N of M', so 'what is on my drill today' is answered by name and Today can be offered (src/data/learnerToday.ts); not in a quiz or the welcome
            scope.quiz || scope.welcome ? Promise.resolve(undefined) : todayNow().catch(() => undefined),
            // the maps of the chapter the talk holds, for the tutor to link (src/maps/forTutor.ts); a talk from a screen holds none
            scope.screen ? Promise.resolve([]) : mapsFor({ book, chapter }).catch(() => []),
          ]);
          // What he lacks under the topic his words name, worked out here so the tutor picks from it and never guesses (mw-1vuvq6.5); a quiz is not a place to bridge
          const missing = levels && !scope.quiz && !scope.screen?.credits ? missingFoundations(text, levelsOf(levels), focus && 'term' in focus ? focus.term : undefined) : undefined;
          // an offer still waiting for his tap rides with this message: the grind decides from his words whether it is a yes, a no or a request to hear it
          const waiting = pendingOfferOf(turns, levels && levelsOf(levels));
          // a goal he chose Just this time for earlier in this quiz is sent for this quiz alone
          const once = turns.findLast((t) => t.quizGoalChoice === 'once')?.quizGoalOffer;
          let sentAs: string | undefined;
          let sentRef: SentRef | undefined = resume;
          // the talk goes by its ref and the time of its first turn (the mill keeps one session for it); a first turn is kept with that very time, so the name is the same on every turn after it
          const { talk, when: firstWhen } = talkNameOf(ref, turns, startedAt);
          const said: { session?: TalkSession } = {};
          // the Greek dial's step: the resources and works the tutor is told of follow it (resourcesForLevel)
          // the tutor's resources and works follow the higher of the two dials (mw-gdcyf98.3); the Greek offer, below, the Greek one
          const greekLevel = higherInterest(settings);
          // fitted here, not in askTalk, to know which turns the request carries to be folded into the summary: the fit may add the turns it drops from the history (not the ones the summary holds already, still in the window)
          const request = fitHistory(await withTutorFacts(buildTalkRequest(scope, text, turns, solid, settings, focus, learner, grammar, way, resourcesForTutor(chosen, greekLevel), pictures.length, { kept: goal, once }, waiting?.offer, requests, profile, pronunciation, spoken, memory, missing, readerView, rusty, worksForTutor(works, scope.screen ? undefined : { book, chapter, ...(scope.verse ? { verse: scope.verse.n } : {}) }, text, greekLevel), kept && { text: kept.summary, covered: kept.covered }, today, chapterMaps), turns.length), Math.max(0, (kept?.covered ?? 0) - Math.max(0, turns.length - MAX_HISTORY_TURNS)), talk);
          const options = {
            key: getDeviceKeyBytes(),
            files: pictures.length ? filesOf(pictures) : undefined,
            signal,
            talk,
            onTalk: (session: TalkSession) => {
              said.session = session;
            },
          };
          let answer = await askTalk(request, {
            ...options,
            tapAt: startedAt,
            resume,
            onSent: (txid, seq) => {
              sentAs = txid;
              sentRef = { txid, seq };
              set({ phase: 'waiting', question: text, startedAt, sent: sentRef, ...withFocus });
            },
          });
          // The answer asks for facts of the app first (`asks`): the sheet says what the tutor is looking at, the registry reads those facts (recording each ask-back) and the request goes again, in the same talk, with
          // them as `asked`. The second answer stands: what it asks for again is not read (a turn has two rounds). An answer that asks for nothing shows no such line (mw-t3xu9a.7).
          const asks = askedNames(answer.asks);
          if (asks.length > 0) {
            const looking = lookingLine(asks);
            void answerDrawn(sentAs);
            const followedAt = Date.now();
            set({ phase: 'waiting', question: text, startedAt, ...(sentRef ? { sent: sentRef } : {}), looking, ...withFocus });
            const asked = await askBack(asks, turns.length);
            answer = await askTalk({ ...request, asked }, {
              ...options,
              tapAt: followedAt,
              onSent: (txid, seq) => {
                sentAs = txid;
                sentRef = { txid, seq };
                set({ phase: 'waiting', question: text, startedAt, sent: sentRef, looking, ...withFocus });
              },
            });
            const again = askedNames(answer.asks);
            if (again.length > 0) await noteLateAsks(again, turns.length);
          }
          // The settings he asked for are applied at once (the registry checks each), then kept with the turn for its Undo.
          const { applied, refused } = await changeSettings(answer.settings_changes);
          // What his words did to the offer that waited (mw-5r3p30.186): a yes does what its tap does, a no withdraws it, a request to hear it changes nothing.
          const settled = await settleOffer(waiting ? answer.offer_reply : undefined, waiting, scope);
          applied.push(...settled.applied);
          refused.push(...settled.refused);
          // What the tutor learned of him as a student is kept beside his profile (checked and never over what he set); it never fails the talk.
          if (answer.profile_update || answer.profile_question) await learnFromTalk(ref, answer.profile_update ?? [], answer.profile_question).catch(() => undefined);
          // What the tutor wants to keep of him: appends at once, a replace or remove only when he asked (src/talk/memoryUpdate.ts); it never fails the talk.
          await applyMemoryFromAnswer(answer, Date.now(), chapterOfferLang(scope)).catch(() => undefined);
          // The welcome interview is over once the tutor says so with its line of thanks; the sheet stays open to be read (src/Welcome.tsx)
          if (scope.welcome && answer.welcome_done) await finishWelcome().catch(() => undefined);
          // The one offer of the original, kept only while this talk has made none and his no (of its language) is not in the index the request carried or in this very answer; it raises the dial of the chapter's language (src/talk/greekOffer.ts)
          const dial = chapterOfferLang(scope) === 'he' ? hebrewLevelOf(settings.hebrewInterest) : greekLevelOf(settings.greekInterest);
          const greekOffer = greekOfferOf(answer, scope, turns, memory?.index, waiting?.offer.kind === 'greek' && answer.offer_reply === 'decline', dial);
          // The one offer to move the rust back to Frontier: only the items this request listed, once a talk, none after his no in this very answer (src/talk/rustyOffer.ts)
          const rustyOffer = rustyOfferOf(answer, scope, turns, rusty, waiting?.offer.kind === 'rusty' && answer.offer_reply === 'decline');
          // The one offer to open Today: only when this request listed its items, once a talk, none after his no in this very answer (src/talk/todayOffer.ts)
          const todayOffer = todayOfferOf(answer, scope, turns, today, waiting?.offer.kind === 'today' && answer.offer_reply === 'decline');
          const { added, already, unknown } = await addWords(scope, answer.words_to_add ?? []);
          // The commands the answer names (`do`), run by the tutor client in order through the registry; a refused name or args is recorded as a miss, as are the misses the answer names. What each did is a line of the turn:
          // the app's own words for it, with its Undo when it can be undone, or for a command that needs his yes the question and a button (src/talk/DoneLine.tsx). It never fails the talk.
          const taken = answer.do?.length || answer.misses?.length ? await bibleTalkClient().takeAnswer({ do: answer.do, misses: answer.misses }, turns.length).catch(() => undefined) : undefined;
          const ranDo = taken ? doneLinesOf(answer.do ?? [], taken, bibleTalkRegistry()) : undefined;
          if (ranDo) refused.push(...ranDo.refused);
          // A place he asked to be taken to (a chapter, or a screen the registry names): opened only while this talk's sheet is open. The chapter he is on stays (said so); a chapter that came after he closed the
          // sheet is kept to open with a tap (said so); any other go is said not to have happened.
          const go = readTarget(answer.go, bibleTalkRegistry());
          const door = going.current;
          const chapterHere = go?.ok && go.target.chapter && door?.here?.(go.target.chapter) ? go.target.chapter : undefined;
          const target = go?.ok && door?.allowed(ref) && !chapterHere ? go.target : undefined;
          const stayed = chapterHere?.title;
          const unopened = go?.ok && door && !door.allowed(ref) && !stayed ? go.target.chapter : undefined;
          if (go && !target && !stayed && !unopened) refused.push(`Could not open ${go.ok ? go.target.title : go.title}`);
          // The tutor folded the turns this request carried in `fold` into the summary: keep it, and how many of the oldest turns it holds now; it never fails the talk.
          if (answer.summary && request.fold?.length) await keepTalkSummary(ref, answer.summary, (kept?.covered ?? 0) + request.fold.length).catch(() => undefined);
          // The mill ended the talk's session at its cap and began a fresh one from its key points: they are the talk's summary now (they hold every turn so far), and the turn says so (mw-pxji7y.3); it never fails the talk.
          const keyPoints = said.session?.session === 'refreshed' ? said.session.key_points : undefined;
          if (keyPoints) await keepTalkSummary(ref, summaryOfKeyPoints(keyPoints), turns.length).catch(() => undefined);
          const id = await addTurn(ref, text, answer.answer, answer.words, turns.length === 0 ? firstWhen : Date.now(), { keyPoints, opened: target?.title, stayed, unopened, done: ranDo?.lines, changes: applied, refused, added, already, unknown, links: answer.links?.slice(0, MAX_LINKS), studyWayLine: scope.quiz ? answer.study_way_line : undefined, quizGoalOffer: scope.quiz ? quizGoalOfferOf(answer.quiz_goal_offer, { kept: goal, once }) : undefined, guide: hebrewGuideOf(focus, answer), feedbackOffer: answer.feedback_offer?.summary, settingOffer: settingOfferOf(answer), bridge: answer.bridge ? resolveBridge(answer.bridge, missing) : undefined, greekOffer, rustyOffer, todayOffer, cleanQ: answer.question, spoken, pictures });
          pictured.current[ref] = undefined;
          ranDo?.undos.forEach((undo, i) => (undo ? holdUndo(id, i, undo) : undefined));
          // The passages the tutor asked for are read from the app's own text in the background, after the answer is kept: he waits for nothing, the turn then says what was read,
          // and the next request holds them (mw-5r3p30.734, src/services/talkFetch.ts); it never fails the talk.
          if (answer.fetch?.length) void fetchPassages(answer.fetch).then((read) => (read.length > 0 ? keepFetched(id, read) : undefined)).catch(() => undefined);
          // the answer is kept: the message is done, even if the screen went away as it came
          setPending(key, undefined);
          void answerDrawn(sentAs);
          if (signal.aborted) return;
          if (target) {
            const reopen = going.current?.leave?.();
            if (reopen) leaveSheetForTutor(reopen);
            await bibleTalkClient().takeAnswer({ go: { name: target.name, args: target.args } }, turns.length).catch(() => undefined);
          } else answered.current(ref, id, answer.answer, { focus, syllables: readableSyllables(focus, answer.syllables) });
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set({ phase: 'failed', question: text, failure, detail: err instanceof Error ? err.message : 'Something went wrong.', startedAt, ...(err instanceof TutorError && err.sent ? { sent: err.sent } : {}), ...withFocus });
        } finally {
          stopRunning();
        }
      })();
    },
    [book, chapter],
  );

  const say = useCallback(
    (scope: TalkScope, message: string, focusOf?: TalkFocus, picturesOf?: OutgoingPicture[]) => {
      const text = message.trim();
      if (!text) return;
      const ref = scopeRef(book, chapter, scope);
      const kept = focused.current[ref];
      const failed = pendingOf(talkKey(ref));
      // Retry (the same text again) sends the focus and the pictures it was first sent with, and, when its grist went and the link failed after, waits for that grist's answer
      const same = failed?.phase === 'failed' && failed.question === text ? failed : undefined;
      const focus = focusOf ?? (kept?.text === text ? kept.focus : same?.focus);
      focused.current[ref] = focus ? { text, focus } : undefined;
      const pictures = picturesOf?.length ? picturesOf : pictured.current[ref]?.text === text ? pictured.current[ref].pictures : [];
      pictured.current[ref] = pictures.length ? { text, pictures } : undefined;
      // a new message ends the speech of the last response
      stopAnswer();
      // spoken is settled as he sends, once: the words he spoke are forgotten as they go, and a Retry carries the mark the failed message had
      // and, when its grist went, the time it was first asked, so a first turn is stored under the name it was waited for with (talkNameOf)
      run(scope, text, focus, pictures, same ? same.spoken === true : wasSpoken(text), same?.sent, same?.sent ? same.startedAt : undefined);
    },
    [book, chapter, run],
  );

  const resume = useCallback(
    (scope: TalkScope) => {
      const key = talkKey(scopeRef(book, chapter, scope));
      const kept = pendingOf(key);
      if (!kept || kept.phase === 'failed' || !isOrphan(key)) return;
      if (kept.sent) run(scope, kept.question, kept.focus, [], kept.spoken === true, kept.sent, kept.startedAt);
      else setPending(key, { phase: 'failed', question: kept.question, failure: 'unreachable', detail: 'The page was closed before the message went. Nothing was lost: send it again.', startedAt: kept.startedAt, ...(kept.focus ? { focus: kept.focus } : {}) });
    },
    [book, chapter, run],
  );

  return { states, say, resume };
}
