import { defineScreen } from '../nav/screen';
import { Reader } from '../Reader';

declare module '../nav/screen' {
  interface ScreenNames {
    home: true;
  }
}

export const homeScreen = defineScreen({ name: 'home', render: () => <Reader /> });
