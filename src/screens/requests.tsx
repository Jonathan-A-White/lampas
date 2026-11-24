import { defineScreen } from '../nav/screen';
import { RequestsScreen } from '../RequestsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    requests: true;
  }
}

export const requestsScreen = defineScreen({ name: 'requests', render: () => <RequestsScreen /> });
