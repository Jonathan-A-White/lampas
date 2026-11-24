import { defineScreen } from '../nav/screen';
import { LadderGraph } from '../LadderGraph';

declare module '../nav/screen' {
  interface ScreenNames {
    path: true;
  }
}

export const pathScreen = defineScreen({ name: 'path', render: () => <LadderGraph /> });
