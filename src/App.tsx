import { useEffect, useLayoutEffect } from 'react';
import { noteDailyChange } from './data/daily/dailyStore';
import { subscribe } from './events/bus';
import { startBackgroundWrites } from './data/startupWrites';
import { HandsFreeGate } from './handsFree/HandsFreeGate';
import { AskTutor, FloatingTutor } from './AskTutor';
import { startAppearanceSync } from './appearance/appearanceSync';
import type { Random } from './data/quiz';
import { saveLastRoute } from './nav/lastRoute';
import { startReaderAddressSync } from './nav/readerAddress';
import { routeOf, useAddress } from './nav/route';
import { RENDERERS } from './screens';
import { MapsHost } from './maps/MapsSheet';
import { SermonsHost } from './sermons/SermonsSheet';
import { SermonPlayerHost } from './sermons/SermonPlayer';
import { SermonReaderHost } from './sermons/SermonReader';
import { watchForPen } from './handwriting/penWatch';
import { IdeaReturn } from './IdeaReturn';
import { WordReturn } from './WordReturn';
import { TalkReturn } from './TalkReturn';
import { WhereDidYouGetTo } from './plan/WhereDidYouGetTo';
import { BarSlot, LampasSpeakingBar } from './speech/SpeakingBarSlot';
import { LiveRegion } from './ui/LiveRegion';
import { startSpeechSettingsSync } from './speech/settingsSync';
import { startUsageLog } from './tips/usageLog';
import { HearAnyWord } from './ui/HearAnyWord';
import { useAlertsInView } from './ui/alertInView';
import { useTapGuard } from './ui/tapGuard';
import { OpenInApp } from './OpenInApp';
import { ShellBars } from './ShellBars';
import { TutorWaitingBar } from './speech/TutorWaitingBar';
import { UpdateBanner } from './UpdateBanner';
import { Welcome } from './Welcome';
import { WelcomeBack } from './WelcomeBack';
import { WhatsNewOnUpdate } from './whatsNew/WhatsNewOnUpdate';

/** `newRandom` makes the random source of each Quick test round and Parsing drill; tests pass a seeded one. */
export function App({ newRandom }: { newRandom?: () => Random } = {}) {
  const address = useAddress();
  const route = routeOf(address);
  // Every move is kept: the address (screen, and the reader's chapter, view, weave and verse) is what a reopen returns to.
  useEffect(() => saveLastRoute(address), [address]);
  // A layout effect: it listens before the Reader's own effects (children's first) tell the bus the verse, view and weave.
  useLayoutEffect(() => startReaderAddressSync(), []);
  // After any screen change and any sheet that opens or closes, taps are swallowed for a moment: a double tap's second tap does nothing (src/ui/tapGuard.ts).
  useTapGuard();
  // A failure message that appears in a scrolling list or sheet is brought into view of it (src/ui/alertInView.ts).
  useAlertsInView();
  // The saved Theme and Text size reach the page, and the browser's bar follows the phone's scheme.
  useEffect(() => startAppearanceSync(), []);
  // The saved voices and pronunciation reach the speaker before the first tap on a speaker button.
  useEffect(() => startSpeechSettingsSync(), []);
  // A pen that touches anywhere is kept as 'pen seen', so Handwriting drills on Automatic offers Write it from then on (mw-86e9r1.51).
  useEffect(() => watchForPen(), []);
  // What he uses is counted from the bus, a day at a time and without any text, so the tips can tell what he has not met (src/tips/).
  useEffect(() => {
    const stop = startUsageLog();
    return () => void stop();
  }, []);
  // A change to a Settings > Daily row answers Today's explanation of what it could hold, so it is not shown again (src/data/daily/dailyStore.ts).
  useEffect(() => subscribe('setting-changed', (event) => void noteDailyChange(event.key)), []);
  // The writes App starts by itself at its first open: the Logos list matched again after an update, the stale Bible marks dropped, the upgrade paths of a phone that already has data (src/data/startupWrites.ts).
  useEffect(() => {
    void startBackgroundWrites();
  }, []);
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <ShellBars>
        {/* in a Chrome tab on Android with the app installed: one tap hands this address to the app (mw-5r3p30.1041) */}
        <OpenInApp />
        <UpdateBanner />
        <TutorWaitingBar />
        {/* after a break of a week or more: a short refresher of the solid items most overdue (mw-1vuvq6.6) */}
        <WelcomeBack hidden={route === 'review' || route === 'unlock'} />
        {/* Hands-free: the three-finger tap that turns it On or Off, and, while it is On, the mic mark in the top-right corner (mw-rl10piw.5, .24) */}
        <HandsFreeGate />
      </ShellBars>
      {/* a new licensed reader is welcomed by the tutor (mw-yrmkdf.3) */}
      <Welcome />
      {/* what's new, once after an update (pwa-kit/whats-new) */}
      <WhatsNewOnUpdate />
      {/* a long press on any word of prose says it (src/ui/HearAnyWord.tsx) */}
      <HearAnyWord />
      {/* the screen the address names, drawn by its own file of src/screens/ (src/nav/screen.ts): a new screen edits nothing here */}
      {RENDERERS[route]({ newRandom })}
      {/* back from Audible with a listening session open: 'Where did you get to?' (mw-umv8sp.3); not over the Licence page its 'Needs a licence' opens (mw-umv8sp.4) */}
      <WhereDidYouGetTo hidden={route === 'unlock'} />
      {/* the idea sheet he left for a table comes back on Back (mw-svw421.5) */}
      <IdeaReturn />
      {/* the Maps sheet, opened by a Maps door or the tutor (src/maps/openMaps.ts) */}
      <MapsHost />
      {/* the Sermons sheet, opened by a Sermons door (src/sermons/openSermons.ts) */}
      <SermonsHost />
      <SermonPlayerHost />
      <SermonReaderHost />
      {/* the word sheet he left for the word's table comes back on Back (mw-irpgqi.1) */}
      <WordReturn />
      {/* the Talk sheet he left for a table the tutor linked comes back on Back (mw-5r3p30.990) */}
      <TalkReturn />
      {/* the Talk sheet of every screen but the Reader and the Share screen (its sheets are talks); the floating ? below opens it */}
      {route === 'home' || route === 'share' || route === 'unlock' ? null : <AskTutor route={route} />}
      {/* the one door to the tutor (src/tutor/door.ts): the floating ? at the Hand side, on every screen; none without a licence */}
      <FloatingTutor />
      {/* the one bar for anything read aloud (voice-kit/speech): drawn into the highest BarSlot on screen, this one at the shell's foot when no screen has its own */}
      <BarSlot level={0} inset />
      <LampasSpeakingBar />
      {/* the one polite live region: the tutor's answers, a grading result and the reading's marks are said to a screen reader through it (src/ui/live.ts) */}
      <LiveRegion />
    </div>
  );
}
