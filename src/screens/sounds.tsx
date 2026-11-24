import { defineScreen } from '../nav/screen';
import { HardSoundLesson } from '../hardSounds/HardSoundLesson';

declare module '../nav/screen' {
  interface ScreenNames {
    sounds: true;
  }
}

export const soundsScreen = defineScreen({ name: 'sounds', render: () => <HardSoundLesson /> });
