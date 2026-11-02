// src/AskTutor.tsx — the tutor's door and the Talk sheet it opens on the screens that have no chapter of their own (mw-5r3p30.91, docs/ask-tutor.md). The one door is the floating ? (FloatingTutor):
// a round button at the Hand side's edge, over every screen and sheet that registered something to ask about (src/tutor/door.ts), on a phone with a licence. The round button of each screen, the Reader's
// Talk bar and every sheet's own Ask the tutor are gone (mw-5r3p30.882). The sheet is the Talk sheet over a TalkScope with a `screen` (name and facts, src/tutor/screen.ts), kept under 'screen.<name>';
// it opens with the questions fitted to the screen. The Reader opens its own chapter talk (src/Reader.tsx).
import { useCallback, useEffect, useRef, useState } from 'react';
import { listTurns } from './data/repositories';
import { NO_CHAPTER } from './data/chapter';
import { useAiAllowed } from './gate/licenceContext';
import { TalkSheet } from './Talk';
import { stopReading } from './speech/readAloud';
import { speakTutor } from './speech/tutorVoice';
import { answerRuns } from './speech/answerRuns';
import { scopeRef, type TalkScope } from './services/talk';
import { fitScreen, SCREEN_NAMES, suggestionsFor, type ScreenContext } from './tutor/screen';
import { askRequestNow, useAskRequest } from './tutor/askNow';
import { useScreenContext } from './tutor/screenContext';
import { type Route } from './nav/route';
import { useTalk } from './useTalk';
import { isHolding } from './talk/holding';
import { openDoorTarget, useDoorTarget, useHasDoorTarget, useTalkOpen } from './tutor/door';
import { useHand } from './settings/hand';
import { focusQuietly } from './ui/focus';

/** The speech bubble with a ? that is the tutor's mark on the floating button. */
function TutorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

/** The context the sheet sends: the facts the screen reported, if they are the screen's own, else its name alone. */
function contextOf(name: string, reported: ScreenContext | null): ScreenContext {
  return fitScreen(reported?.name === name ? reported : { name, facts: [] });
}

/** The talk of a screen's Ask the tutor: the conversation `scope` names (null when the screen has none), the voice, and what a sheet over it needs. `open` is whether its sheet is on screen
 * (an answer is spoken only then); `onClosed` is what closing the sheet does besides stopping the voice. */
function useScreenTalk(scope: TalkScope | null, open: boolean, onClosed: () => void) {
  const openRef = useRef<string | null>(null);
  const { states, say, resume } = useTalk(scope?.chapter.code ?? '', scope?.chapter.chapter ?? 0, (ref, id, answer) => {
    if (openRef.current !== ref || isHolding()) return;
    speakTutor(id, answerRuns(answer), () => openRef.current === ref);
  }, {
    // the tutor takes him to a chapter or another place (the answer's `go`) while this screen's sheet is open: the place opens as a new Back step, and Back returns to this screen
    allowed: (ref) => openRef.current === ref,
  });
  const ref = scope ? scopeRef(scope.chapter.code, scope.chapter.chapter, scope) : null;
  useEffect(() => {
    openRef.current = open ? ref : null;
  });
  return { ref, state: ref ? states[ref] : undefined, say, resume, close: onClosed };
}

