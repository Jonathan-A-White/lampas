import { defineScreen } from '../nav/screen';
import { VariantLessons } from '../lessons/VariantLessons';

declare module '../nav/screen' {
  interface ScreenNames {
    lessons: true;
  }
}

export const lessonsScreen = defineScreen({ name: 'lessons', render: () => <VariantLessons /> });
