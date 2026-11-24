import { defineScreen } from '../nav/screen';
import { ShareScreen } from '../share/ShareScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    share: true;
  }
}

export const shareScreen = defineScreen({ name: 'share', render: () => <ShareScreen /> });
