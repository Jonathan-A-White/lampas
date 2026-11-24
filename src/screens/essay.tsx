import { defineScreen } from '../nav/screen';
import { Essay } from '../Essay';

declare module '../nav/screen' {
  interface ScreenNames {
    essay: true;
  }
}

export const essayScreen = defineScreen({ name: 'essay', render: () => <Essay /> });
