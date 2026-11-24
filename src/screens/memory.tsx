import { defineScreen } from '../nav/screen';
import { MemoryScreen } from '../MemoryScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    memory: true;
  }
}

export const memoryScreen = defineScreen({ name: 'memory', render: () => <MemoryScreen /> });
