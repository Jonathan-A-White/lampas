import { defineScreen } from '../nav/screen';
import { VerseListsScreen } from '../lists/VerseListsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    lists: true;
  }
}

export const listsScreen = defineScreen({ name: 'lists', render: () => <VerseListsScreen /> });
