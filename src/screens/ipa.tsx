import { defineScreen } from '../nav/screen';
import { IpaCourse } from '../ipa/IpaCourse';

declare module '../nav/screen' {
  interface ScreenNames {
    ipa: true;
  }
}

export const ipaScreen = defineScreen({ name: 'ipa', render: () => <IpaCourse /> });
