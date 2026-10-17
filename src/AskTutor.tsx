// src/AskTutor.tsx — the round Ask the tutor control of every full screen (mw-5r3p30.91, docs/ask-tutor.md), and the Talk sheet it opens on the
// screens that have no chapter of their own. The button is the same everywhere: bottom right, above the phone's bar, 56 px, hidden while a
// sheet is open. The sheet is the Talk sheet over a TalkScope with a `screen` (name and facts, src/tutor/screen.ts), kept under 'screen.<name>';
// it opens with the questions fitted to the screen. The Reader draws the same button but opens its own chapter talk (src/Reader.tsx).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NO_CHAPTER } from './data/chapter';
import { useAiAllowed } from './gate/licenceContext';
import { TalkSheet } from './Talk';
import { stopReading } from './speech/readAloud';
import { useBarShown } from './speech/barShown';
import { speakTutor } from './speech/tutorVoice';
import { answerRuns } from './speech/answerRuns';
import { scopeRef, type TalkScope } from './services/talk';
import { fitScreen, SCREEN_NAMES, suggestionsFor, type ScreenContext } from './tutor/screen';
import { useScreenContext } from './tutor/screenContext';
import type { Route } from './nav/route';
import { openedByTutor } from './nav/readerRequest';
import { useSheetOpen } from './ui/sheetBack';
import { useTalk } from './useTalk';
import { useVoice } from './useVoice';
import { takeWaitingPictures } from './talk/outbox';

/** The button's name for a screen reader and the tests; it starts with the words on the control. */
export const ASK_TUTOR_LABEL = 'Ask the tutor about this screen';

/** How far the speaking bar (voice-kit/speech) raises the button while something is read aloud: a button's height, and the bar's padding and border. */
const SPEAKING_BAR_LIFT = 'var(--lp-tap) + 1.25rem';

/** The round button. `lift` raises it above a pinned bar the screen has at its foot (the Reader's Talk bar, Import's Add bar); it also clears the
 * speaking bar while one is up. `away` (the Reader's Immersive reader, src/immersive.ts) slides it out of view: true or false makes the button slide,
 * and while it is true it is not in the tab order or the accessibility tree; undefined (every other screen) is the button as ever. */
export function AskTutorButton({ onClick, lift = '0px', away }: { onClick: () => void; lift?: string; away?: boolean }) {
  const hidden = useSheetOpen();
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
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6" />
        <path d="M12 16.5h.01" />
      </svg>
    </button>
  );
}

/** How far a screen's pinned bottom bar raises the button: Import's Add bar (a summary line over a 48 px button, padded). */
const LIFT: Partial<Record<Route, string>> = { import: 'var(--spacing) * 20 + 3rem' };

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

/** The button and the sheet for the screens but the Reader. */
export function AskTutor({ route }: { route: Route }) {
  // the route the sheet was opened on: it is closed once the screen changes
  const [openOn, setOpenOn] = useState<Route | null>(null);
  const ai = useAiAllowed();
  const speaking = useBarShown();
  useAskRoom(ai && route !== 'home' && route !== 'share' && route !== 'unlock', speaking || LIFT[route] !== undefined);
  const open = openOn === route;
  const reported = useScreenContext();
  const name = route === 'home' || route === 'share' || route === 'unlock' ? undefined : SCREEN_NAMES[route];
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const openRef = useRef<string | null>(null);
  const { states, say } = useTalk('', 0, (ref, id, answer) => {
    if (openRef.current !== ref || voice.listening) return;
    speakTutor(id, answerRuns(answer), () => openRef.current === ref);
  }, {
    // the tutor takes him to a chapter (the answer's `go`) while this screen's sheet is open: the Reader opens there as a new Back step, and Back returns to this screen
    allowed: (ref) => openRef.current === ref,
    open: (place) => openedByTutor(place.book, place.chapter),
  });
  const scope: TalkScope | null = name ? { title: name, chapter: NO_CHAPTER, verse: null, screen: contextOf(name, reported) } : null;
  const ref = scope ? scopeRef('', 0, scope) : null;
  useEffect(() => {
    openRef.current = open ? ref : null;
    sayAbout.current = (message) => {
      if (scope) say(scope, message, undefined, takeWaitingPictures());
    };
  });
  const close = useCallback(() => {
    voice.abort();
    voice.clearNotice();
    setOpenOn(null);
  }, [voice]);
  if (!name || !scope || !ref || !ai) return null;
  return (
    <>
      <AskTutorButton
        lift={LIFT[route]}
        onClick={() => {
          stopReading();
          setOpenOn(route);
        }}
      />
      {open ? (
        <TalkSheet
          scope={scope}
          talkRef={ref}
          state={states[ref]}
          voice={voice}
          suggestions={suggestionsFor(name)}
          onSay={(message, focus, pictures) => say(scope, message, focus, pictures)}
          onHelp={() => {}}
          onAskTerm={() => {}}
          onClose={close}
        />
      ) : null}
    </>
  );
}
