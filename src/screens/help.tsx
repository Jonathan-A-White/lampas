import { defineScreen } from '../nav/screen';
import { HelpScreen } from '../HelpScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    help: true;
  }
}

export const helpScreen = defineScreen({ name: 'help', render: () => <HelpScreen /> });
