// src/AskTutor.tsx — the round Ask the tutor control of every full screen (mw-5r3p30.91, docs/ask-tutor.md), and the Talk sheet it opens on the
// screens that have no chapter of their own. The button is the same everywhere: bottom right, above the phone's bar, 56 px, hidden while a
// sheet is open. The sheet is the Talk sheet over a TalkScope with a `screen` (name and facts, src/tutor/screen.ts), kept under 'screen.<name>';
// it opens with the questions fitted to the screen. The Reader draws the same button but opens its own chapter talk (src/Reader.tsx).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listTurns } from './data/repositories';
import { NO_CHAPTER } from './data/chapter';
import { useAiAllowed } from './gate/licenceContext';
import { TalkSheet } from './Talk';
import { stopReading } from './speech/readAloud';
import { useBarShown } from './speech/barShown';
import { speakTutor } from './speech/tutorVoice';
import { answerRuns } from './speech/answerRuns';
import { scopeRef, type TalkScope } from './services/talk';
import { fitScreen, SCREEN_NAMES, suggestionsFor, type ScreenContext } from './tutor/screen';
import { askRequestNow, useAskRequest } from './tutor/askNow';
import { useScreenContext } from './tutor/screenContext';
import { libraryOf, useAddress, type Route } from './nav/route';
import { useSheetOpen } from './ui/sheetBack';
import { useTalk } from './useTalk';
import { isHolding } from './talk/holding';
import { openDoorTarget, setDoorMode, useDoorMode, useDoorTarget, useHasDoorTarget, useTalkOpen, useTwoFingerDoor } from './tutor/door';
import { useHand } from './settings/hand';

/** The button's name for a screen reader and the tests; it starts with the words on the control. */
export const ASK_TUTOR_LABEL = 'Ask the tutor about this screen';

/** How far the speaking bar (voice-kit/speech) raises the button while something is read aloud: a button's height, and the bar's padding and border. */
const SPEAKING_BAR_LIFT = 'var(--lp-tap) + 1.25rem';

/** The speech bubble with a ? that is the tutor's mark on both of its buttons. */
function TutorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

/** The round button. `lift` raises it above a pinned bar the screen has at its foot (the Reader's Talk bar, Import's Add bar); it also clears the
 * speaking bar while one is up. `away` (the Reader's Immersive reader, src/immersive.ts) slides it out of view: true or false makes the button slide,
 * and while it is true it is not in the tab order or the accessibility tree; undefined (every other screen) is the button as ever. `inDialog` is the button a
 * full-screen dialog draws itself (DialogAskTutor): the dialog's own sheet does not hide it. */
export function AskTutorButton({ onClick, lift = '0px', away, inDialog }: { onClick: () => void; lift?: string; away?: boolean; inDialog?: boolean }) {
  // a full-screen dialog that draws its own button (the results of a drill) is itself a sheet that is open: it does not hide the button it carries
  const sheetOpen = useSheetOpen();
  const hidden = sheetOpen && !inDialog;
  const speaking = useBarShown();
  const allowed = useAiAllowed();
  if (hidden || !allowed) return null;
  return (
    <button
      type="button"
      data-ask-tutor
      data-slides={away === undefined ? undefined : ''}
      data-away={away ? '' : undefined}
      aria-hidden={away ? true : undefined}
      tabIndex={away ? -1 : undefined}
      aria-label={ASK_TUTOR_LABEL}
      onClick={onClick}
      style={{ bottom: `calc(var(--lp-bar-inset) + var(--spacing) * 3 + ${lift}${speaking ? ` + ${SPEAKING_BAR_LIFT}` : ''})` }}
      className="fixed right-3 z-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg active:opacity-80"
    >
      <TutorIcon />
    </button>
  );
}

/** How far a screen's pinned bottom bar raises the button: Import's Add bar (a summary line over a 48 px button, padded) and the diagram lesson's Back and Next (a 48 px row, 8 px above it and a 1 px border). */
const LIFT: Partial<Record<Route, string>> = { import: 'var(--spacing) * 20 + 3rem', 'diagram-lesson': 'var(--spacing) * 14 + 1px' };

