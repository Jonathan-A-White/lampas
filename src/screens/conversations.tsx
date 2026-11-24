import { defineScreen } from '../nav/screen';
import { Conversations } from '../Conversations';

declare module '../nav/screen' {
  interface ScreenNames {
    conversations: true;
  }
}

export const conversationsScreen = defineScreen({ name: 'conversations', render: () => <Conversations /> });
