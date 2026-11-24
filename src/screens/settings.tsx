import { defineScreen } from '../nav/screen';
import { SettingsScreen } from '../SettingsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    settings: true;
  }
}

export const settingsScreen = defineScreen({ name: 'settings', render: () => <SettingsScreen /> });
