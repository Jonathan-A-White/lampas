import { useEffect, useLayoutEffect } from 'react';
import { seedLevelsIfFirstOpen, seedScheduleIfFirstOpen, seedWordsIfFirstOpen } from './data/repositories';
import { About } from './About';
import { Essay } from './Essay';
import { Preface } from './Preface';
import { AskTutor } from './AskTutor';
import { startAppearanceSync } from './appearance/appearanceSync';
import { DrillScreen } from './DrillScreen';
import { ImportScreen } from './ImportScreen';
import type { Random } from './data/quiz';
import { saveLastRoute } from './nav/lastRoute';
import { startReaderAddressSync } from './nav/readerAddress';
import { routeOf, useAddress } from './nav/route';
import { Reader } from './Reader';
import { GoalScreen } from './GoalScreen';
import { ParadigmsScreen } from './ParadigmsScreen';
import { StudyWayScreen } from './StudyWayScreen';
import { PlacementScreen } from './PlacementScreen';
import { QuizScreen } from './QuizScreen';
import { ShareScreen } from './share/ShareScreen';
import { ReviewScreen } from './ReviewScreen';
import { SettingsScreen } from './SettingsScreen';
import { BarSlot, LampasSpeakingBar } from './speech/SpeakingBarSlot';
import { startSpeechSettingsSync } from './speech/settingsSync';
import { startUsageLog } from './tips/usageLog';
import { HearAnyWord } from './ui/HearAnyWord';
import { UpdateBanner } from './UpdateBanner';
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
  // What he uses is counted from the bus, a day at a time and without any text, so the tips can tell what he has not met (src/tips/).
  useEffect(() => {
    const stop = startUsageLog();
    return () => void stop();
  }, []);
  // The first open fills the word list from the example list; every later open finds the flag and does nothing.
  // Then, once, every solid or learning word goes on the back-off schedule (also the first open after the v10 upgrade),
  // and, once, the grammar terms he marked I know this make their ideas solid (the first open after the v11 upgrade).
  useEffect(() => {
    void seedWordsIfFirstOpen()
      .then(() => seedScheduleIfFirstOpen())
      .then(() => seedLevelsIfFirstOpen())
      .catch((error: unknown) => console.error('seeding the words and their schedule failed', error));
  }, []);
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <UpdateBanner />
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
      ) : route === 'studyway' ? (
        <StudyWayScreen />
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
      ) : (
        <Reader />
      )}
      {/* the round Ask the tutor control of every screen but the Reader and the Share screen (its sheets are talks), which draws its own beside its Talk bar */}
      {route === 'home' || route === 'share' ? null : <AskTutor route={route} />}
      {/* the one bar for anything read aloud (bsv-kit/speech): drawn into the highest BarSlot on screen, this one at the shell's foot when no screen has its own */}
      <BarSlot level={0} inset />
      <LampasSpeakingBar />
    </div>
  );
}
