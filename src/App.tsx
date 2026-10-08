import { useEffect } from 'react';
import { seedWordsIfFirstOpen } from './data/repositories';
import { Home } from './Home';
import { ImportScreen } from './ImportScreen';
import { useRoute } from './nav/route';
import { UpdateBanner } from './UpdateBanner';
import { WordsScreen } from './WordsScreen';

export function App() {
  const route = useRoute();
  // The first open fills the word list from the example list; every later open finds the flag and does nothing.
  useEffect(() => {
    void seedWordsIfFirstOpen();
  }, []);
  return (
    <div data-shell className="flex h-full min-w-0 flex-col overflow-clip">
      <UpdateBanner />
      {route === 'words' ? <WordsScreen /> : route === 'import' ? <ImportScreen /> : <Home />}
    </div>
  );
}
