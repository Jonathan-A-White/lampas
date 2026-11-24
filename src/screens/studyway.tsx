import { defineScreen } from '../nav/screen';
import { StudyWayScreen } from '../StudyWayScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    studyway: true;
  }
}

export const studywayScreen = defineScreen({ name: 'studyway', render: () => <StudyWayScreen /> });
