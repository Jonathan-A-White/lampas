import { defineScreen } from '../nav/screen';
import { WordsScreen } from '../WordsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    words: true;
  }
}

export const wordsScreen = defineScreen({ name: 'words', render: () => <WordsScreen /> });
