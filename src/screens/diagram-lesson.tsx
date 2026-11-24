import { defineScreen } from '../nav/screen';
import { DiagramLesson } from '../diagram/DiagramLesson';

declare module '../nav/screen' {
  interface ScreenNames {
    'diagram-lesson': true;
  }
}

export const diagramLessonScreen = defineScreen({ name: 'diagram-lesson', render: () => <DiagramLesson /> });
