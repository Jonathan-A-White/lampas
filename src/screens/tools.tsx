import { defineScreen } from '../nav/screen';
import { ToolsScreen } from '../ToolsScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    tools: true;
  }
}

export const toolsScreen = defineScreen({ name: 'tools', render: () => <ToolsScreen /> });
