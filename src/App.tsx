import { useEffect, useLayoutEffect } from 'react';
import { seedWordsIfFirstOpen } from './data/repositories';
import { About } from './About';
import { ImportScreen } from './ImportScreen';
import type { Random } from './data/quiz';
import { saveLastRoute } from './nav/lastRoute';
import { startReaderAddressSync } from './nav/readerAddress';
import { routeOf, useAddress } from './nav/route';
import { Reader } from './Reader';
import { QuizScreen } from './QuizScreen';
import { UpdateBanner } from './UpdateBanner';
import { WordsScreen } from './WordsScreen';

/** `newRandom` makes the random source of each Quick test round; tests pass a seeded one. */
export function App({ newRandom }: { newRandom?: () => Random } = {}) {
  const address = useAddress();
  const route = routeOf(address);
  // Every move is kept: the address (screen, and the reader's chapter, view, weave and verse) is what a reopen returns to.
  useEffect(() => saveLastRoute(address), [address]);
  // A layout effect: it listens before the Reader's own effects (children's first) tell the bus the verse, view and weave.
  useLayoutEffect(() => startReaderAddressSync(), []);
  // The first open fills the word list from the example list; every later open finds the flag and does nothing.
  useEffect(() => {
    void seedWordsIfFirstOpen();
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
      ) : route === 'about' ? (
        <About />
      ) : (
        <Reader />
      )}
    </div>
  );
}
