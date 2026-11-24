import { defineScreen } from '../nav/screen';
import { LibraryScreen } from '../library/LibraryScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    library: true;
  }
}

export const libraryScreen = defineScreen({ name: 'library', render: () => <LibraryScreen /> });
