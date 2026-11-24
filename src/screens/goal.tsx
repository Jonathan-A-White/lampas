import { defineScreen } from '../nav/screen';
import { GoalScreen } from '../GoalScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    goal: true;
  }
}

export const goalScreen = defineScreen({ name: 'goal', render: () => <GoalScreen /> });
