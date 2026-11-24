import { defineScreen } from '../nav/screen';
import { AskMoreScreen } from '../settings/AskMoreScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    askmore: true;
  }
}

export const askmoreScreen = defineScreen({ name: 'askmore', render: () => <AskMoreScreen /> });
