import { defineScreen } from '../nav/screen';
import { MemorizeScreen } from '../memorize/MemorizeScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    memorize: true;
  }
}

export const memorizeScreen = defineScreen({ name: 'memorize', render: () => <MemorizeScreen /> });
