import { useEffect, useLayoutEffect } from 'react';
import { seedLevelsIfFirstOpen, seedScheduleIfFirstOpen } from './data/repositories';
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
import { IpaCourse } from './ipa/IpaCourse';
import { LadderGraph } from './LadderGraph';
import { watchForPen } from './handwriting/penWatch';
import { IdeaReturn } from './IdeaReturn';
import { ParadigmsScreen } from './ParadigmsScreen';
import { WhereDidYouGetTo } from './plan/WhereDidYouGetTo';
import { RequestsScreen } from './RequestsScreen';
import { StudyWayScreen } from './StudyWayScreen';
import { AboutYouScreen } from './AboutYouScreen';
import { MemoryScreen } from './MemoryScreen';
import { PlacementScreen } from './PlacementScreen';
import { QuizScreen } from './QuizScreen';
import { ShareScreen } from './share/ShareScreen';
import { ReviewScreen } from './ReviewScreen';
import { SettingsScreen } from './SettingsScreen';
import { BarSlot, LampasSpeakingBar } from './speech/SpeakingBarSlot';
import { startSpeechSettingsSync } from './speech/settingsSync';
import { startUsageLog } from './tips/usageLog';
import { HearAnyWord } from './ui/HearAnyWord';
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
      <UpdateBanner />
      <TutorWaitingBar />
      {/* after a break of a week or more: a short refresher of the solid items most overdue (mw-1vuvq6.6) */}
      <WelcomeBack hidden={route === 'review' || route === 'unlock'} />
      {/* a new licensed reader is welcomed by the tutor (mw-yrmkdf.3) */}
      <Welcome />
      {/* what's new, once after an update (bsv-kit/whats-new) */}
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
      ) : route === 'studyway' ? (
        <StudyWayScreen />
      ) : route === 'aboutyou' ? (
        <AboutYouScreen />
      ) : route === 'memory' ? (
        <MemoryScreen />
      ) : route === 'requests' ? (
        <RequestsScreen />
      ) : route === 'about' ? (
        <About />
      ) : route === 'preface' ? (
        <Preface />
      ) : route === 'essay' ? (
        <Essay />
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
      {/* the round Ask the tutor control of every screen but the Reader and the Share screen (its sheets are talks), which draws its own beside its Talk bar */}
      {route === 'home' || route === 'share' || route === 'unlock' ? null : <AskTutor route={route} />}
      {/* the one bar for anything read aloud (voice-kit/speech): drawn into the highest BarSlot on screen, this one at the shell's foot when no screen has its own */}
      <BarSlot level={0} inset />
      <LampasSpeakingBar />
    </div>
  );
}