/** Import your library (#/library?import, src/library/ImportLibrary.tsx) pins one 48 px button at its foot, padded: the button rises above it. */
const IMPORT_LIBRARY_LIFT = 'var(--spacing) * 18';

/** How far the screen's pinned bottom bar raises the button: by route, and for the Library by its address (the import page has a bar, the rest of the Library none). */
const liftFor = (route: Route, address: string): string | undefined => (route === 'library' && libraryOf(address).import ? IMPORT_LIBRARY_LIFT : LIFT[route]);

/** The Reader's Talk bar: its border, 96 px of bar (56 in a short window) and 8 px above and below (src/Talk.tsx TalkBar); src/index.css --lp-talk-lift. */
export const TALK_BAR_LIFT = 'var(--lp-talk-lift)';

/** The room the Reader leaves under its reading box, above the Talk bar, for the round button (mw-5r3p30.115): its 56 px, the 12 px gap
 * below it and 4 px of air. The box ends where the button begins, so no line of text is ever behind it. In a short window (a phone held sideways) the
 * room is 0 and the button has a gutter beside the text instead (ASK_BUTTON_GUTTER; mw-5r3p30.194 had cut the room to 42 px, src/index.css --lp-ask-room). */
export const ASK_BUTTON_ROOM = 'var(--lp-ask-room)';

/** The strip the Reader leaves at the right of its reading box for the round button in a short window (a phone held sideways, mw-5r3p30.195): the
 * button sits beside the text, not in a row of its own under it, so the box gets the 42 px back and no line is ever behind the button. 0 upright. */
export const ASK_BUTTON_GUTTER = 'var(--lp-ask-gutter)';

/** The room every screen but the Reader keeps beside or under its scroll box while it shows the round button, so no line, answer or control is ever behind it, at
 * any scroll (mw-5r3p30.279: the Reader's rule of mw-5r3p30.115 for the rest). Upright the box ends above the button: its 56 px, 12 px gap and 4 px of air, and the
 * phone's bar under it, unless a pinned bar or the speaking bar sits there already (the button is lifted above it and the bar carries the inset). In a short window
 * (sideways) the box gives the button a gutter at its right instead, as the Reader does. The button's owner writes them on the root and src/index.css `.screen`
 * reads them: --lp-ask-clear (upright, the bottom margin) with --lp-ask-end (the end padding that margin makes unneeded), --lp-ask-side (sideways, the right margin) with --lp-ask-end-short (the end padding there: the phone's bar only). */
const ROOM = 'calc(var(--spacing) * 18)';

/** Reserves the room for the round button for as long as the owner shows it (sheet open or not, so the screen does not jump). */
function useAskRoom(reserve: boolean, over: boolean) {
  useLayoutEffect(() => {
    if (!reserve) return undefined;
    const root = document.documentElement.style;
    root.setProperty('--lp-ask-clear', over ? ROOM : `calc(var(--lp-bar-inset) + ${ROOM})`);
    root.setProperty('--lp-ask-end', '0px');
    root.setProperty('--lp-ask-side', ROOM);
    root.setProperty('--lp-ask-end-short', 'var(--lp-end-inset)');
    return () => {
      for (const name of ['--lp-ask-clear', '--lp-ask-end', '--lp-ask-side', '--lp-ask-end-short']) root.removeProperty(name);
    };
  }, [reserve, over]);
}

/** The context the sheet sends: the facts the screen reported, if they are the screen's own, else its name alone. */
function contextOf(name: string, reported: ScreenContext | null): ScreenContext {
  return fitScreen(reported?.name === name ? reported : { name, facts: [] });
}

/** The talk of a screen's Ask the tutor: the conversation `scope` names (null when the screen has none), the voice, and what a sheet over it needs. `open` is whether its sheet is on screen
 * (an answer is spoken only then); `onClosed` is what closing the sheet does besides stopping the voice. */
