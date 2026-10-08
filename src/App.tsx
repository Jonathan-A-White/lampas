import { useEffect, useLayoutEffect } from 'react';
import { seedScheduleIfFirstOpen, seedWordsIfFirstOpen } from './data/repositories';
import { About } from './About';
import { startAppearanceSync } from './appearance/appearanceSync';
import { DrillScreen } from './DrillScreen';
import { ImportScreen } from './ImportScreen';
import type { Random } from './data/quiz';
import { saveLastRoute } from './nav/lastRoute';
import { startReaderAddressSync } from './nav/readerAddress';
import { routeOf, useAddress } from './nav/route';
import { Reader } from './Reader';
import { QuizScreen } from './QuizScreen';
import { SettingsScreen } from './SettingsScreen';
import { startSpeechSettingsSync } from './speech/settingsSync';
import { UpdateBanner } from './UpdateBanner';
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
  // The first open fills the word list from the example list; every later open finds the flag and does nothing.
  // Then, once, every solid or learning word goes on the back-off schedule (also the first open after the v10 upgrade).
  useEffect(() => {
    void seedWordsIfFirstOpen()
      .then(() => seedScheduleIfFirstOpen())
      .catch((error: unknown) => console.error('seeding the words and their schedule failed', error));
  }, []);
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <UpdateBanner />
      {route === 'words' ? (
        <WordsScreen />
      ) : route === 'import' ? (
        <ImportScreen />
      ) : route === 'test' ? (
        <QuizScreen newRandom={newRandom} />
      ) : route === 'drill' ? (
        <DrillScreen newRandom={newRandom} />
      ) : route === 'about' ? (
        <About />
      ) : route === 'settings' ? (
        <SettingsScreen />
      ) : (
        <Reader />
      )}
    </div>
  );
}
