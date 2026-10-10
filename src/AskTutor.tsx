// src/AskTutor.tsx — the round Ask the tutor control of every full screen (mw-5r3p30.91, docs/ask-tutor.md), and the Talk sheet it opens on the
// screens that have no chapter of their own. The button is the same everywhere: bottom right, above the phone's bar, 56 px, hidden while a
// sheet is open. The sheet is the Talk sheet over a TalkScope with a `screen` (name and facts, src/tutor/screen.ts), kept under 'screen.<name>';
// it opens with the questions fitted to the screen. The Reader draws the same button but opens its own chapter talk (src/Reader.tsx).
import { useCallback, useEffect, useRef, useState } from 'react';
import { NO_CHAPTER } from './data/chapter';
import { TalkSheet } from './Talk';
import { stopReading } from './speech/readAloud';
import { speakTutor } from './speech/tutorVoice';
import { answerRuns } from './speech/answerRuns';
import { scopeRef, type TalkScope } from './services/talk';
import { fitScreen, SCREEN_NAMES, suggestionsFor, type ScreenContext } from './tutor/screen';
import { useScreenContext } from './tutor/screenContext';
import type { Route } from './nav/route';
import { useSheetOpen } from './ui/sheetBack';
import { useTalk } from './useTalk';
import { useVoice } from './useVoice';

/** The button's name for a screen reader and the tests; it starts with the words on the control. */
export const ASK_TUTOR_LABEL = 'Ask the tutor about this screen';

/** The round button. `lift` raises it above a pinned bar the screen has at its foot (the Reader's Talk bar, Import's Add bar). */
export function AskTutorButton({ onClick, lift = '0px' }: { onClick: () => void; lift?: string }) {
  const hidden = useSheetOpen();
  if (hidden) return null;
  return (
    <button
      type="button"
      data-ask-tutor
      aria-label={ASK_TUTOR_LABEL}
      onClick={onClick}
      style={{ bottom: `calc(var(--lp-bar-inset) + var(--spacing) * 3 + ${lift})` }}
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

/** The Reader's Talk bar: its border, 96 px of bar and 8 px above and below (src/Talk.tsx TalkBar). */
export const TALK_BAR_LIFT = 'var(--spacing) * 28 + 1px';

/** The room the Reader leaves under its reading box, above the Talk bar, for the round button (mw-5r3p30.115): its 56 px, the 12 px gap
 * below it and 4 px of air. The box ends where the button begins, so no line of text is ever behind it. */
export const ASK_BUTTON_ROOM = 'var(--spacing) * 18';

/** The context the sheet sends: the facts the screen reported, if they are the screen's own, else its name alone. */
function contextOf(name: string, reported: ScreenContext | null): ScreenContext {
  return fitScreen(reported?.name === name ? reported : { name, facts: [] });
}

/** The button and the sheet for the screens but the Reader. */
export function AskTutor({ route }: { route: Route }) {
  // the route the sheet was opened on: it is closed once the screen changes
  const [openOn, setOpenOn] = useState<Route | null>(null);
  const open = openOn === route;
  const reported = useScreenContext();
  const name = route === 'home' ? undefined : SCREEN_NAMES[route];
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const openRef = useRef<string | null>(null);
  const { states, say } = useTalk('', 0, (ref, id, answer) => {
    if (openRef.current !== ref || voice.listening) return;
    speakTutor(id, answerRuns(answer), () => openRef.current === ref);
  });
  const scope: TalkScope | null = name ? { title: name, chapter: NO_CHAPTER, verse: null, screen: contextOf(name, reported) } : null;
  const ref = scope ? scopeRef('', 0, scope) : null;
  useEffect(() => {
    openRef.current = open ? ref : null;
    sayAbout.current = (message) => {
      if (scope) say(scope, message);
    };
  });
  const close = useCallback(() => {
    voice.abort();
    voice.clearNotice();
    setOpenOn(null);
  }, [voice]);
  if (!name || !scope || !ref) return null;
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
          onSay={(message, focus) => say(scope, message, focus)}
          onHelp={() => {}}
          onAskTerm={() => {}}
          onClose={close}
        />
      ) : null}
    </>
  );
}
