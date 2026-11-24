import { defineScreen } from '../nav/screen';
import { About } from '../About';

declare module '../nav/screen' {
  interface ScreenNames {
    about: true;
  }
}

export const aboutScreen = defineScreen({ name: 'about', render: () => <About /> });
