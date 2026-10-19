// src/Welcome.tsx — the welcome of a new licensed reader (mw-yrmkdf.3, docs/ask-tutor.md 'The welcome'). When the licence is first found on a phone that holds nothing of a
// reader yet (src/data/repositories/welcome.ts), the Reader is already in English with the Weave off and no New words chip, and this opens the Talk sheet on a short
// interview: the tutor (the bible-talk grind in welcome mode) asks why he is here, what he wants and one thing about himself, writes his answers to the memory index and,
// for one who is here to learn the Greek, offers the Greek view. Skip ends it; closing the sheet only puts it off to the next open. The sheet stays on screen after the tutor's
// thanks until he closes it. Drawn only inside a LicenceProvider: a screen drawn alone in a test is never welcomed.
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { NO_CHAPTER } from './data/chapter';
import { listTurns } from './data/repositories';
import { skipWelcome, startWelcomeIfFirst, subscribeWelcome, WELCOME_OPENING, WELCOME_REF, welcomeSnapshot } from './data/repositories/welcome';
import { useLicence, useLicenceDetail } from './gate/licenceContext';
import { answerRuns } from './speech/answerRuns';
import { speakTutor } from './speech/tutorVoice';
import type { TalkScope } from './services/talk';
import { TalkSheet } from './Talk';
import { useTalk } from './useTalk';
import { useVoice } from './useVoice';

/** The welcome talk's scope: a talk from a screen named Welcome, which is about no text. */
const WELCOME_SCOPE: TalkScope = { title: 'Welcome', chapter: NO_CHAPTER, verse: null, screen: { name: 'Welcome', facts: [] }, welcome: true };

export function Welcome() {
  const inProvider = useLicenceDetail() !== null;
  const licensed = useLicence() === 'licensed';
  const flag = useSyncExternalStore(subscribeWelcome, welcomeSnapshot);
  const pending = flag.startsWith('pending:');
  const [shown, setShown] = useState(false);
  const live = inProvider && licensed;

  // The first time the licence is found, the phone is looked at once (a reader from before is marked welcomed and nothing changes).
  useEffect(() => {
    if (live) void startWelcomeIfFirst().catch((error: unknown) => console.error('could not start the welcome', error));
  }, [live]);
  // A welcome that is due is shown, each time the flag is written as due; one closed with its flag unchanged stays closed until the app opens again.
  const [shownFor, setShownFor] = useState('');
  if (live && pending && shownFor !== flag) {
    setShownFor(flag);
    setShown(true);
  }

  const turns = useLiveQuery(() => listTurns(WELCOME_REF), []);
  const sayAbout = useRef<(message: string) => void>(() => {});
  const voice = useVoice((message) => sayAbout.current(message));
  const open = useRef(false);
  const { states, say, resume } = useTalk('', 0, (_ref, id, answer) => {
    if (!open.current || voice.listening) return;
    speakTutor(id, answerRuns(answer), () => open.current);
  });
  useEffect(() => {
    open.current = shown;
    sayAbout.current = (message) => say(WELCOME_SCOPE, message);
  });

  // The app says hello for him, once for each time the welcome is due, so the tutor's first question is the first thing he reads.
  const hello = useRef<string | null>(null);
  const state = states[WELCOME_REF];
  useEffect(() => {
    if (!shown || !pending || turns === undefined || state || hello.current === flag) return;
    hello.current = flag;
    if (turns.length === 0) say(WELCOME_SCOPE, WELCOME_OPENING);
  }, [shown, pending, turns, state, flag, say]);

  const close = useCallback(() => {
    voice.abort();
    voice.clearNotice();
    setShown(false);
  }, [voice]);
  const skip = useCallback(() => {
    void skipWelcome().finally(close);
  }, [close]);

  if (!live || !shown) return null;
  return (
    <TalkSheet
      scope={WELCOME_SCOPE}
      talkRef={WELCOME_REF}
      state={state}
      voice={voice}
      onSay={(message, focus, pictures) => say(WELCOME_SCOPE, message, focus, pictures)}
      onResume={() => resume(WELCOME_SCOPE)}
      onHelp={() => {}}
      onAskTerm={() => {}}
      onSkip={pending ? skip : undefined}
      onClose={close}
    />
  );
}
