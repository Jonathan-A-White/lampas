import { defineScreen } from '../nav/screen';
import { PlacementScreen } from '../PlacementScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    placement: true;
  }
}

export const placementScreen = defineScreen({ name: 'placement', render: (props) => <PlacementScreen newRandom={props.newRandom} /> });
