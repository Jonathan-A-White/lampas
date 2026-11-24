import { defineScreen } from '../nav/screen';
import { ParadigmsScreen } from '../ParadigmsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    paradigms: true;
  }
}

export const paradigmsScreen = defineScreen({ name: 'paradigms', render: () => <ParadigmsScreen /> });
