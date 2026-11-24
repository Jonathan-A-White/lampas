import { defineScreen } from '../nav/screen';
import { UnlockPage } from '../gate/UnlockPage';

declare module '../nav/screen' {
  interface ScreenNames {
    unlock: true;
  }
}

export const unlockScreen = defineScreen({ name: 'unlock', render: () => <UnlockPage /> });
