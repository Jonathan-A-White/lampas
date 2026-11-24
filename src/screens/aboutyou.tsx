import { defineScreen } from '../nav/screen';
import { AboutYouScreen } from '../AboutYouScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    aboutyou: true;
  }
}

export const aboutyouScreen = defineScreen({ name: 'aboutyou', render: () => <AboutYouScreen /> });
