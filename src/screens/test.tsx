import { defineScreen } from '../nav/screen';
import { QuizScreen } from '../QuizScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    test: true;
  }
}

export const testScreen = defineScreen({ name: 'test', render: (props) => <QuizScreen newRandom={props.newRandom} /> });