/** The sheet for the screens but the Reader, and what the floating ? asks on them. */
export function AskTutor({ route }: { route: Route }) {
  // the route the sheet was opened on: it is closed once the screen changes
  const [openOn, setOpenOn] = useState<Route | null>(null);
  const ai = useAiAllowed();
  const open = openOn === route;
  const reported = useScreenContext();
  const name = route === 'home' || route === 'share' || route === 'unlock' ? undefined : SCREEN_NAMES[route];
  // a screen whose talk is its own (each paradigm table) reports the key it is kept under
  const kept = reported && reported.name === name ? reported.kept : undefined;
  const scope: TalkScope | null = name ? { title: name, chapter: NO_CHAPTER, verse: null, screen: contextOf(name, reported), ...(kept ? { kept } : {}) } : null;
  const talk = useScreenTalk(scope, open, useCallback(() => setOpenOn(null), []));
  // a button the screen draws itself (src/tutor/askNow.ts) opens this sheet; its first question goes only when the talk has no turn yet, so coming back finds what was said
  const asked = useAskRequest();
  const met = useRef(askRequestNow()?.id ?? 0);
  useEffect(() => {
    if (!asked || asked.id <= met.current || !scope || !talk.ref) return;
    met.current = asked.id;
    stopReading();
    setOpenOn(route);
    const { first } = asked;
    if (!first || talk.state !== undefined) return;
    void listTurns(talk.ref).then((turns) => {
      if (turns.length === 0) talk.say(scope, first.question, first.focus);
    });
    // a request is met once, when it arrives (`met`): the scope and the talk it is met with are the ones of that render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked]);
  const openSheet = () => {
    stopReading();
    setOpenOn(route);
  };
  // what the tutor door (src/tutor/door.ts) opens the tutor about on this screen: the screen itself
  useDoorTarget(name && scope && talk.ref && ai ? openSheet : undefined);
  if (!name || !scope || !talk.ref || !ai) return null;
  return (
    <>
      {open ? (
        <TalkSheet
          scope={scope}
          talkRef={talk.ref}
          state={talk.state}
          suggestions={suggestionsFor(name)}
          onSay={(message, focus, pictures) => talk.say(scope, message, focus, pictures)}
          onResume={() => talk.resume(scope)}
          onHelp={() => {}}
          onAskTerm={() => {}}
          onClose={talk.close}
        />
      ) : null}
    </>
  );
}

/**
 * The Talk sheet he left for a table the tutor linked, opened again by Back (src/TalkReturn.tsx, src/talkReturn.ts, mw-5r3p30.990): the held talk's `scope` names its conversation (a screen's, a drill's or a
 * chapter's), whose turns are kept, so the sheet is the one he left. Drawn only where a licence allows the tutor.
 */
export function ReturnedTalk({ scope, onClose }: { scope: TalkScope; onClose: () => void }) {
  const ai = useAiAllowed();
  const talk = useScreenTalk(scope, true, onClose);
  if (!ai || !talk.ref) return null;
  return (
    <TalkSheet
      scope={scope}
      talkRef={talk.ref}
      state={talk.state}
      suggestions={scope.screen ? suggestionsFor(scope.screen.name) : undefined}
      onSay={(message, focus, pictures) => talk.say(scope, message, focus, pictures)}
      onResume={() => talk.resume(scope)}
      onHelp={() => {}}
      onAskTerm={() => {}}
      onClose={talk.close}
    />
  );
}

/**
 * The sheet for a full-screen dialog that is no route (the results of a drill, mw-5r3p30.649): the dialog draws this inside itself, so the sheet stands
 * over it (a sheet drawn outside would be under the dialog), and the floating ? asks about the dialog. `screen` is what the dialog reports, `kept` the key the talk is kept under, one for each drill, so a drill's talk
 * is never the last drill's. Drawn only where a licence allows the tutor.
 */
export function DialogAskTutor({ screen, kept, suggestions }: { screen: ScreenContext; kept: string; suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const ai = useAiAllowed();
  const fitted = fitScreen(screen);
  const scope: TalkScope = { title: fitted.name, chapter: NO_CHAPTER, verse: null, screen: fitted, kept };
  const talk = useScreenTalk(scope, open, useCallback(() => setOpen(false), []));
  const openSheet = () => {
    stopReading();
    setOpen(true);
  };
  // the dialog is on top of its screen: the tutor door asks about the dialog (the results of a drill, a Check). It is a sheet: over an idea sheet (itself a sheet target) it is the newest of the top rank,
  // so the ? does not ask about the lesson under it, whose Talk would open beneath the dialog (mw-5r3p30.955)
  useDoorTarget(ai && talk.ref ? openSheet : undefined, false, true);
  if (!ai || !talk.ref) return null;
  return (
    <>
      {open ? (
        <TalkSheet
          scope={scope}
          talkRef={talk.ref}
          state={talk.state}
          suggestions={suggestions}
          onSay={(message, focus, pictures) => talk.say(scope, message, focus, pictures)}
          onResume={() => talk.resume(scope)}
          onHelp={() => {}}
          onAskTerm={() => {}}
          onClose={talk.close}
        />
      ) : null}
    </>
  );
}

/**
 * The talk of a lesson (mw-5r3p30.818, the idea sheet's Ask the tutor): the sheet that calls this keeps it mounted and says when `open`; the Talk sheet it draws stands over the sheet's
 * own root. `screen` is the lesson (src/tutor/lessonTalk.ts), `kept` the key its talk is kept under, one for each lesson. The talk's state lives here, not in the Talk sheet, so closing
 * the sheet while an answer is on its way loses nothing. Drawn only where a licence allows the tutor.
 */
export function LessonTalk({ screen, kept, suggestions, open, onClose }: { screen: ScreenContext; kept: string; suggestions: string[]; open: boolean; onClose: () => void }) {
  const ai = useAiAllowed();
  const fitted = fitScreen(screen);
  const scope: TalkScope = { title: fitted.name, chapter: NO_CHAPTER, verse: null, screen: fitted, kept };
  const talk = useScreenTalk(scope, open, onClose);
  if (!ai || !open || !talk.ref) return null;
  return (
    <TalkSheet
      scope={scope}
      talkRef={talk.ref}
      state={talk.state}
      suggestions={suggestions}
      onSay={(message, focus, pictures) => talk.say(scope, message, focus, pictures)}
      onResume={() => talk.resume(scope)}
      onHelp={() => {}}
      onAskTerm={() => {}}
      onClose={talk.close}
    />
  );
}

/** The floating button's name for a screen reader and the tests. */
export const FLOATING_TUTOR_LABEL = 'Ask the tutor about what is on screen';

/** The ? opened the talk that is open: it is not drawn while the Talk sheet is (FloatingTutor), so the sheet cannot give focus back to it (src/ui/sheetBack.ts gives it only to an opener still
 * in the page); the ? takes it itself when it is drawn again, if nothing else has it, as every other sheet gives it back to what opened it (tests/e2e/talkback-reading.spec.ts). */
let focusWhenBack = false;

const takeFocusBack = (button: HTMLButtonElement | null): void => {
  if (!button || !focusWhenBack) return;
  focusWhenBack = false;
  if (document.activeElement === null || document.activeElement === document.body) focusQuietly(button);
};

/**
 * The tutor's one door (mw-5r3p30.880, mw-5r3p30.882): a round tutor button at the Hand side's edge, drawn over every screen that has something to ask about, the Verse view and open sheets too (z-50: over the
 * sheets at z-35 and the full-screen dialogs at z-40, under the shell's bars). A tap opens the tutor about the newest target a screen or sheet registered (src/tutor/door.ts). Not drawn while a Talk sheet
 * is open (it has its own composer at the foot), where nothing is registered, or on a phone with no licence: then no tutor door exists. It sits 17 rem above the phone's bar, a thumb's reach up the edge (src/index.css
 * [data-floating-tutor]: at the foot in a short window while the shell's bars push the header down to it).
 */
export function FloatingTutor() {
  const licensed = useAiAllowed();
  const hand = useHand();
  const anything = useHasDoorTarget();
  const talking = useTalkOpen();
  if (!licensed || !hand || !anything || talking) return null;
  return (
    <button
      type="button"
      ref={takeFocusBack}
      data-floating-tutor
      data-hand={hand}
      aria-label={FLOATING_TUTOR_LABEL}
      onClick={() => {
        stopReading();
        if (openDoorTarget()) focusWhenBack = true;
      }}
      className={`fixed ${hand === 'left' ? 'left-3' : 'right-3'} z-50 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg active:opacity-80`}
    >
      <TutorIcon />
    </button>
  );
}
