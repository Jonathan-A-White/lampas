import { useEffect } from 'react';
import { seedWordsIfFirstOpen } from './data/repositories';
import { ImportScreen } from './ImportScreen';
import type { Random } from './data/quiz';
import { useRoute } from './nav/route';
import { Reader } from './Reader';
import { QuizScreen } from './QuizScreen';
import { UpdateBanner } from './UpdateBanner';
import { WordsScreen } from './WordsScreen';

/** `newRandom` makes the random source of each Quick test round; tests pass a seeded one. */
export function App({ newRandom }: { newRandom?: () => Random } = {}) {
  const route = useRoute();
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
      ) : (
        <Reader />
      )}
    </div>
  );
}
