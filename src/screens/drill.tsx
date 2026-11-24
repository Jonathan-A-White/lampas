import { defineScreen } from '../nav/screen';
import { DrillScreen } from '../DrillScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    drill: true;
  }
}

export const drillScreen = defineScreen({ name: 'drill', render: (props) => <DrillScreen newRandom={props.newRandom} /> });
