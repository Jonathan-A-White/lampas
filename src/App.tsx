import { useEffect, useLayoutEffect } from 'react';
import { noteDailyChange } from './data/daily/dailyStore';
import { subscribe } from './events/bus';
import { afterCatalogueUpdate, seedLevelsIfFirstOpen, seedScheduleIfFirstOpen } from './data/repositories';
import { About } from './About';
import { Essay } from './Essay';
import { Preface } from './Preface';
import { AskTutor } from './AskTutor';
import { startAppearanceSync } from './appearance/appearanceSync';
import { DrillScreen } from './DrillScreen';
import { ImportScreen } from './ImportScreen';
import type { Random } from './data/quiz';
import { UnlockPage } from './gate/UnlockPage';
import { saveLastRoute } from './nav/lastRoute';
import { startReaderAddressSync } from './nav/readerAddress';
import { routeOf, useAddress } from './nav/route';
import { Reader } from './Reader';
import { GoalScreen } from './GoalScreen';
import { HardSoundLesson } from './hardSounds/HardSoundLesson';
import { IpaCourse } from './ipa/IpaCourse';
import { MapsHost } from './maps/MapsSheet';
import { LadderGraph } from './LadderGraph';
import { LibraryScreen } from './library/LibraryScreen';
import { VerseListsScreen } from './lists/VerseListsScreen';
import { MemorizeScreen } from './memorize/MemorizeScreen';
import { watchForPen } from './handwriting/penWatch';
import { IdeaReturn } from './IdeaReturn';
import { WordReturn } from './WordReturn';
import { ParadigmsScreen } from './ParadigmsScreen';
import { WhereDidYouGetTo } from './plan/WhereDidYouGetTo';
import { RequestsScreen } from './RequestsScreen';
import { Conversations } from './Conversations';
import { AskMoreScreen } from './settings/AskMoreScreen';
import { StudyWayScreen } from './StudyWayScreen';
import { AboutYouScreen } from './AboutYouScreen';
import { MemoryScreen } from './MemoryScreen';
import { PlacementScreen } from './PlacementScreen';
import { QuizScreen } from './QuizScreen';
import { ShareScreen } from './share/ShareScreen';
import { ReviewScreen } from './ReviewScreen';
import { Today } from './today/Today';
import { SettingsScreen } from './SettingsScreen';
import { BarSlot, LampasSpeakingBar } from './speech/SpeakingBarSlot';
import { LiveRegion } from './ui/LiveRegion';
import { startSpeechSettingsSync } from './speech/settingsSync';
import { startUsageLog } from './tips/usageLog';
import { HearAnyWord } from './ui/HearAnyWord';
import { useAlertsInView } from './ui/alertInView';
import { useTapGuard } from './ui/tapGuard';
import { ShellBars } from './ShellBars';
import { TutorWaitingBar } from './speech/TutorWaitingBar';
import { UpdateBanner } from './UpdateBanner';
import { Welcome } from './Welcome';
import { WelcomeBack } from './WelcomeBack';
import { WhatsNewOnUpdate } from './whatsNew/WhatsNewOnUpdate';
import { WordsScreen } from './WordsScreen';

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
  // The first open after an update that changed the Logos catalogue: his shelf's rows are re-filed and the Logos list he imported is matched again, so the Library card can say 'N new since' (src/data/repositories/library.ts).
  useEffect(() => {
    void afterCatalogueUpdate().catch((error: unknown) => console.error('matching his Logos list again after the update failed', error));
  }, []);
  // A new install starts empty (mw-5r3p30.385): nothing is put in the word list, on the schedule or on the grammar ladder at the first open.
  // These two are the upgrade paths of a phone that already has data: a store from before v10 that has words but no schedule gets them scheduled, and
  // a store from before v11 has the terms he marked I know this make their ideas solid. Each does nothing without his own rows to work from, and
  // neither deletes or rewrites a row.
  useEffect(() => {
    void seedScheduleIfFirstOpen()
      .then(() => seedLevelsIfFirstOpen())
      .catch((error: unknown) => console.error('scheduling the words and the grammar terms he kept failed', error));
  }, []);
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <ShellBars>
        <UpdateBanner />
        <TutorWaitingBar />
        {/* after a break of a week or more: a short refresher of the solid items most overdue (mw-1vuvq6.6) */}
        <WelcomeBack hidden={route === 'review' || route === 'unlock'} />
      </ShellBars>
      {/* a new licensed reader is welcomed by the tutor (mw-yrmkdf.3) */}
      <Welcome />
      {/* what's new, once after an update (pwa-kit/whats-new) */}
      <WhatsNewOnUpdate />
      {/* a long press on any word of prose says it (src/ui/HearAnyWord.tsx) */}
      <HearAnyWord />
      {route === 'words' ? (
        <WordsScreen />
      ) : route === 'import' ? (
        <ImportScreen />
      ) : route === 'test' ? (
        <QuizScreen newRandom={newRandom} />
      ) : route === 'drill' ? (
        <DrillScreen newRandom={newRandom} />
      ) : route === 'review' ? (
        <ReviewScreen newRandom={newRandom} />
      ) : route === 'today' ? (
        <Today />
      ) : route === 'paradigms' ? (
        <ParadigmsScreen />
      ) : route === 'placement' ? (
        <PlacementScreen newRandom={newRandom} />
      ) : route === 'goal' ? (
        <GoalScreen />
      ) : route === 'path' ? (
        <LadderGraph />
      ) : route === 'ipa' ? (
        <IpaCourse />
      ) : route === 'sounds' ? (
        <HardSoundLesson />
      ) : route === 'studyway' ? (
        <StudyWayScreen />
      ) : route === 'aboutyou' ? (
        <AboutYouScreen />
      ) : route === 'memory' ? (
        <MemoryScreen />
      ) : route === 'requests' ? (
        <RequestsScreen />
      ) : route === 'conversations' ? (
        <Conversations />
      ) : route === 'askmore' ? (
        <AskMoreScreen />
      ) : route === 'about' ? (
        <About />
      ) : route === 'preface' ? (
        <Preface />
      ) : route === 'essay' ? (
        <Essay />
      ) : route === 'library' ? (
        <LibraryScreen />
      ) : route === 'lists' ? (
        <VerseListsScreen />
      ) : route === 'memorize' ? (
        <MemorizeScreen />
      ) : route === 'settings' ? (
        <SettingsScreen />
      ) : route === 'share' ? (
        <ShareScreen />
      ) : route === 'unlock' ? (
        <UnlockPage />
      ) : (
        <Reader />
      )}
      {/* back from Audible with a listening session open: 'Where did you get to?' (mw-umv8sp.3); not over the Licence page its 'Needs a licence' opens (mw-umv8sp.4) */}
      <WhereDidYouGetTo hidden={route === 'unlock'} />
      {/* the idea sheet he left for a table comes back on Back (mw-svw421.5) */}
      <IdeaReturn />
      {/* the Maps sheet, opened by a Maps door or the tutor (src/maps/openMaps.ts) */}
      <MapsHost />
      {/* the word sheet he left for the word's table comes back on Back (mw-irpgqi.1) */}
      <WordReturn />
      {/* the round Ask the tutor control of every screen but the Reader and the Share screen (its sheets are talks), which draws its own beside its Talk bar */}
      {route === 'home' || route === 'share' || route === 'unlock' ? null : <AskTutor route={route} />}
      {/* the one bar for anything read aloud (voice-kit/speech): drawn into the highest BarSlot on screen, this one at the shell's foot when no screen has its own */}
      <BarSlot level={0} inset />
      <LampasSpeakingBar />
      {/* the one polite live region: the tutor's answers, a grading result and the reading's marks are said to a screen reader through it (src/ui/live.ts) */}
      <LiveRegion />
    </div>
  );
}