function useScreenTalk(scope: TalkScope | null, open: boolean, onClosed: () => void) {
  const openRef = useRef<string | null>(null);
  const { states, say, resume } = useTalk('', 0, (ref, id, answer) => {
    if (openRef.current !== ref || isHolding()) return;
    speakTutor(id, answerRuns(answer), () => openRef.current === ref);
  }, {
    // the tutor takes him to a chapter or another place (the answer's `go`) while this screen's sheet is open: the place opens as a new Back step, and Back returns to this screen
    allowed: (ref) => openRef.current === ref,
  });
  const ref = scope ? scopeRef('', 0, scope) : null;
  useEffect(() => {
    openRef.current = open ? ref : null;
  });
  return { ref, state: ref ? states[ref] : undefined, say, resume, close: onClosed };
}

/** The button and the sheet for the screens but the Reader. */
export function AskTutor({ route }: { route: Route }) {
  // the route the sheet was opened on: it is closed once the screen changes
  const [openOn, setOpenOn] = useState<Route | null>(null);
  const ai = useAiAllowed();
  const speaking = useBarShown();
  const lift = liftFor(route, useAddress());
  useAskRoom(ai && route !== 'home' && route !== 'share' && route !== 'unlock', speaking || lift !== undefined);
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
      <AskTutorButton lift={lift} onClick={openSheet} />
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
 * The button and the sheet for a full-screen dialog that is no route (the results of a drill, mw-5r3p30.649): the dialog draws this inside itself, so the button and the sheet stand
 * over it (a sheet drawn outside would be under the dialog). `screen` is what the dialog reports, `kept` the key the talk is kept under, one for each drill, so a drill's talk
 * is never the last drill's. Drawn only where a licence allows the tutor; the button sits at the right end of the dialog's foot (FootBar `beside`), above the phone's bar.
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
  // the dialog is on top of its screen: the tutor door asks about the dialog (the results of a drill)
  useDoorTarget(ai && talk.ref ? openSheet : undefined);
  if (!ai || !talk.ref) return null;
  return (
    <>
      {open ? null : <AskTutorButton inDialog onClick={openSheet} />}
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

/**
 * The Tutor door 'Floating ?' (mw-5r3p30.880): a round tutor button at the Hand side's edge, drawn over every screen that has something to ask about, the Verse view and open sheets too (z-50: over the
 * sheets at z-35 and the full-screen dialogs at z-40, under the shell's bars). A tap opens the tutor about the newest target a screen or sheet registered (src/tutor/door.ts). Not drawn while a Talk sheet
 * is open (it has its own composer at the foot), where nothing is registered, or on any door but this one: with no licence the door mode is none and nothing shows. It sits at 17 rem above the phone's bar,
 * a thumb's reach up the edge and clear of the older round button (bottom right, above the Talk bar) that stays until part C2 of mw-5r3p30.843.
 */
export function FloatingTutor() {
  const mode = useDoorMode();
  const hand = useHand();
  const anything = useHasDoorTarget();
  const talking = useTalkOpen();
  if (mode !== 'floating' || !hand || !anything || talking) return null;
  return (
    <button
      type="button"
      data-floating-tutor
      data-hand={hand}
      aria-label={FLOATING_TUTOR_LABEL}
      onClick={() => {
        stopReading();
        openDoorTarget();
      }}
      style={{ bottom: 'calc(var(--lp-bar-inset) + 17rem)' }}
      className={`fixed ${hand === 'left' ? 'left-3' : 'right-3'} z-50 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg active:opacity-80`}
    >
      <TutorIcon />
    </button>
  );
}

/** The tutor door, drawn once by the app (src/App.tsx): keeps the door mode current for code outside React, hears the two-finger tap where that is the door, and draws the floating ? where that is. */
export function TutorDoor() {
  const mode = useDoorMode();
  useLayoutEffect(() => {
    setDoorMode(mode);
    return () => setDoorMode('none');
  }, [mode]);
  useTwoFingerDoor();
  return <FloatingTutor />;
}
