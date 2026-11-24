import { defineScreen } from '../nav/screen';
import { Today } from '../today/Today';

declare module '../nav/screen' {
  interface ScreenNames {
    today: true;
  }
}

export const todayScreen = defineScreen({ name: 'today', render: () => <Today /> });
