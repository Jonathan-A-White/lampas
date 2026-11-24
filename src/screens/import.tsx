import { defineScreen } from '../nav/screen';
import { ImportScreen } from '../ImportScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    import: true;
  }
}

export const importScreen = defineScreen({ name: 'import', render: () => <ImportScreen /> });
